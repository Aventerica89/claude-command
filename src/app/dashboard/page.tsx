'use client'

import { SessionGrid } from '@/components/dashboard/session-grid'
import { ApprovalQueue } from '@/components/dashboard/approval-queue'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { NewSessionButton } from '@/components/dashboard/new-session-button'
import { LogoutButton } from '@/components/dashboard/logout-button'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎛️</div>
              <div>
                <h1 className="text-xl font-bold">MC3</h1>
                <p className="text-sm text-gray-400">Multi-Claude Command Center</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NewSessionButton />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <StatsBar />
        <ApprovalQueue />
        <SessionGrid />
      </main>
    </div>
  )
}
