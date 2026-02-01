'use client'

import { trpc } from '@/lib/trpc/client'

interface Session {
  id: string
  name: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  taskType: string | null
  progress: number | null
  startedAt: Date | null
  createdAt: Date
}

const statusConfig = {
  idle: { color: 'bg-gray-500', label: 'Idle', pulse: false },
  running: { color: 'bg-green-500', label: 'Running', pulse: true },
  paused: { color: 'bg-yellow-500', label: 'Paused', pulse: false },
  completed: { color: 'bg-blue-500', label: 'Completed', pulse: false },
  failed: { color: 'bg-red-500', label: 'Failed', pulse: false },
}

export function SessionCard({ session }: { session: Session }) {
  const utils = trpc.useUtils()
  const pauseMutation = trpc.sessions.pause.useMutation({
    onSuccess: () => utils.sessions.list.invalidate(),
  })
  const resumeMutation = trpc.sessions.resume.useMutation({
    onSuccess: () => utils.sessions.list.invalidate(),
  })
  const stopMutation = trpc.sessions.stop.useMutation({
    onSuccess: () => utils.sessions.list.invalidate(),
  })

  const config = statusConfig[session.status]
  const elapsed = session.startedAt
    ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60)
    : 0

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'pulse-glow' : ''}`}
          />
          <span className="font-medium truncate">{session.name}</span>
        </div>
        <span className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
          {config.label}
        </span>
      </div>

      {session.taskType && (
        <div className="text-sm text-gray-400 mb-3">{session.taskType}</div>
      )}

      {session.status === 'running' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{session.progress ?? 0}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${session.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {elapsed > 0 && (
        <div className="text-xs text-gray-500 mb-3">Elapsed: {elapsed}m</div>
      )}

      <div className="flex gap-2">
        {session.status === 'running' && (
          <button
            onClick={() => pauseMutation.mutate({ id: session.id })}
            disabled={pauseMutation.isPending}
            className="flex-1 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 rounded transition-colors disabled:opacity-50"
          >
            Pause
          </button>
        )}
        {session.status === 'paused' && (
          <button
            onClick={() => resumeMutation.mutate({ id: session.id })}
            disabled={resumeMutation.isPending}
            className="flex-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
          >
            Resume
          </button>
        )}
        {(session.status === 'running' || session.status === 'paused') && (
          <button
            onClick={() => stopMutation.mutate({ id: session.id })}
            disabled={stopMutation.isPending}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  )
}
