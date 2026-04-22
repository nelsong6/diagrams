import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Link } from 'react-router-dom'
import PipelineNodeComponent from './PipelineNode'
import { codexQueueNodes } from '../data/codex-queue-nodes'
import { codexQueueEdges } from '../data/codex-queue-edges'

const nodeTypes = {
  pipeline: PipelineNodeComponent,
}

export default function CodexQueueView() {
  const [nodes, , onNodesChange] = useNodesState(codexQueueNodes)
  const [edges, , onEdgesChange] = useEdgesState(codexQueueEdges)

  return (
    <div className="w-screen h-screen bg-[#0f172a]">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <Link
          to="/ci"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          &larr; ci
        </Link>
        <h1 className="text-sm font-bold text-slate-300">Codex Queue Dashboard</h1>
        <span className="rounded-full border border-cyan-700/60 bg-cyan-900/30 px-2 py-0.5 text-[10px] text-cyan-300">
          event wake + pull drain
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 max-w-[360px] rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl shadow-black/30">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Before first test</div>
        <h2 className="mt-1 text-sm font-semibold text-slate-100">What this page is proving</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          The important invariant is that the queue script owns continuation. Codex only handles one
          issue at a time, while the worker keeps pulling the next queued issue until none remain.
        </p>

        <div className="mt-4 grid gap-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Trigger here</div>
            <div className="mt-1 text-xs text-slate-200">From another machine, add <span className="font-mono text-green-300">codex-queue</span> to an issue.</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Watch here</div>
            <div className="mt-1 text-xs text-slate-200">Issue page, Actions run, and <span className="font-mono text-violet-300">worker.log</span>.</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Recovery path</div>
            <div className="mt-1 text-xs text-slate-200">Even if an event is missed, the 30-minute local poll still re-wakes the worker.</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-24 z-10 flex gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: '#f59e0b' }} /> trigger / wake
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: '#38bdf8' }} /> worker control flow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: '#a78bfa' }} /> observable state
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block border-t-2 border-dashed" style={{ borderColor: '#ef4444' }} /> recovery
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 0.85 }}
        minZoom={0.35}
        maxZoom={1.6}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700" />
      </ReactFlow>
    </div>
  )
}
