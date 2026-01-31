import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { sessions, logs, approvals } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export const sessionsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.select().from(sessions).orderBy(desc(sessions.createdAt))
    return result
  }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.id))

      if (!session) {
        throw new Error('Session not found')
      }

      const sessionLogs = await ctx.db
        .select()
        .from(logs)
        .where(eq(logs.sessionId, input.id))
        .orderBy(desc(logs.createdAt))
        .limit(100)

      const pendingApprovals = await ctx.db
        .select()
        .from(approvals)
        .where(eq(approvals.sessionId, input.id))

      return {
        ...session,
        logs: sessionLogs,
        pendingApprovals,
      }
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        taskType: z.string().optional(),
        prompt: z.string().min(1),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.manager.createSession({
        name: input.name,
        taskType: input.taskType,
        prompt: input.prompt,
        config: input.config,
      })

      // Start the session in the background
      ctx.manager.startSession(session.id, input.prompt).catch((error) => {
        console.error(`Session ${session.id} failed:`, error)
      })

      return session
    }),

  pause: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ctx.manager.pauseSession(input.id)
      return { success: true }
    }),

  resume: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ctx.manager.resumeSession(input.id)
      return { success: true }
    }),

  stop: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ctx.manager.stopSession(input.id)
      return { success: true }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Stop if running
      try {
        ctx.manager.stopSession(input.id)
      } catch {
        // Session might not be active
      }

      await ctx.db.delete(sessions).where(eq(sessions.id, input.id))
      return { success: true }
    }),
})
