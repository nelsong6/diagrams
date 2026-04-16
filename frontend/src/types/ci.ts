export interface CIRun {
  repo: string
  repoName: string
  workflow: string
  workflowId: number
  runId: number
  runNumber: number
  status: 'queued' | 'in_progress' | 'completed' | 'waiting'
  conclusion: string | null // success, failure, cancelled, skipped, etc.
  headBranch: string
  headSha: string
  commitMessage: string
  event: string // push, repository_dispatch, workflow_dispatch, etc.
  htmlUrl: string
  startedAt: string
  updatedAt: string
  action: string // requested, in_progress, completed
}

export interface PublishedVersion {
  repo: string
  repoName: string
  version: string
  publishedAt: string
  htmlUrl: string
}

export interface DeployedVersion {
  site: string
  repo: string
  versions: Record<string, string> // e.g. { fztTerminal: "v0.1.16", deployedAt: "..." }
  reportedAt: string
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'
