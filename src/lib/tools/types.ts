import type Anthropic from '@anthropic-ai/sdk'

export interface ToolResult {
  success: boolean
  output: string
  error?: string
}

export interface Tool {
  name: string
  description: string
  inputSchema: Anthropic.Tool['input_schema']
  execute(input: Record<string, unknown>): Promise<ToolResult>
}

export type ToolDefinition = Anthropic.Tool
