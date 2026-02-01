'use client'

import { trpc } from '@/lib/trpc/client'

export function ApprovalQueue() {
  const { data: approvals, isLoading } = trpc.approvals.list.useQuery(undefined, {
    refetchInterval: 3000,
  })
  const utils = trpc.useUtils()

  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      utils.approvals.list.invalidate()
      utils.sessions.list.invalidate()
    },
  })

  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      utils.approvals.list.invalidate()
      utils.sessions.list.invalidate()
    },
  })

  if (isLoading || !approvals || approvals.length === 0) {
    return null
  }

  const riskColors = {
    low: 'bg-green-600',
    medium: 'bg-yellow-600',
    high: 'bg-red-600',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-orange-400">⚠️</span>
        Pending Approvals ({approvals.length})
      </h2>
      <div className="space-y-3">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="bg-gray-800 rounded-lg p-4 border border-orange-500/30"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium">{approval.actionType}</div>
                <div className="text-sm text-gray-400">{approval.toolName}</div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  riskColors[approval.riskLevel as keyof typeof riskColors] || 'bg-gray-600'
                }`}
              >
                {approval.riskLevel} risk
              </span>
            </div>

            {approval.command && (
              <pre className="bg-gray-900 rounded p-3 text-sm text-gray-300 overflow-x-auto mb-3">
                {approval.command}
              </pre>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => approveMutation.mutate({ id: approval.id })}
                disabled={approveMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: approval.id })}
                disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
