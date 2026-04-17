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
  CASCADE_PKG_WIDTH,
  CASCADE_PKG_PADDING,
  CASCADE_TITLE_WIDTH,
} from './CICascadeNode'
import CIPackageNodeComponent from './CIPackageNode'
import type { CIRun, PublishedVersion, DeployedVersion, ConnectionStatus } from '../types/ci'

const nodeTypes = {
  cascade: CICascadeNodeComponent,
  'cascade-pkg': CIPackageNodeComponent,
}

// Post-rotation (90° CCW) layout constants. The cascade flows left → right:
// engine (fzt) on the left, app consumers on the right. Nodes within the same
// layer stack vertically.
const NODE_HEIGHT = 86          // vertical extent of a cascade container
const PKG_HEIGHT = 44            // height of each pkg box (consumed/provided)
const PKG_Y = (NODE_HEIGHT - PKG_HEIGHT) / 2  // vertical center inside container
const LAYER_GAP = 80             // horizontal gap between layers
const NODE_GAP = 40              // vertical gap between stacked nodes in a layer

// Row 3 — middle consumers. Each imports fzt-terminal as a Go module and
// produces its own release artifact. All three are leaves w.r.t. further
// diagrammed Go-module consumers, but they all publish release binaries
// that something (an app, a shell wrapper, a file-dialog hook) consumes
// outside the diagram — so all show a provided release pkg box.
const MIDDLE_CONSUMERS = [
  { id: 'fzt-browser', label: 'fzt-browser', providesRelease: true },
  { id: 'fzt-automate', label: 'fzt-automate', providesRelease: true },
  { id: 'fzt-picker', label: 'fzt-picker', providesRelease: true },
] as const

// Row 4 — app consumers. Download from fzt-browser's release at deploy time.
const APP_CONSUMERS = [
  { id: 'my-homepage', label: 'my-homepage' },
  { id: 'fzt-showcase', label: 'fzt-showcase' },
] as const

// Container width depends on which pkg slots are populated. Layout inside:
//   [pad] [consumed? pad] [title] [pad provided?] [pad]
function containerWidth(hasConsumed: boolean, hasProvided: boolean): number {
  let w = CASCADE_PKG_PADDING + CASCADE_TITLE_WIDTH + CASCADE_PKG_PADDING
  if (hasConsumed) w += CASCADE_PKG_WIDTH + CASCADE_PKG_PADDING
  if (hasProvided) w += CASCADE_PKG_WIDTH + CASCADE_PKG_PADDING
  return w
}

// X position of the consumed pkg inside its container (relative to container's
// top-left). Always the leftmost slot when present.
const CONSUMED_X = CASCADE_PKG_PADDING

// X position of the provided pkg inside its container.
function providedX(hasConsumed: boolean): number {
  const titleStart = hasConsumed
    ? CASCADE_PKG_WIDTH + CASCADE_PKG_PADDING * 2
    : CASCADE_PKG_PADDING
  return titleStart + CASCADE_TITLE_WIDTH + CASCADE_PKG_PADDING
}

function isActive(runs: CIRun[]): boolean {
  return runs.some(r => r.status === 'in_progress' || r.status === 'queued')
}

function edgeStyle(cascading: boolean) {
  return {
    stroke: cascading ? '#f59e0b' : '#334155',
    strokeWidth: cascading ? 2 : 1,
    opacity: cascading ? 1 : 0.4,
  }
}

function buildLayout(
  runsByRepo: Map<string, CIRun[]>,
  versions: Map<string, PublishedVersion>,
  deployed: Map<string, DeployedVersion>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Dimensions by node id (known ahead of positioning)
  const fztW = containerWidth(false, true)
  const feW = containerWidth(true, true)
  const termW = containerWidth(true, true)
  const midW = containerWidth(true, true)   // all middle consumers provide releases
  const appW = containerWidth(true, false)

  // Layers (left → right). Each layer uses a uniform width = max container
  // width in that layer, so the cascade x-grid stays aligned.
  const layerWidths = [fztW, feW, termW, midW, appW]
  const layerCounts = [1, 1, 1, MIDDLE_CONSUMERS.length, APP_CONSUMERS.length]

  // Cumulative x for each layer's left edge
  const layerX: number[] = [0]
  for (let i = 1; i < layerWidths.length; i++) {
    layerX.push(layerX[i - 1] + layerWidths[i - 1] + LAYER_GAP)
  }

  // Vertical canvas height = tallest layer (by count)
  const maxNodesInLayer = Math.max(...layerCounts)
  const canvasHeight = maxNodesInLayer * (NODE_HEIGHT + NODE_GAP) - NODE_GAP
  const canvasCenterY = canvasHeight / 2

  // Helper: compute y for the i-th node in a layer of N nodes, centered
  // vertically on canvasCenterY.
  function layerY(i: number, n: number): number {
    const layerHeight = n * (NODE_HEIGHT + NODE_GAP) - NODE_GAP
    const layerStart = canvasCenterY - layerHeight / 2
    return layerStart + i * (NODE_HEIGHT + NODE_GAP)
  }

  // Helper: produce a cascade container node + its pkg children, and return
  // both for appending to the nodes array.
  function cascadeNode(
    id: string,
    label: string,
    runs: CIRun[],
    hasConsumed: boolean,
    hasProvided: boolean,
    x: number,
    y: number,
  ) {
    const w = containerWidth(hasConsumed, hasProvided)
    nodes.push({
      id,
      type: 'cascade',
      position: { x, y },
      style: { width: w, height: NODE_HEIGHT },
      data: {
        label,
        runs,
        containerWidth: w,
        containerHeight: NODE_HEIGHT,
        hasConsumed,
        hasProvided,
      } satisfies CICascadeData,
    })
  }

  // ── Layer 0: fzt (engine) ───────────────────────────────────────
  const fztRuns = runsByRepo.get('fzt') || []
  const fztActive = isActive(fztRuns)
  const fztX = layerX[0]
  const fztY = layerY(0, 1)
  cascadeNode('fzt', 'fzt', fztRuns, false, true, fztX, fztY)

  nodes.push({
    id: 'pkg-fzt-engine',
    type: 'cascade-pkg',
    parentId: 'fzt',
    extent: 'parent' as const,
    position: { x: providedX(false), y: PKG_Y },
    style: { width: CASCADE_PKG_WIDTH },
    data: { label: 'fzt', deployedVersion: versions.get('fzt')?.version, badge: 'go module' },
  })

  // ── Layer 1: fzt-frontend ───────────────────────────────────────
  const feRuns = runsByRepo.get('fzt-frontend') || []
  const feActive = isActive(feRuns)
  const feDeployed = deployed.get('fzt-frontend')
  const feX = layerX[1]
  const feY = layerY(0, 1)
  cascadeNode('fzt-frontend', 'fzt-frontend', feRuns, true, true, feX, feY)

  nodes.push({
    id: 'pkg-fzt-frontend-in',
    type: 'cascade-pkg',
    parentId: 'fzt-frontend',
    extent: 'parent' as const,
    position: { x: CONSUMED_X, y: PKG_Y },
    style: { width: CASCADE_PKG_WIDTH },
    data: { label: 'fzt', deployedVersion: feDeployed?.versions?.fzt, badge: 'go module' },
  })
  nodes.push({
    id: 'pkg-fzt-frontend-out',
    type: 'cascade-pkg',
    parentId: 'fzt-frontend',
    extent: 'parent' as const,
    position: { x: providedX(true), y: PKG_Y },
    style: { width: CASCADE_PKG_WIDTH },
    data: { label: 'fzt-frontend', deployedVersion: versions.get('fzt-frontend')?.version, badge: 'go module' },
  })

  // Edge: fzt → fzt-frontend
  edges.push({
    id: 'pkg-fzt-engine->pkg-fzt-frontend-in',
    source: 'pkg-fzt-engine',
    sourceHandle: 'right-src',
    target: 'pkg-fzt-frontend-in',
    targetHandle: 'left-tgt',
    type: 'default',
    animated: fztActive || feActive,
    style: edgeStyle(fztActive || feActive),
  })

  // ── Layer 2: fzt-terminal ──────────────────────────────────────
  const termRuns = runsByRepo.get('fzt-terminal') || []
  const termActive = isActive(termRuns)
  const termDeployed = deployed.get('fzt-terminal')
  const termX = layerX[2]
  const termY = layerY(0, 1)
  cascadeNode('fzt-terminal', 'fzt-terminal', termRuns, true, true, termX, termY)

  // Shows fzt-frontend as the direct consumed dep (fzt is transitive via
  // fzt-frontend). Single consumed slot per node to keep layout simple.
  nodes.push({
    id: 'pkg-fzt-terminal-in',
    type: 'cascade-pkg',
    parentId: 'fzt-terminal',
    extent: 'parent' as const,
    position: { x: CONSUMED_X, y: PKG_Y },
    style: { width: CASCADE_PKG_WIDTH },
    data: {
      label: 'fzt-frontend',
      deployedVersion: termDeployed?.versions?.fztFrontend,
      badge: 'go module',
    },
  })
  nodes.push({
    id: 'pkg-fzt-terminal-out',
    type: 'cascade-pkg',
    parentId: 'fzt-terminal',
    extent: 'parent' as const,
    position: { x: providedX(true), y: PKG_Y },
    style: { width: CASCADE_PKG_WIDTH },
    data: { label: 'fzt-terminal', deployedVersion: versions.get('fzt-terminal')?.version, badge: 'go module' },
  })

  // Edge: fzt-frontend → fzt-terminal
  edges.push({
    id: 'pkg-fzt-frontend-out->pkg-fzt-terminal-in',
    source: 'pkg-fzt-frontend-out',
    sourceHandle: 'right-src',
    target: 'pkg-fzt-terminal-in',
    targetHandle: 'left-tgt',
    type: 'default',
    animated: feActive || termActive,
    style: edgeStyle(feActive || termActive),
  })

  // ── Layer 3: middle consumers (stacked vertically) ─────────────
  const midLayerX = layerX[3]
  for (let i = 0; i < MIDDLE_CONSUMERS.length; i++) {
    const { id, label, providesRelease } = MIDDLE_CONSUMERS[i]
    const runs = runsByRepo.get(id) || []
    const active = isActive(runs)
    const dep = deployed.get(id)
    const y = layerY(i, MIDDLE_CONSUMERS.length)
    cascadeNode(id, label, runs, true, providesRelease, midLayerX, y)

    const inId = `pkg-${id}-in`
    nodes.push({
      id: inId,
      type: 'cascade-pkg',
      parentId: id,
      extent: 'parent' as const,
      position: { x: CONSUMED_X, y: PKG_Y },
      style: { width: CASCADE_PKG_WIDTH },
      data: {
        label: 'fzt-terminal',
        deployedVersion: dep?.versions?.fztTerminal,
        badge: 'go module',
      },
    })

    if (providesRelease) {
      nodes.push({
        id: `pkg-${id}-out`,
        type: 'cascade-pkg',
        parentId: id,
        extent: 'parent' as const,
        position: { x: providedX(true), y: PKG_Y },
        style: { width: CASCADE_PKG_WIDTH },
        data: {
          label: id,
          deployedVersion: versions.get(id)?.version,
          badge: 'release',
        },
      })
    }

    // Edge: fzt-terminal → this consumer
    edges.push({
      id: `pkg-fzt-terminal-out->${inId}`,
      source: 'pkg-fzt-terminal-out',
      sourceHandle: 'right-src',
      target: inId,
      targetHandle: 'left-tgt',
      type: 'default',
      animated: termActive || active,
      style: edgeStyle(termActive || active),
    })
  }

  // ── Layer 4: app consumers (stacked vertically) ───────────────
  const browserActive = isActive(runsByRepo.get('fzt-browser') || [])
  const appLayerX = layerX[4]
  for (let i = 0; i < APP_CONSUMERS.length; i++) {
    const { id, label } = APP_CONSUMERS[i]
    const runs = runsByRepo.get(id) || []
    const active = isActive(runs)
    const dep = deployed.get(id)
    const y = layerY(i, APP_CONSUMERS.length)
    cascadeNode(id, label, runs, true, false, appLayerX, y)

    const inId = `pkg-${id}-in`
    nodes.push({
      id: inId,
      type: 'cascade-pkg',
      parentId: id,
      extent: 'parent' as const,
      position: { x: CONSUMED_X, y: PKG_Y },
      style: { width: CASCADE_PKG_WIDTH },
      data: {
        label: 'fzt-browser',
        deployedVersion: dep?.versions?.fztBrowser,
        badge: 'release',
      },
    })

    edges.push({
      id: `pkg-fzt-browser-out->${inId}`,
      source: 'pkg-fzt-browser-out',
      sourceHandle: 'right-src',
      target: inId,
      targetHandle: 'left-tgt',
      type: 'default',
      animated: browserActive || active,
      style: edgeStyle(browserActive || active),
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
