import { useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Link } from 'react-router-dom'
import { useSSE } from '../hooks/useSSE'
import CIPipelineNodeComponent, { type CINodeData } from './CIPipelineNode'
import type { CIRun, ConnectionStatus } from '../types/ci'

const nodeTypes = { ci: CIPipelineNodeComponent }

// All repos that have CI — positions laid out as a grid
const REPOS = [
  'fzt', 'fzt-terminal', 'my-homepage', 'fzt-showcase',
  'api', 'infra-bootstrap', 'infra-diagram', 'kill-me',
  'plant-agent', 'investing', 'house-hunt', 'picker',
  'landing-page', 'emotions-mcp',
]

// Dispatch chain edges (upstream → downstream)
const DISPATCH_CHAINS: [string, string][] = [
  ['fzt-terminal', 'my-homepage'],
  ['fzt-terminal', 'fzt-showcase'],
  ['my-homepage', 'api'],
  ['fzt-terminal', 'api'],
  ['kill-me', 'api'],
  ['plant-agent', 'api'],
  ['investing', 'api'],
  ['house-hunt', 'api'],
  ['infra-diagram', 'api'],
]

const COLS = 4
const COL_W = 300
const ROW_H = 140
const PADDING = 40

function buildNodes(repos: string[], runsByRepo: Map<string, CIRun[]>): Node[] {
  return repos.map((repo, i) => ({
    id: repo,
    type: 'ci',
    position: {
      x: PADDING + (i % COLS) * COL_W,
      y: PADDING + Math.floor(i / COLS) * ROW_H,
    },
    data: {
      label: repo,
      repoName: repo,
      runs: runsByRepo.get(repo) || [],
    } satisfies CINodeData,
  }))
}

function buildEdges(runsByRepo: Map<string, CIRun[]>): Edge[] {
  return DISPATCH_CHAINS.map(([src, dst]) => {
    const srcRuns = runsByRepo.get(src) || []
    const dstRuns = runsByRepo.get(dst) || []
    const srcActive = srcRuns.some(r => r.status === 'in_progress' || r.status === 'queued')
    const dstActive = dstRuns.some(r => r.status === 'in_progress' || r.status === 'queued')
    const cascading = srcActive || dstActive

    return {
      id: `${src}->${dst}`,
      source: src,
      target: dst,
      type: 'smoothstep',
      animated: cascading,
      style: {
        stroke: cascading ? '#f59e0b' : '#334155',
        strokeWidth: cascading ? 2 : 1,
        opacity: cascading ? 1 : 0.4,
      },
    }
  })
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected' ? '#22c55e'
    : status === 'connecting' ? '#f59e0b'
    : '#ef4444'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      title={status}
    />
  )
}

export default function CIDashboardView() {
  const [watching, setWatching] = useState(true)
  const { runs, status } = useSSE(watching)

  // Group runs by repo name
  const runsByRepo = useMemo(() => {
    const map = new Map<string, CIRun[]>()
    for (const run of runs.values()) {
      const name = run.repoName
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(run)
    }
    return map
  }, [runs])

  const nodes = useMemo(() => buildNodes(REPOS, runsByRepo), [runsByRepo])
  const edges = useMemo(() => buildEdges(runsByRepo), [runsByRepo])

  // Watch mode: notify when all active runs complete
  const hasActiveRuns = useMemo(() => {
    for (const run of runs.values()) {
      if (run.status === 'in_progress' || run.status === 'queued') return true
    }
    return false
  }, [runs])

  const prevActive = useMemo(() => ({ current: false }), [])
  useEffect(() => {
    if (prevActive.current && !hasActiveRuns && runs.size > 0) {
      if (Notification.permission === 'granted') {
        new Notification('CI Dashboard', { body: 'All pipelines complete' })
      }
    }
    prevActive.current = hasActiveRuns
  }, [hasActiveRuns, runs.size, prevActive])

  return (
    <div className="w-screen h-screen bg-[#0f172a]">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <Link
          to="/pipelines"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          &larr; pipelines
        </Link>
        <h1 className="text-sm font-bold text-slate-300">CI Dashboard</h1>
        <StatusDot status={status} />
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <button
          onClick={() => {
            if (Notification.permission === 'default') {
              Notification.requestPermission()
            }
          }}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          title="Enable browser notifications"
        >
          notifications
        </button>
        <button
          onClick={() => setWatching(w => !w)}
          className={`text-xs px-3 py-1 rounded-md border transition-colors ${
            watching
              ? 'border-green-700 text-green-400 bg-green-900/20 hover:bg-green-900/40'
              : 'border-slate-700 text-slate-400 bg-slate-800 hover:bg-slate-700'
          }`}
        >
          {watching ? 'watching' : 'paused'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#22c55e' }} /> success
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#38bdf8' }} /> running
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#f59e0b' }} /> queued
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#ef4444' }} /> failed
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700" />
      </ReactFlow>
    </div>
  )
}
