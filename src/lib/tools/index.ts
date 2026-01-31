import type Anthropic from '@anthropic-ai/sdk'
import type { Tool, ToolResult } from './types'
import { bashTool } from './bash'
import { readTool, writeTool, editTool } from './files'
import { globTool, grepTool } from './search'

export type { Tool, ToolResult, ToolDefinition } from './types'

// Registry of all available tools
const toolRegistry: Map<string, Tool> = new Map([
  ['Bash', bashTool],
  ['Read', readTool],
  ['Write', writeTool],
  ['Edit', editTool],
  ['Glob', globTool],
  ['Grep', grepTool],
])

export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name)
}

export function getAllTools(): Tool[] {
  return Array.from(toolRegistry.values())
}

export function getToolDefinitions(): Anthropic.Tool[] {
  return getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const tool = getTool(name)
  if (!tool) {
    return {
      success: false,
      output: `Unknown tool: ${name}`,
      error: `Tool '${name}' not found`,
    }
  }

  try {
    return await tool.execute(input)
  } catch (error) {
    return {
      success: false,
      output: `Tool execution failed: ${(error as Error).message}`,
      error: (error as Error).message,
    }
  }
}
