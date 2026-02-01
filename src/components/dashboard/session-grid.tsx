'use client'

import { trpc } from '@/lib/trpc/client'
import { SessionCard } from './session-card'

export function SessionGrid() {
  const { data: sessions, isLoading } = trpc.sessions.list.useQuery(undefined, {
    refetchInterval: 3000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-gray-400">No sessions yet. Create one to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Sessions ({sessions.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}
