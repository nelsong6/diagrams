import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { CIRun } from '../types/ci'

export interface CICascadeData {
  label: string
  runs: CIRun[]
  containerWidth: number
  containerHeight: number
  hasConsumed: boolean
  hasProvided: boolean
}

// Layout constants — shared with CIFztView for positioning child package nodes.
// After the 90° CCW rotation, package boxes are arranged horizontally inside
// each container: [consumed pkg] [title+status] [provided pkg]. The constants
// represent the per-slot width along the cascade (left-to-right) axis.
export const CASCADE_PKG_WIDTH = 180          // width allocated per pkg slot
export const CASCADE_PKG_PADDING = 16          // horizontal padding around a slot
export const CASCADE_TITLE_WIDTH = 140         // width of the title+status middle slot

function getStatus(runs: CIRun[]) {
  if (runs.length === 0) return 'idle'
  if (runs.some(r => r.status === 'in_progress')) return 'in_progress'
  if (runs.some(r => r.status === 'queued')) return 'queued'
  const latest = runs.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b)
  if (latest.conclusion === 'failure') return 'failure'
  if (latest.conclusion === 'success') return 'success'
  if (latest.conclusion === 'cancelled') return 'cancelled'
  return 'idle'
}

const BORDER_COLORS: Record<string, string> = {
  idle: '#475569',
  queued: '#f59e0b',
  in_progress: '#38bdf8',
  success: '#22c55e',
  failure: '#ef4444',
  cancelled: '#64748b',
}

const BG_COLORS: Record<string, string> = {
  idle: '#0f172a',
  queued: '#1a1500',
  in_progress: '#0c1929',
  success: '#0a1a0f',
  failure: '#1a0f0f',
  cancelled: '#0f172a',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function CICascadeNodeComponent({ data }: NodeProps) {
  const d = data as unknown as CICascadeData
  const status = getStatus(d.runs)
  const borderColor = BORDER_COLORS[status] || BORDER_COLORS.idle
  const bgColor = BG_COLORS[status] || BG_COLORS.idle
  const latestRun = d.runs.length > 0
    ? d.runs.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b)
    : null

  // Title is horizontally centered between consumed (left) and provided (right)
  // package slots. If there's a consumed box, the title's left edge sits
  // beyond the consumed slot; otherwise it starts at the container's left pad.
  const leftOffset = d.hasConsumed ? CASCADE_PKG_WIDTH + CASCADE_PKG_PADDING * 2 : CASCADE_PKG_PADDING

  return (
    <div
      className={`rounded-lg border-2 transition-all duration-500 ${
        status === 'in_progress' ? 'animate-pulse' : ''
      } ${latestRun ? 'cursor-pointer' : ''}`}
      style={{
        width: d.containerWidth,
        height: d.containerHeight,
        borderColor,
        backgroundColor: bgColor,
        boxShadow: status !== 'idle' && status !== 'cancelled' ? `0 0 8px ${borderColor}44` : 'none',
      }}
      onClick={() => latestRun && window.open(latestRun.htmlUrl, '_blank')}
    >
      <div
        className="py-3"
        style={{ marginLeft: leftOffset, width: CASCADE_TITLE_WIDTH }}
      >
        <div className="font-bold text-sm text-slate-200">{d.label}</div>
        {latestRun && (
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              status === 'success' ? 'bg-green-900/40 text-green-400' :
              status === 'failure' ? 'bg-red-900/40 text-red-400' :
              status === 'in_progress' ? 'bg-blue-900/40 text-blue-400' :
              status === 'queued' ? 'bg-amber-900/40 text-amber-400' :
              'bg-slate-800 text-slate-500'
            }`}>
              {latestRun.conclusion || latestRun.status}
            </span>
            <span className="text-[9px] text-slate-600">
              {timeAgo(latestRun.updatedAt)}
            </span>
          </div>
        )}
        {!latestRun && (
          <div className="text-[10px] text-slate-600 mt-1">No recent runs</div>
        )}
      </div>
    </div>
  )
}

export default memo(CICascadeNodeComponent)
