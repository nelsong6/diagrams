import { MarkerType } from '@xyflow/react'

// Shared edge-styling helpers for the /ci/* cascade views. Keeps edge
// appearance consistent across /ci/fzt, /ci/api, /ci/tofu.
//
// Four edge states, ordered worst → best for aggregation:
// - broken  : grammar check failed (version mismatch or unknown). Red.
// - active  : pipeline in flight along this edge. Amber.
// - healthy : producer release version equals consumer pinned version. Green.
// - idle    : no grammar signal (unchecked edge). Slate backdrop.
//
// Node color is the aggregate of its incident edges under the same ordering
// (worst-state-wins), so scanning the graph by color alone reflects the same
// grammar the page-level badge encodes.

export type EdgeHealth = 'idle' | 'active' | 'healthy' | 'broken'

export const IDLE_COLOR = '#64748b'     // slate-500
export const ACTIVE_COLOR = '#f59e0b'   // amber-500
export const HEALTHY_COLOR = '#22c55e'  // green-500
export const BROKEN_COLOR = '#ef4444'   // red-500

const COLORS: Record<EdgeHealth, string> = {
  idle: IDLE_COLOR,
  active: ACTIVE_COLOR,
  healthy: HEALTHY_COLOR,
  broken: BROKEN_COLOR,
}

export function edgeStyle(health: EdgeHealth) {
  return {
    stroke: COLORS[health],
    strokeWidth: health === 'idle' ? 1 : 2,
    opacity: health === 'idle' ? 0.7 : 1,
  }
}

export function edgeMarker(health: EdgeHealth) {
  return {
    type: MarkerType.ArrowClosed,
    color: COLORS[health],
    width: 18,
    height: 18,
  }
}

// Worst-state-wins aggregation: broken > active > healthy > idle. Used to
// color a node from the health of its incident edges.
export function aggregateHealth(healths: Iterable<EdgeHealth>): EdgeHealth {
  let best: EdgeHealth = 'idle'
  for (const h of healths) {
    if (h === 'broken') return 'broken'
    if (h === 'active') best = 'active'
    else if (h === 'healthy' && best !== 'active') best = 'healthy'
  }
  return best
}
