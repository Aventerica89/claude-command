import Anthropic from '@anthropic-ai/sdk'
import { EventEmitter } from 'events'
import type { Session, SessionLog, RiskLevel, LogLevel } from '@/types'
import { getToolDefinitions, executeTool as executeToolFromRegistry } from '@/lib/tools'

export interface WorkerConfig {
  sessionId: string
  name: string
  model?: string
  maxTokens?: number
  systemPrompt?: string
  workingDirectory?: string
}

export interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown>
}

type MessageParam = Anthropic.MessageParam

const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--recursive)\s+[\/~]/i,
  /sudo\s+rm/i,
  /DROP\s+(DATABASE|TABLE)/i,
  /DELETE\s+FROM\s+\w+\s*;?\s*$/i,
  /git\s+push\s+.*--force/i,
  /chmod\s+777/i,
  /curl.*\|\s*(bash|sh)/i,
  />\s*\/etc\//i,
  /mkfs\./i,
  /dd\s+if=/i,
  /:(){ :|:& };:/,  // Fork bomb
  />\s*\/dev\/(sda|hd|nvme)/i,
]

export class ClaudeWorker extends EventEmitter {
  private client: Anthropic
  private conversationHistory: MessageParam[] = []
  private _status: Session['status'] = 'idle'
  private _progress = 0
  private abortController: AbortController | null = null
  private pauseResolver: (() => void) | null = null
  private isPaused = false
  private approvalResolvers: Map<string, (approved: boolean) => void> = new Map()

  readonly id: string
  readonly name: string
  readonly model: string
  readonly maxTokens: number
  readonly systemPrompt: string
  readonly workingDirectory: string

  constructor(config: WorkerConfig) {
    super()
    this.id = config.sessionId
    this.name = config.name
    this.model = config.model || 'claude-3-5-sonnet-20241022'
    this.maxTokens = config.maxTokens || 8192
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt()
    this.workingDirectory = config.workingDirectory || process.cwd()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    this.client = new Anthropic({ apiKey })
  }

  get status(): Session['status'] {
    return this._status
  }

  get progress(): number {
    return this._progress
  }

  private getDefaultSystemPrompt(): string {
    return `You are Claude, an AI assistant running as a worker in the Multi-Claude Command Center (MC3).

You have access to these tools:
- Bash: Execute shell commands (git, npm, system commands, etc.)
- Read: Read file contents
- Write: Write/create files
- Edit: Edit files by replacing strings
- Glob: Find files matching patterns
- Grep: Search file contents with regex

Guidelines:
- Be concise and efficient
- Focus on completing the assigned task
- Use appropriate tools to accomplish goals
- For dangerous operations (rm -rf, system modifications), approval will be requested
- Report progress and important findings

Working directory: ${this.workingDirectory}`
  }

  private log(level: LogLevel, message: string, metadata: Record<string, unknown> = {}): void {
    const log: Omit<SessionLog, 'id' | 'createdAt'> = {
      sessionId: this.id,
      level,
      message,
      metadata,
    }
    this.emit('log', log)
  }

  private setStatus(status: Session['status']): void {
    this._status = status
    this.emit('status', { sessionId: this.id, status })
  }

  private setProgress(progress: number): void {
    this._progress = Math.min(100, Math.max(0, progress))
    this.emit('progress', { sessionId: this.id, progress: this._progress })
  }

  assessRisk(toolUse: ToolUse): RiskLevel {
    const inputStr = JSON.stringify(toolUse.input)

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(inputStr)) {
        return 'high'
      }
    }

    // Bash and Write are medium risk by default
    if (toolUse.name === 'Bash') {
      const command = (toolUse.input.command as string) || ''
      // Read-only commands are low risk
      if (/^(ls|pwd|cat|head|tail|grep|find|which|echo|date|whoami|id|env|git status|git log|git diff|npm list)/.test(command)) {
        return 'low'
      }
      return 'medium'
    }

    if (toolUse.name === 'Write' || toolUse.name === 'Edit') {
      return 'medium'
    }

    return 'low'
  }

  requiresApproval(toolUse: ToolUse): boolean {
    const risk = this.assessRisk(toolUse)
    // Only require approval for high risk (medium can auto-approve for now)
    return risk === 'high'
  }

  async requestApproval(toolUse: ToolUse): Promise<boolean> {
    return new Promise((resolve) => {
      const risk = this.assessRisk(toolUse)
      this.approvalResolvers.set(toolUse.id, resolve)
      this.emit('approval_needed', {
        sessionId: this.id,
        toolUse,
        riskLevel: risk,
      })
    })
  }

  resolveApproval(toolUseId: string, approved: boolean): void {
    const resolver = this.approvalResolvers.get(toolUseId)
    if (resolver) {
      resolver(approved)
      this.approvalResolvers.delete(toolUseId)
    }
  }

  async start(prompt: string): Promise<void> {
    if (this._status === 'running') {
      throw new Error('Worker is already running')
    }

    this.setStatus('running')
    this.setProgress(0)
    this.log('info', `Starting task: ${this.name}`)
    this.abortController = new AbortController()

    this.conversationHistory.push({
      role: 'user',
      content: prompt,
    })

    try {
      await this.runConversationLoop()
      this.setStatus('completed')
      this.setProgress(100)
      this.log('success', 'Task completed successfully')
      this.emit('completed', { sessionId: this.id })
    } catch (error) {
      if (error instanceof Error && error.message === 'AbortError') {
        this.log('warn', 'Task was stopped')
        return
      }
      this.setStatus('failed')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log('error', `Task failed: ${errorMessage}`)
      this.emit('failed', { sessionId: this.id, error: errorMessage })
      throw error
    }
  }

  private async runConversationLoop(): Promise<void> {
    let continueLoop = true
    let iterations = 0
    const maxIterations = 50 // Safety limit

    while (continueLoop && iterations < maxIterations) {
      iterations++

      if (this.abortController?.signal.aborted) {
        throw new Error('AbortError')
      }

      if (this.isPaused) {
        await new Promise<void>((resolve) => {
          this.pauseResolver = resolve
        })
      }

      const tools = getToolDefinitions()

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompt,
        messages: this.conversationHistory,
        tools,
      })

      this.emit('api_usage', {
        sessionId: this.id,
        model: this.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      })

      const toolUses: ToolUse[] = []

      for (const block of response.content) {
        if (block.type === 'text') {
          if (block.text.trim()) {
            this.log('info', block.text)
          }
        } else if (block.type === 'tool_use') {
          toolUses.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          })
        }
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: response.content,
      })

      if (toolUses.length > 0) {
        const toolResults = await this.handleToolUses(toolUses)
        this.conversationHistory.push({
          role: 'user',
          content: toolResults,
        })
        this.setProgress(Math.min(this._progress + 5, 90))
      }

      // Stop if Claude finished (end_turn with no tool use) or if it explicitly stopped
      if (response.stop_reason === 'end_turn' && toolUses.length === 0) {
        continueLoop = false
      }
    }

    if (iterations >= maxIterations) {
      this.log('warn', `Reached maximum iterations (${maxIterations})`)
    }
  }

  private async handleToolUses(toolUses: ToolUse[]): Promise<Anthropic.ToolResultBlockParam[]> {
    const results: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUses) {
      const risk = this.assessRisk(toolUse)
      this.log('info', `Tool: ${toolUse.name} [${risk} risk]`, { input: toolUse.input })

      if (this.requiresApproval(toolUse)) {
        this.setStatus('paused')
        this.log('warn', `Approval required for: ${toolUse.name}`)

        const approved = await this.requestApproval(toolUse)

        if (!approved) {
          this.log('warn', 'Action rejected by user')
          results.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Action was rejected by user. Try a different approach.',
            is_error: true,
          })
          this.setStatus('running')
          continue
        }

        this.setStatus('running')
        this.log('info', 'Action approved, executing...')
      }

      const result = await this.executeTool(toolUse)
      const isError = !result.success

      if (isError) {
        this.log('error', `Tool failed: ${result.error || result.output}`)
      } else {
        // Log truncated output for success
        const outputPreview = result.output.length > 200
          ? result.output.slice(0, 200) + '...'
          : result.output
        this.log('success', `Tool completed: ${outputPreview}`)
      }

      results.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.output,
        is_error: isError,
      })
    }

    return results
  }

  private async executeTool(toolUse: ToolUse): Promise<{ success: boolean; output: string; error?: string }> {
    // Add working directory context for Bash commands
    const input = { ...toolUse.input }
    if (toolUse.name === 'Bash' && !input.workingDirectory) {
      input.workingDirectory = this.workingDirectory
    }

    return executeToolFromRegistry(toolUse.name, input)
  }

  pause(): void {
    if (this._status === 'running') {
      this.isPaused = true
      this.setStatus('paused')
      this.log('info', 'Task paused')
    }
  }

  resume(): void {
    if (this._status === 'paused' && this.pauseResolver) {
      this.isPaused = false
      this.setStatus('running')
      this.pauseResolver()
      this.pauseResolver = null
      this.log('info', 'Task resumed')
    }
  }

  stop(): void {
    this.abortController?.abort()
    this.setStatus('failed')
    this.log('warn', 'Task stopped by user')
    this.emit('stopped', { sessionId: this.id })
  }
}
