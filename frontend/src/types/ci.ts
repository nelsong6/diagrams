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

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'
