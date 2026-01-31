import * as fs from 'fs/promises'
import * as path from 'path'
import type { Tool, ToolResult } from './types'

const MAX_FILE_SIZE = 1024 * 1024 // 1MB
const MAX_LINES = 2000

export const readTool: Tool = {
  name: 'Read',
  description: 'Read a file from the filesystem. Returns file contents with line numbers.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to read',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-indexed)',
      },
      limit: {
        type: 'number',
        description: 'Number of lines to read',
      },
    },
    required: ['file_path'],
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const filePath = input.file_path as string
    const offset = ((input.offset as number) || 1) - 1
    const limit = (input.limit as number) || MAX_LINES

    try {
      const stats = await fs.stat(filePath)
      if (stats.size > MAX_FILE_SIZE) {
        return {
          success: false,
          output: `File too large (${stats.size} bytes). Max: ${MAX_FILE_SIZE} bytes`,
          error: 'File too large',
        }
      }

      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const selectedLines = lines.slice(offset, offset + limit)

      const numberedLines = selectedLines.map((line, i) => {
        const lineNum = (offset + i + 1).toString().padStart(6, ' ')
        return `${lineNum}→${line}`
      })

      return {
        success: true,
        output: numberedLines.join('\n'),
      }
    } catch (error) {
      return {
        success: false,
        output: `Failed to read file: ${(error as Error).message}`,
        error: (error as Error).message,
      }
    }
  },
}

export const writeTool: Tool = {
  name: 'Write',
  description: 'Write content to a file. Creates the file if it does not exist.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to write',
      },
      content: {
        type: 'string',
        description: 'Content to write to the file',
      },
    },
    required: ['file_path', 'content'],
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const filePath = input.file_path as string
    const content = input.content as string

    try {
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')

      return {
        success: true,
        output: `File written successfully: ${filePath}`,
      }
    } catch (error) {
      return {
        success: false,
        output: `Failed to write file: ${(error as Error).message}`,
        error: (error as Error).message,
      }
    }
  },
}

export const editTool: Tool = {
  name: 'Edit',
  description: 'Edit a file by replacing a specific string with new content.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to edit',
      },
      old_string: {
        type: 'string',
        description: 'The exact string to replace',
      },
      new_string: {
        type: 'string',
        description: 'The new string to replace it with',
      },
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurrences (default: false)',
      },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const filePath = input.file_path as string
    const oldString = input.old_string as string
    const newString = input.new_string as string
    const replaceAll = (input.replace_all as boolean) || false

    try {
      const content = await fs.readFile(filePath, 'utf-8')

      if (!content.includes(oldString)) {
        return {
          success: false,
          output: 'old_string not found in file',
          error: 'String not found',
        }
      }

      const occurrences = content.split(oldString).length - 1
      if (occurrences > 1 && !replaceAll) {
        return {
          success: false,
          output: `Found ${occurrences} occurrences. Use replace_all: true or provide more context.`,
          error: 'Multiple occurrences found',
        }
      }

      const newContent = replaceAll
        ? content.split(oldString).join(newString)
        : content.replace(oldString, newString)

      await fs.writeFile(filePath, newContent, 'utf-8')

      return {
        success: true,
        output: `File edited successfully: ${filePath}`,
      }
    } catch (error) {
      return {
        success: false,
        output: `Failed to edit file: ${(error as Error).message}`,
        error: (error as Error).message,
      }
    }
  },
}
