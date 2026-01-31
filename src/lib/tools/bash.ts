import { exec } from 'child_process'
import { promisify } from 'util'
import type { Tool, ToolResult } from './types'

const execAsync = promisify(exec)

const MAX_OUTPUT_LENGTH = 50000
const DEFAULT_TIMEOUT = 120000 // 2 minutes

export const bashTool: Tool = {
  name: 'Bash',
  description: 'Execute a bash command. Use for git, npm, system commands, etc.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (max 600000)',
      },
      workingDirectory: {
        type: 'string',
        description: 'Working directory for the command',
      },
    },
    required: ['command'],
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const command = input.command as string
    const timeout = Math.min((input.timeout as number) || DEFAULT_TIMEOUT, 600000)
    const cwd = (input.workingDirectory as string) || process.cwd()

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env, FORCE_COLOR: '0' },
      })

      let output = stdout || ''
      if (stderr) {
        output += stderr ? `\nSTDERR:\n${stderr}` : ''
      }

      if (output.length > MAX_OUTPUT_LENGTH) {
        output = output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)'
      }

      return {
        success: true,
        output: output || '(no output)',
      }
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; message: string }
      let output = ''
      if (execError.stdout) output += execError.stdout
      if (execError.stderr) output += `\nSTDERR:\n${execError.stderr}`
      output += `\nError: ${execError.message}`

      return {
        success: false,
        output: output.slice(0, MAX_OUTPUT_LENGTH),
        error: execError.message,
      }
    }
  },
}
