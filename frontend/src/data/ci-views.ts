import type { DispatchEdge } from '../components/CIView'

// ── fzt view ────────────────────────────────────────────────
// fzt engine → fzt-terminal → consumers (homepage, showcase, picker)

export const fztRepos = ['fzt', 'fzt-terminal', 'my-homepage', 'fzt-showcase', 'picker']

export const fztEdges: DispatchEdge[] = [
  ['fzt', 'fzt-terminal'],
  ['fzt-terminal', 'my-homepage'],
  ['fzt-terminal', 'fzt-showcase'],
]

// ── api view ────────────────────────────────────────────────
// App repos publish route packages → dispatch → api rebuilds

export const apiRepos = [
  'my-homepage', 'fzt-terminal', 'infra-diagram',
  'kill-me', 'plant-agent', 'investing', 'house-hunt',
  'api',
]

export const apiEdges: DispatchEdge[] = [
  ['my-homepage', 'api'],
  ['fzt-terminal', 'api'],
  ['infra-diagram', 'api'],
  ['kill-me', 'api'],
  ['plant-agent', 'api'],
  ['investing', 'api'],
  ['house-hunt', 'api'],
]

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
  ['fzt', 'fzt-terminal'],
  ['fzt-terminal', 'my-homepage'],
  ['fzt-terminal', 'fzt-showcase'],
  ['fzt-terminal', 'api'],
  ['my-homepage', 'api'],
  ['kill-me', 'api'],
  ['plant-agent', 'api'],
  ['investing', 'api'],
  ['house-hunt', 'api'],
  ['infra-diagram', 'api'],
]
