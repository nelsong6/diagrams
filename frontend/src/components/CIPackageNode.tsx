import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EdgeHealth } from './ciEdgeStyle'

export interface CIPackageData {
  label: string
  deployedVersion?: string
  badge?: string
  // Health of the edge terminating at this package. Tints the border so a
  // package's version reads as aligned (green) or misaligned (red) at a glance.
  health?: EdgeHealth
}

const HEALTH_BORDER: Record<Exclude<EdgeHealth, 'idle'>, string> = {
  active: '#f59e0b',
  healthy: '#22c55e',
  broken: '#ef4444',
}

function CIPackageNodeComponent({ data }: NodeProps) {
  const d = data as unknown as CIPackageData
  const health = d.health ?? 'idle'
  const borderColor = health !== 'idle' ? HEALTH_BORDER[health] : undefined
  return (
    <>
      {/* Handles on all four sides so each view can pick based on its
          cascade direction. /ci/fzt flows left→right (left-tgt / right-src);
          /ci/api stacks top-down (top-tgt / bottom-src). Handles are
          invisible, having extras doesn't affect layout. */}
      <Handle type="target" position={Position.Left} id="left-tgt" className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Right} id="right-src" className="!bg-transparent !border-0" />
      <Handle type="target" position={Position.Top} id="top-tgt" className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Bottom} id="bottom-src" className="!bg-transparent !border-0" />
      <div
        className={`rounded-md px-3 py-2 border bg-[#0f172a] min-w-[140px] ${
          borderColor ? '' : 'border-slate-600'
        }`}
        style={borderColor ? { borderColor } : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-300 font-mono truncate">{d.label}</span>
          {d.badge && (
            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-500 whitespace-nowrap">{d.badge}</span>
          )}
        </div>
        <div className="text-[9px] mt-0.5">
          {d.deployedVersion
            ? <span className="text-cyan-400 font-mono">{d.deployedVersion}</span>
            : <span className="text-slate-600">unknown</span>
          }
        </div>
      </div>
    </>
  )
}

export default memo(CIPackageNodeComponent)
