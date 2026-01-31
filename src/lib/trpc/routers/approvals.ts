import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { approvals } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export const approvalsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(approvals)
      .where(eq(approvals.status, 'pending'))
      .orderBy(desc(approvals.createdAt))
    return result
  }),

  approve: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.manager.approveAction(input.id)
      return { success: true }
    }),

  reject: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.manager.rejectAction(input.id)
      return { success: true }
    }),
})
