import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { PipelineNodeData } from '../data/pipeline-nodes'

const COLORS: Record<PipelineNodeData['category'], { border: string; bg: string; text: string }> = {
  repo: { border: '#64748b', bg: '#0f172a', text: '#e2e8f0' },
  workflow: { border: '#38bdf8', bg: '#1e293b', text: '#e2e8f0' },
  artifact: { border: '#a78bfa', bg: '#1e1b2e', text: '#c4b5fd' },
  issue: { border: '#ef4444', bg: '#2a1015', text: '#fca5a5' },
}

function PipelineNodeComponent({ data }: NodeProps) {
  const d = data as unknown as PipelineNodeData
  const c = COLORS[d.category]

  if (d.category === 'repo') {
    return (
      <>
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
        <div
          className="rounded-md px-4 py-2 border-2 font-bold text-sm"
          style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
        >
          {d.label}
          <div className="text-[10px] font-normal opacity-60 mt-0.5">{d.description}</div>
        </div>
      </>
    )
  }

  if (d.category === 'issue') {
    return (
      <>
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
        <div
          className="rounded-md px-4 py-3 border-2 border-dashed max-w-[280px]"
          style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
        >
          <div className="font-bold text-xs flex items-center gap-1.5">
            <span className="text-red-400">&#9888;</span> {d.label}
          </div>
          <div className="text-[10px] mt-1 leading-snug opacity-80">{d.description}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0" />
      <div
        className="rounded-md px-4 py-2.5 border max-w-[280px] cursor-pointer transition-all duration-200 hover:scale-[1.02]"
        style={{
          backgroundColor: c.bg,
          borderColor: `${c.border}88`,
          boxShadow: `0 0 6px ${c.border}22`,
          color: c.text,
        }}
      >
        <div className="font-medium text-xs">{d.label}</div>
        {d.trigger && (
          <div className="text-[9px] opacity-50 mt-0.5 font-mono">{d.trigger}</div>
        )}
        <div className="text-[10px] mt-1 leading-snug opacity-70">{d.description}</div>
      </div>
    </>
  )
}

export default memo(PipelineNodeComponent)
