import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface CIPackageData {
  label: string
  deployedVersion?: string
}

function CIPackageNodeComponent({ data }: NodeProps) {
  const d = data as unknown as CIPackageData
  return (
    <>
      <Handle type="target" position={Position.Top} id="top-tgt" className="!bg-transparent !border-0" />
      <div className="rounded-md px-3 py-2 border border-slate-600 bg-[#0f172a] min-w-[140px]">
        <div className="text-[10px] text-slate-300 font-mono truncate">{d.label}</div>
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
