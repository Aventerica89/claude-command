import { router } from './trpc'
import { sessionsRouter } from './routers/sessions'
import { approvalsRouter } from './routers/approvals'
import { templatesRouter } from './routers/templates'
import { statsRouter } from './routers/stats'

export const appRouter = router({
  sessions: sessionsRouter,
  approvals: approvalsRouter,
  templates: templatesRouter,
  stats: statsRouter,
})

export type AppRouter = typeof appRouter
