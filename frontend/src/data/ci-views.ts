export interface DispatchEdge {
  source: string
  target: string
}

// ── api container view ──────────────────────────────────────
// Host repos that publish route packages to the shared API

export const apiHostRepos = [
  'my-homepage', 'fzt-terminal', 'infra-diagram',
  'kill-me', 'plant-agent', 'investing', 'house-hunt',
]

export const routePackageMap: Record<string, string> = {
  'my-homepage': 'my-homepage-routes',
  'fzt-terminal': 'fzt-terminal-routes',
  'infra-diagram': 'infra-diagram-routes',
  'kill-me': 'kill-me-routes',
  'plant-agent': 'plant-agent-routes',
  'investing': 'investing-routes',
  'house-hunt': 'house-hunt-routes',
}

// ── tofu view ───────────────────────────────────────────────
// Infrastructure repos with tofu/ directories

export const tofuRepos = [
  'infra-bootstrap', 'api', 'infra-diagram',
  'house-hunt', 'landing-page', 'emotions-mcp',
]

export const tofuEdges: DispatchEdge[] = []

// ── overview (all repos) ────────────────────────────────────

export const overviewRepos = [
  'fzt', 'fzt-terminal', 'my-homepage', 'fzt-showcase',
  'kill-me', 'plant-agent', 'investing', 'house-hunt',
  'infra-diagram', 'api',
  'infra-bootstrap', 'picker', 'landing-page', 'emotions-mcp',
]

export const overviewEdges: DispatchEdge[] = [
  { source: 'fzt', target: 'fzt-terminal' },
  { source: 'fzt-terminal', target: 'my-homepage' },
  { source: 'fzt-terminal', target: 'fzt-showcase' },
  { source: 'fzt-terminal', target: 'api' },
  { source: 'my-homepage', target: 'api' },
  { source: 'kill-me', target: 'api' },
  { source: 'plant-agent', target: 'api' },
  { source: 'investing', target: 'api' },
  { source: 'house-hunt', target: 'api' },
  { source: 'infra-diagram', target: 'api' },
]
