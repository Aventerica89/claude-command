import { execFile } from 'child_process'
import { promisify } from 'util'
import { glob } from 'glob'
import type { Tool, ToolResult } from './types'

const execFileAsync = promisify(execFile)

export const globTool: Tool = {
  name: 'Glob',
  description: 'Find files matching a glob pattern (e.g., "**/*.ts", "src/**/*.tsx")',
  inputSchema: {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files',
      },
      path: {
        type: 'string',
        description: 'Directory to search in (defaults to cwd)',
      },
    },
    required: ['pattern'],
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const pattern = input.pattern as string
    const searchPath = (input.path as string) || process.cwd()

    try {
      const files = await glob(pattern, {
        cwd: searchPath,
        absolute: true,
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      })

      if (files.length === 0) {
        return {
          success: true,
          output: 'No files found',
        }
      }

      return {
        success: true,
        output: files.slice(0, 500).join('\n'),
      }
    } catch (error) {
      return {
        success: false,
        output: `Glob failed: ${(error as Error).message}`,
        error: (error as Error).message,
      }
    }
  },
}

export const grepTool: Tool = {
  name: 'Grep',
  description: 'Search for a pattern in files using ripgrep (rg)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'Regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'File or directory to search in',
      },
      glob: {
        type: 'string',
        description: 'File glob filter (e.g., "*.ts")',
      },
      context: {
        type: 'number',
        description: 'Lines of context around matches',
      },
      case_insensitive: {
        type: 'boolean',
        description: 'Case insensitive search',
      },
    },
    required: ['pattern'],
  },

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const pattern = input.pattern as string
    const searchPath = (input.path as string) || '.'
    const fileGlob = input.glob as string | undefined
    const context = input.context as number | undefined
    const caseInsensitive = input.case_insensitive as boolean | undefined

    const args = ['--color=never', '--line-number']

    if (caseInsensitive) args.push('-i')
    if (context) args.push(`-C${context}`)
    if (fileGlob) args.push(`--glob=${fileGlob}`)

    args.push('--', pattern, searchPath)

    try {
      const { stdout } = await execFileAsync('rg', args, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      })

      const output = stdout.slice(0, 50000)
      return {
        success: true,
        output: output || 'No matches found',
      }
    } catch (error) {
      const execError = error as { code?: number; stdout?: string; message: string }

      // rg returns exit code 1 for no matches
      if (execError.code === 1) {
        return {
          success: true,
          output: 'No matches found',
        }
      }

      return {
        success: false,
        output: `Grep failed: ${execError.message}`,
        error: execError.message,
      }
    }
  },
}
