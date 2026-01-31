import { EventEmitter } from 'events'
import { ClaudeWorker, WorkerConfig } from './worker'
import { db, sessions, logs, approvals, apiUsage } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { Session, CreateSessionInput, RiskLevel } from '@/types'

interface ApprovalRequest {
  sessionId: string
  toolUse: {
    id: string
    name: string
    input: Record<string, unknown>
  }
  riskLevel: RiskLevel
  resolve: (approved: boolean) => void
}

export class ClaudeManager extends EventEmitter {
  private workers: Map<string, ClaudeWorker> = new Map()
  private maxConcurrentSessions: number

  constructor(maxConcurrentSessions = 10) {
    super()
    this.maxConcurrentSessions = maxConcurrentSessions
  }

  async createSession(input: CreateSessionInput): Promise<Session> {
    if (this.workers.size >= this.maxConcurrentSessions) {
      throw new Error(`Maximum concurrent sessions (${this.maxConcurrentSessions}) reached`)
    }

    const [session] = await db
      .insert(sessions)
      .values({
        name: input.name,
        taskType: input.taskType || null,
        config: input.config || {},
        status: 'idle',
      })
      .returning()

    const workerConfig: WorkerConfig = {
      sessionId: session.id,
      name: input.name,
    }

    const worker = new ClaudeWorker(workerConfig)
    this.setupWorkerListeners(worker)
    this.workers.set(session.id, worker)

    return session as Session
  }

  private setupWorkerListeners(worker: ClaudeWorker): void {
    worker.on('log', async (log) => {
      await db.insert(logs).values({
        sessionId: log.sessionId,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
      })
      this.emit('log', log)
    })

    worker.on('status', async ({ sessionId, status }) => {
      await db
        .update(sessions)
        .set({
          status,
          updatedAt: new Date(),
          ...(status === 'running' ? { startedAt: new Date() } : {}),
          ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
        })
        .where(eq(sessions.id, sessionId))
      this.emit('status', { sessionId, status })
    })

    worker.on('progress', async ({ sessionId, progress }) => {
      await db
        .update(sessions)
        .set({ progress, updatedAt: new Date() })
        .where(eq(sessions.id, sessionId))
      this.emit('progress', { sessionId, progress })
    })

    worker.on('approval_needed', async (request: ApprovalRequest) => {
      const [approval] = await db
        .insert(approvals)
        .values({
          sessionId: request.sessionId,
          actionType: 'tool_execution',
          toolName: request.toolUse.name,
          command: JSON.stringify(request.toolUse.input),
          riskLevel: request.riskLevel,
          context: { toolUse: request.toolUse },
          status: 'pending',
        })
        .returning()

      this.emit('approval_needed', {
        ...request,
        approvalId: approval.id,
      })
    })

    worker.on('api_usage', async (usage) => {
      const costPerInputToken = 0.003 / 1000
      const costPerOutputToken = 0.015 / 1000
      const costUsd =
        usage.inputTokens * costPerInputToken +
        usage.outputTokens * costPerOutputToken

      await db.insert(apiUsage).values({
        sessionId: usage.sessionId,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: costUsd.toFixed(4),
      })
      this.emit('api_usage', { ...usage, costUsd })
    })

    worker.on('completed', ({ sessionId }) => {
      this.emit('completed', { sessionId })
    })

    worker.on('failed', ({ sessionId, error }) => {
      this.emit('failed', { sessionId, error })
    })
  }

  async startSession(sessionId: string, prompt: string): Promise<void> {
    const worker = this.workers.get(sessionId)
    if (!worker) {
      throw new Error(`Session ${sessionId} not found`)
    }
    await worker.start(prompt)
  }

  pauseSession(sessionId: string): void {
    const worker = this.workers.get(sessionId)
    if (!worker) {
      throw new Error(`Session ${sessionId} not found`)
    }
    worker.pause()
  }

  resumeSession(sessionId: string): void {
    const worker = this.workers.get(sessionId)
    if (!worker) {
      throw new Error(`Session ${sessionId} not found`)
    }
    worker.resume()
  }

  stopSession(sessionId: string): void {
    const worker = this.workers.get(sessionId)
    if (!worker) {
      throw new Error(`Session ${sessionId} not found`)
    }
    worker.stop()
    this.workers.delete(sessionId)
  }

  async approveAction(approvalId: string): Promise<void> {
    const [approval] = await db
      .update(approvals)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(approvals.id, approvalId))
      .returning()

    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`)
    }

    this.emit('approval_resolved', { approvalId, approved: true })
  }

  async rejectAction(approvalId: string): Promise<void> {
    const [approval] = await db
      .update(approvals)
      .set({ status: 'rejected', rejectedAt: new Date() })
      .where(eq(approvals.id, approvalId))
      .returning()

    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`)
    }

    this.emit('approval_resolved', { approvalId, approved: false })
  }

  async getAllSessions(): Promise<Session[]> {
    const result = await db.select().from(sessions).orderBy(sessions.createdAt)
    return result as Session[]
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
    return (session as Session) || null
  }

  getActiveWorkers(): Map<string, ClaudeWorker> {
    return this.workers
  }

  getWorkerStatus(sessionId: string): Session['status'] | null {
    const worker = this.workers.get(sessionId)
    return worker?.status || null
  }
}

// Singleton instance
let managerInstance: ClaudeManager | null = null

export function getClaudeManager(): ClaudeManager {
  if (!managerInstance) {
    managerInstance = new ClaudeManager()
  }
  return managerInstance
}
