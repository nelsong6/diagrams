import type { Edge } from '@xyflow/react'

const DISPATCH = { stroke: '#f59e0b', strokeWidth: 2.5 }    // amber — cross-repo dispatch
const INTERNAL = { stroke: '#38bdf8', strokeWidth: 1.5 }    // blue — within-repo flow
const ARTIFACT = { stroke: '#a78bfa', strokeWidth: 1.5 }    // purple — produces/consumes artifact
const BROKEN = { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '8 4' } // red dashed — broken dependency

export const pipelineEdges: Edge[] = [
  // ── fzt internal flow ─────────────────────────────────────────
  {
    id: 'fzt-build-to-release',
    source: 'fzt-build',
    target: 'fzt-release',
    style: ARTIFACT,
    label: 'creates release',
  },

  // ── fzt → my-homepage (dispatch) ──────────────────────────────
  {
    id: 'fzt-dispatch-homepage',
    source: 'fzt-build',
    target: 'homepage-deploy',
    style: DISPATCH,
    animated: true,
    label: 'dispatch: fzt-updated',
  },

  // ── fzt release → homepage deploy (asset download) ────────────
  {
    id: 'fzt-release-to-homepage',
    source: 'fzt-release',
    target: 'homepage-deploy',
    style: ARTIFACT,
    label: 'downloads assets',
  },

  // ── api internal flow ─────────────────────────────────────────
  {
    id: 'api-build-to-deploy',
    source: 'api-build',
    target: 'api-deploy',
    style: INTERNAL,
    animated: true,
    label: 'workflow_run',
  },

  // ── fzt → fzt-showcase (dispatch) ─────────────────────────────
  {
    id: 'fzt-dispatch-showcase',
    source: 'fzt-build',
    target: 'showcase-deploy',
    style: DISPATCH,
    animated: true,
    label: 'dispatch: fzt-updated',
  },

  // ── fzt release → showcase deploy (asset download) ────────────
  {
    id: 'fzt-release-to-showcase',
    source: 'fzt-release',
    target: 'showcase-deploy',
    style: ARTIFACT,
    label: 'downloads assets',
  },

  // ── lockfile gap indicator ────────────────────────────────────
  {
    id: 'api-build-to-gap',
    source: 'api-build',
    target: 'lockfile-gap',
    style: BROKEN,
    label: 'never updates lockfile',
  },
]
