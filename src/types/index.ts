export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
export type RiskLevel = 'low' | 'medium' | 'high'
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Session {
  id: string
  name: string
  status: SessionStatus
  taskType: string | null
  progress: number
  conversationId: string | null
  config: Record<string, unknown>
  result: Record<string, unknown> | null
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SessionLog {
  id: string
  sessionId: string
  level: LogLevel
  message: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface Approval {
  id: string
  sessionId: string
  actionType: string
  toolName: string | null
  command: string | null
  riskLevel: RiskLevel
  context: Record<string, unknown>
  status: ApprovalStatus
  approvedBy: string | null
  approvedAt: Date | null
  rejectedAt: Date | null
  createdAt: Date
}

export interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  icon: string | null
  promptTemplate: string
  configSchema: Record<string, unknown>
  requiredKeys: string[]
  usageCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ApiUsage {
  id: string
  sessionId: string | null
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number | null
  requestId: string | null
  createdAt: Date
}

export interface CreateSessionInput {
  name: string
  taskType?: string
  prompt: string
  config?: Record<string, unknown>
}

export interface SessionWithLogs extends Session {
  logs: SessionLog[]
  pendingApprovals: Approval[]
}
