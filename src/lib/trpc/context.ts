import { getClaudeManager } from '@/lib/claude'
import { db } from '@/lib/db'

export function createTRPCContext() {
  return {
    db,
    manager: getClaudeManager(),
  }
}

export type TRPCContext = ReturnType<typeof createTRPCContext>
