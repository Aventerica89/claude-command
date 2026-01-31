import { router, publicProcedure } from '../trpc'
import { sessions, apiUsage, approvals } from '@/lib/db/schema'
import { eq, sql, gte } from 'drizzle-orm'

export const statsRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const [sessionStats] = await ctx.db
      .select({
        total: sql<number>`count(*)`,
        running: sql<number>`count(*) filter (where ${sessions.status} = 'running')`,
        paused: sql<number>`count(*) filter (where ${sessions.status} = 'paused')`,
        completed: sql<number>`count(*) filter (where ${sessions.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${sessions.status} = 'failed')`,
      })
      .from(sessions)

    const [pendingApprovals] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(approvals)
      .where(eq(approvals.status, 'pending'))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayUsage] = await ctx.db
      .select({
        totalTokens: sql<number>`coalesce(sum(${apiUsage.inputTokens} + ${apiUsage.outputTokens}), 0)`,
        totalCost: sql<number>`coalesce(sum(${apiUsage.costUsd}), 0)`,
        requestCount: sql<number>`count(*)`,
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, today))

    return {
      sessions: {
        total: Number(sessionStats?.total) || 0,
        running: Number(sessionStats?.running) || 0,
        paused: Number(sessionStats?.paused) || 0,
        completed: Number(sessionStats?.completed) || 0,
        failed: Number(sessionStats?.failed) || 0,
      },
      pendingApprovals: Number(pendingApprovals?.count) || 0,
      todayUsage: {
        totalTokens: Number(todayUsage?.totalTokens) || 0,
        totalCost: Number(todayUsage?.totalCost) || 0,
        requestCount: Number(todayUsage?.requestCount) || 0,
      },
    }
  }),
})
