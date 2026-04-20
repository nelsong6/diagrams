import type { Node } from '@xyflow/react'

export type PipelineNodeData = {
  label: string
  description: string
  repo?: string
  trigger?: string
  category: 'repo' | 'workflow' | 'artifact' | 'issue'
}

export type PipelineNode = Node<PipelineNodeData>

// Layout — repos as columns, workflows as rows within each column
const COL = { fzt: 0, homepage: 400, api: 900, showcase: 1300 }
const ROW = { header: 0, w1: 100, w2: 220, w3: 340, w4: 460, w5: 580, artifact: 700 }

const wfStyle = { width: 300, height: 80 }

export const pipelineNodes: PipelineNode[] = [
  // ── fzt repo ──────────────────────────────────────────────────
  {
    id: 'fzt-repo',
    type: 'pipeline',
    position: { x: COL.fzt, y: ROW.header },
    data: {
      label: 'fzt',
      description: 'Fuzzy finder CLI + WASM',
      category: 'repo',
    },
  },
  {
    id: 'fzt-build',
    type: 'pipeline',
    position: { x: COL.fzt, y: ROW.w1 },
    ...wfStyle,
    data: {
      label: 'Build',
      description: 'Multi-platform build (Win/Mac/Linux/WASM), create GitHub Release, dispatch fzt-updated',
      trigger: 'push to main',
      category: 'workflow',
      repo: 'fzt',
    },
  },
  {
    id: 'fzt-release',
    type: 'pipeline',
    position: { x: COL.fzt, y: ROW.w2 },
    data: {
      label: 'GitHub Release',
      description: 'Release assets: fzt binaries, fzt.wasm, fzt-terminal.js, fzt-terminal.css, fzt-web.js',
      category: 'artifact',
      repo: 'fzt',
    },
  },

  // ── my-homepage repo ──────────────────────────────────────────
  {
    id: 'homepage-repo',
    type: 'pipeline',
    position: { x: COL.homepage, y: ROW.header },
    data: {
      label: 'my-homepage',
      description: 'Bookmark manager frontend + routes package + infra',
      category: 'repo',
    },
  },
  {
    id: 'homepage-deploy',
    type: 'pipeline',
    position: { x: COL.homepage, y: ROW.w1 },
    data: {
      label: 'Deploy Frontend',
      description: 'Downloads fzt assets from release, generates config, deploys to Azure SWA',
      trigger: 'push to frontend/**, repository_dispatch: fzt-updated',
      category: 'workflow',
      repo: 'my-homepage',
    },
  },
  {
    id: 'homepage-tofu',
    type: 'pipeline',
    position: { x: COL.homepage, y: ROW.w3 },
    data: {
      label: 'Infrastructure',
      description: 'OpenTofu plan + apply for SWA, storage, DNS',
      trigger: 'push to tofu/**',
      category: 'workflow',
      repo: 'my-homepage',
    },
  },
  // ── api repo ──────────────────────────────────────────────────
  {
    id: 'api-repo',
    type: 'pipeline',
    position: { x: COL.api, y: ROW.header },
    data: {
      label: 'api',
      description: 'Shared API gateway (Container App)',
      category: 'repo',
    },
  },
  {
    id: 'api-build',
    type: 'pipeline',
    position: { x: COL.api, y: ROW.w1 },
    data: {
      label: 'Phase 1 — CI Build',
      description: 'npm ci (from lockfile!), run tests, build + push Docker image to GHCR',
      trigger: 'push to main, repository_dispatch: dependency-updated',
      category: 'workflow',
      repo: 'api',
    },
  },
  {
    id: 'api-deploy',
    type: 'pipeline',
    position: { x: COL.api, y: ROW.w2 },
    data: {
      label: 'Deploy',
      description: 'Updates Container App with new image, binds custom domain, verifies health',
      trigger: 'workflow_run: Phase 1 completes',
      category: 'workflow',
      repo: 'api',
    },
  },
  {
    id: 'api-tofu',
    type: 'pipeline',
    position: { x: COL.api, y: ROW.w3 },
    data: {
      label: 'Infrastructure',
      description: 'OpenTofu plan + apply for Container App, identity, DNS',
      trigger: 'push to tofu/**',
      category: 'workflow',
      repo: 'api',
    },
  },

  // ── fzt-showcase repo ─────────────────────────────────────────
  {
    id: 'showcase-repo',
    type: 'pipeline',
    position: { x: COL.showcase, y: ROW.header },
    data: {
      label: 'fzt-showcase',
      description: 'Interactive demo site for fzt',
      category: 'repo',
    },
  },
  {
    id: 'showcase-deploy',
    type: 'pipeline',
    position: { x: COL.showcase, y: ROW.w1 },
    ...wfStyle,
    data: {
      label: 'Deploy Showcase',
      description: 'Downloads fzt assets from release, deploys static site to Azure SWA',
      trigger: 'push to frontend/**, repository_dispatch: fzt-updated',
      category: 'workflow',
      repo: 'fzt-showcase',
    },
  },
  {
    id: 'showcase-tofu',
    type: 'pipeline',
    position: { x: COL.showcase, y: ROW.w2 },
    data: {
      label: 'Infrastructure',
      description: 'OpenTofu plan + apply for SWA, DNS',
      trigger: 'push to tofu/**',
      category: 'workflow',
      repo: 'fzt-showcase',
    },
  },

  // ── The gap — lockfile problem ────────────────────────────────
  {
    id: 'lockfile-gap',
    type: 'pipeline',
    position: { x: COL.api + 30, y: ROW.w4 },
    data: {
      label: 'LOCKFILE GAP',
      description: 'API receives dependency-updated dispatch but npm ci uses the OLD lockfile. The new routes version is published but never installed. Requires manual lockfile update + push.',
      category: 'issue',
    },
  },
]
