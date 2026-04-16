import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useSSE } from '../hooks/useSSE'
import CICascadeNodeComponent, {
  type CICascadeData,
  CASCADE_PKG_HEIGHT,
  CASCADE_PKG_PADDING,
  CASCADE_TITLE_HEIGHT,
} from './CICascadeNode'
import CIPackageNodeComponent from './CIPackageNode'
import type { CIRun, PublishedVersion, DeployedVersion, ConnectionStatus } from '../types/ci'

const nodeTypes = {
  cascade: CICascadeNodeComponent,
  'cascade-pkg': CIPackageNodeComponent,
}

const NODE_WIDTH = 240
const PKG_WIDTH = 200
const NODE_SPACING = 40
const ROW_GAP = 60
const PKG_INSET = (NODE_WIDTH - PKG_WIDTH) / 2

const CONSUMER_REPOS = [
  { id: 'my-homepage', label: 'my-homepage' },
  { id: 'fzt-showcase', label: 'fzt-showcase' },
  { id: 'fzt-picker', label: 'picker' },
] as const

function containerHeight(hasConsumed: boolean, hasProvided: boolean): number {
  let h = CASCADE_TITLE_HEIGHT
  if (hasConsumed) h += CASCADE_PKG_HEIGHT + CASCADE_PKG_PADDING * 2
  if (hasProvided) h += CASCADE_PKG_HEIGHT + CASCADE_PKG_PADDING * 2
  if (!hasProvided) h += CASCADE_PKG_PADDING // extra bottom breathing room
  return h
}

function buildLayout(
  runsByRepo: Map<string, CIRun[]>,
  versions: Map<string, PublishedVersion>,
  deployed: Map<string, DeployedVersion>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const consumerCount = CONSUMER_REPOS.length
  const totalConsumerWidth = consumerCount * NODE_WIDTH + (consumerCount - 1) * NODE_SPACING
  const centerX = (totalConsumerWidth - NODE_WIDTH) / 2

  // ── fzt (top — publishes engine, no consumed) ──
  const fztRuns = runsByRepo.get('fzt') || []
  const fztActive = fztRuns.some(r => r.status === 'in_progress' || r.status === 'queued')
  const fztH = containerHeight(false, true)

  nodes.push({
    id: 'fzt',
    type: 'cascade',
    position: { x: centerX, y: 0 },
    style: { width: NODE_WIDTH, height: fztH },
    data: {
      label: 'fzt',
      runs: fztRuns,
      containerWidth: NODE_WIDTH,
      containerHeight: fztH,
      hasConsumed: false,
      hasProvided: true,
    } satisfies CICascadeData,
  })

  // fzt's provided package: "engine"
  const fztPkgY = CASCADE_TITLE_HEIGHT + CASCADE_PKG_PADDING
  nodes.push({
    id: 'pkg-fzt-engine',
    type: 'cascade-pkg',
    parentId: 'fzt',
    extent: 'parent' as const,
    position: { x: PKG_INSET, y: fztPkgY },
    style: { width: PKG_WIDTH },
    data: { label: 'engine', deployedVersion: versions.get('fzt')?.version },
  })

  // ── fzt-terminal (middle — consumes fzt engine, publishes releases) ──
  const fztTermRuns = runsByRepo.get('fzt-terminal') || []
  const fztTermActive = fztTermRuns.some(r => r.status === 'in_progress' || r.status === 'queued')
  const fztTermDeployed = deployed.get('fzt-terminal')
  const fztTermH = containerHeight(true, true)
  const fztTermY = fztH + ROW_GAP

  nodes.push({
    id: 'fzt-terminal',
    type: 'cascade',
    position: { x: centerX, y: fztTermY },
    style: { width: NODE_WIDTH, height: fztTermH },
    data: {
      label: 'fzt-terminal',
      runs: fztTermRuns,
      containerWidth: NODE_WIDTH,
      containerHeight: fztTermH,
      hasConsumed: true,
      hasProvided: true,
    } satisfies CICascadeData,
  })

  // fzt-terminal consumed package: "fzt"
  nodes.push({
    id: 'pkg-fzt-terminal-in',
    type: 'cascade-pkg',
    parentId: 'fzt-terminal',
    extent: 'parent' as const,
    position: { x: PKG_INSET, y: CASCADE_PKG_PADDING },
    style: { width: PKG_WIDTH },
    data: { label: 'fzt', deployedVersion: fztTermDeployed?.versions?.fzt },
  })

  // fzt-terminal provided package: "release"
  const fztTermProvidedY = CASCADE_PKG_HEIGHT + CASCADE_PKG_PADDING * 2 + CASCADE_TITLE_HEIGHT + CASCADE_PKG_PADDING
  nodes.push({
    id: 'pkg-fzt-terminal-out',
    type: 'cascade-pkg',
    parentId: 'fzt-terminal',
    extent: 'parent' as const,
    position: { x: PKG_INSET, y: fztTermProvidedY },
    style: { width: PKG_WIDTH },
    data: { label: 'release', deployedVersion: versions.get('fzt-terminal')?.version },
  })

  // Edge: fzt engine → fzt-terminal consumed (package to package)
  const fztToTermCascading = fztActive || fztTermActive
  edges.push({
    id: 'pkg-fzt-engine->pkg-fzt-terminal-in',
    source: 'pkg-fzt-engine',
    sourceHandle: 'bottom-src',
    target: 'pkg-fzt-terminal-in',
    targetHandle: 'top-tgt',
    type: 'default',
    animated: fztToTermCascading,
    style: {
      stroke: fztToTermCascading ? '#f59e0b' : '#334155',
      strokeWidth: fztToTermCascading ? 2 : 1,
      opacity: fztToTermCascading ? 1 : 0.4,
    },
  })

  // ── Consumers (bottom row) ──
  const consumerH = containerHeight(true, false)
  const consumerY = fztTermY + fztTermH + ROW_GAP

  for (let i = 0; i < consumerCount; i++) {
    const { id: repoId, label: repoLabel } = CONSUMER_REPOS[i]
    const runs = runsByRepo.get(repoId) || []
    const dep = deployed.get(repoId)
    const consumedVersion = dep?.versions?.fztTerminal
    const containerX = i * (NODE_WIDTH + NODE_SPACING)

    nodes.push({
      id: repoId,
      type: 'cascade',
      position: { x: containerX, y: consumerY },
      style: { width: NODE_WIDTH, height: consumerH },
      data: {
        label: repoLabel,
        runs,
        containerWidth: NODE_WIDTH,
        containerHeight: consumerH,
        hasConsumed: true,
        hasProvided: false,
      } satisfies CICascadeData,
    })

    // Consumed package inside consumer
    const pkgId = `pkg-${repoId}-in`
    nodes.push({
      id: pkgId,
      type: 'cascade-pkg',
      parentId: repoId,
      extent: 'parent' as const,
      position: { x: PKG_INSET, y: CASCADE_PKG_PADDING },
      style: { width: PKG_WIDTH },
      data: { label: 'fzt-terminal', deployedVersion: consumedVersion },
    })

    // Edge: fzt-terminal release → consumer consumed (package to package)
    const consumerActive = runs.some(r => r.status === 'in_progress' || r.status === 'queued')
    const cascading = fztTermActive || consumerActive

    edges.push({
      id: `pkg-fzt-terminal-out->${pkgId}`,
      source: 'pkg-fzt-terminal-out',
      sourceHandle: 'bottom-src',
      target: pkgId,
      targetHandle: 'top-tgt',
      type: 'default',
      animated: cascading,
      style: {
        stroke: cascading ? '#f59e0b' : '#334155',
        strokeWidth: cascading ? 2 : 1,
        opacity: cascading ? 1 : 0.4,
      },
    })
  }

  return { nodes, edges }
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

export default function CIFztView() {
  const title = 'CI — fzt'
  const [watching, setWatching] = useState(true)
  const { runs, versions, deployed, status } = useSSE(watching)

  const runsByRepo = useMemo(() => {
    const map = new Map<string, CIRun[]>()
    for (const run of runs.values()) {
      if (!map.has(run.repoName)) map.set(run.repoName, [])
      map.get(run.repoName)!.push(run)
    }
    return map
  }, [runs])

  const { nodes, edges } = useMemo(
    () => buildLayout(runsByRepo, versions, deployed),
    [runsByRepo, versions, deployed],
  )

  const hasActiveRuns = useMemo(() => {
    for (const run of runs.values()) {
      if (run.status === 'in_progress' || run.status === 'queued') return true
    }
    return false
  }, [runs])

  const prevActive = useRef(false)
  useEffect(() => {
    if (prevActive.current && !hasActiveRuns && runs.size > 0) {
      if (Notification.permission === 'granted') {
        new Notification('CI Dashboard', { body: `${title}: all pipelines complete` })
      }
    }
    prevActive.current = hasActiveRuns
  }, [hasActiveRuns, runs.size])

  return (
    <div className="w-screen h-screen bg-[#0f172a]">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <h1 className="text-sm font-bold text-slate-300">{title}</h1>
        <StatusDot status={status} />
      </div>

      <div className="absolute top-4 right-16 z-10 flex items-center gap-3">
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

      <div className="absolute bottom-4 left-24 z-10 flex gap-3 text-[10px] text-slate-400">
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
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700" />
      </ReactFlow>
    </div>
  )
}
