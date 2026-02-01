'use client'

import { trpc } from '@/lib/trpc/client'

export function StatsBar() {
  const { data: stats, isLoading } = trpc.stats.overview.useQuery(undefined, {
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-700 rounded w-12" />
          </div>
        ))}
      </div>
    )
  }

  const items = [
    { label: 'Running', value: stats?.sessions.running || 0, color: 'text-green-400' },
    { label: 'Paused', value: stats?.sessions.paused || 0, color: 'text-yellow-400' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals || 0, color: 'text-orange-400' },
    { label: 'Today Cost', value: `$${(stats?.todayUsage.totalCost || 0).toFixed(2)}`, color: 'text-blue-400' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">{item.label}</div>
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
