import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, boolean, decimal, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const sessionStatusEnum = pgEnum('session_status', ['idle', 'running', 'paused', 'completed', 'failed'])
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high'])
export const logLevelEnum = pgEnum('log_level', ['debug', 'info', 'success', 'warn', 'error'])
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected'])

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: sessionStatusEnum('status').notNull().default('idle'),
  taskType: varchar('task_type', { length: 100 }),
  progress: integer('progress').default(0),
  conversationId: text('conversation_id'),
  config: jsonb('config').default({}),
  result: jsonb('result'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessionsRelations = relations(sessions, ({ many }) => ({
  logs: many(logs),
  approvals: many(approvals),
  apiUsage: many(apiUsage),
}))

export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  icon: varchar('icon', { length: 10 }),
  promptTemplate: text('prompt_template').notNull(),
  configSchema: jsonb('config_schema').default({}),
  requiredKeys: text('required_keys').array().default([]),
  usageCount: integer('usage_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  toolName: varchar('tool_name', { length: 100 }),
  command: text('command'),
  riskLevel: riskLevelEnum('risk_level'),
  context: jsonb('context').default({}),
  status: approvalStatusEnum('status').default('pending'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const approvalsRelations = relations(approvals, ({ one }) => ({
  session: one(sessions, {
    fields: [approvals.sessionId],
    references: [sessions.id],
  }),
}))

export const logs = pgTable('logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  level: logLevelEnum('level'),
  message: text('message').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const logsRelations = relations(logs, ({ one }) => ({
  session: one(sessions, {
    fields: [logs.sessionId],
    references: [sessions.id],
  }),
}))

export const apiUsage = pgTable('api_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).default('anthropic'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costUsd: decimal('cost_usd', { precision: 10, scale: 4 }),
  requestId: text('request_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  session: one(sessions, {
    fields: [apiUsage.sessionId],
    references: [sessions.id],
  }),
}))

export const systemConfig = pgTable('system_config', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
