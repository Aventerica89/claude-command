import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { templates } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export const templatesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(templates)
      .where(eq(templates.isActive, true))
      .orderBy(desc(templates.usageCount))
    return result
  }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(templates)
        .where(eq(templates.id, input.id))
      return template || null
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().optional(),
        icon: z.string().max(10).optional(),
        promptTemplate: z.string().min(1),
        configSchema: z.record(z.unknown()).optional(),
        requiredKeys: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .insert(templates)
        .values({
          name: input.name,
          description: input.description,
          category: input.category,
          icon: input.icon,
          promptTemplate: input.promptTemplate,
          configSchema: input.configSchema || {},
          requiredKeys: input.requiredKeys || [],
        })
        .returning()
      return template
    }),

  incrementUsage: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(templates)
        .where(eq(templates.id, input.id))

      if (template) {
        await ctx.db
          .update(templates)
          .set({ usageCount: (template.usageCount || 0) + 1 })
          .where(eq(templates.id, input.id))
      }
      return { success: true }
    }),
})
