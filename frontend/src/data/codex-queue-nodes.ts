import type { Node } from '@xyflow/react'
import type { PipelineNodeData } from './pipeline-nodes'

export type CodexQueueNode = Node<PipelineNodeData>

const COL = {
  trigger: 0,
  github: 360,
  worker: 760,
  exec: 1140,
  observe: 1520,
}

const ROW = {
  header: 0,
  r1: 110,
  r2: 250,
  r3: 390,
  r4: 530,
  note: 690,
}

const wfStyle = { width: 280, height: 84 }

export const codexQueueNodes: CodexQueueNode[] = [
  {
    id: 'trigger-issue',
    type: 'pipeline',
    position: { x: COL.trigger, y: ROW.r1 },
    ...wfStyle,
    data: {
      label: 'Issue gets queued',
      description: 'From another computer, add codex-queue to an issue or open one that already carries the queue label.',
      trigger: 'opened / reopened / labeled',
      category: 'workflow',
    },
  },
  {
    id: 'trigger-manual',
    type: 'pipeline',
    position: { x: COL.trigger, y: ROW.r2 },
    ...wfStyle,
    data: {
      label: 'Manual wake',
      description: 'workflow_dispatch exists as an escape hatch if you want to poke the queue worker on demand.',
      trigger: 'workflow_dispatch',
      category: 'workflow',
    },
  },
  {
    id: 'trigger-fallback',
    type: 'pipeline',
    position: { x: COL.trigger, y: ROW.r3 },
    ...wfStyle,
    data: {
      label: 'Fallback wake',
      description: 'A local Windows Scheduled Task runs every 30 minutes so the queue still drains if an event is missed.',
      trigger: 'PT30M recovery poll',
      category: 'workflow',
    },
  },
  {
    id: 'github-queue-label',
    type: 'pipeline',
    position: { x: COL.github, y: ROW.r1 },
    ...wfStyle,
    data: {
      label: 'GitHub issue queue',
      description: 'codex-queue is the durable queue signal. This is the source of truth for whether work is waiting.',
      category: 'repo',
    },
  },
  {
    id: 'github-wakeup',
    type: 'pipeline',
    position: { x: COL.github, y: ROW.r2 },
    ...wfStyle,
    data: {
      label: 'Codex Queue Wakeup',
      description: 'Issue events wake the self-hosted runner immediately once the workflow exists on main.',
      trigger: '.github/workflows/codex-queue-wakeup.yml',
      category: 'workflow',
    },
  },
  {
    id: 'worker-runner',
    type: 'pipeline',
    position: { x: COL.worker, y: ROW.r1 },
    data: {
      label: 'sts2-side-a',
      description: 'This side machine runs the self-hosted GitHub Actions runner and picks up wakeup jobs.',
      category: 'repo',
    },
  },
  {
    id: 'worker-script',
    type: 'pipeline',
    position: { x: COL.worker, y: ROW.r2 },
    ...wfStyle,
    data: {
      label: 'Run-IssueQueueWorker.ps1',
      description: 'Owns the outer loop: claim one issue, run Codex, update labels/comments, repeat until the queue is empty.',
      trigger: 'outer loop owner',
      category: 'workflow',
    },
  },
  {
    id: 'worker-lock',
    type: 'pipeline',
    position: { x: COL.worker, y: ROW.r3 },
    ...wfStyle,
    data: {
      label: 'worker.lock',
      description: 'Prevents two queue runs from draining the same queue at once if a webhook and fallback wake happen together.',
      trigger: '%LOCALAPPDATA%/CodexIssueQueue',
      category: 'artifact',
    },
  },
  {
    id: 'exec-claim',
    type: 'pipeline',
    position: { x: COL.exec, y: ROW.r1 },
    ...wfStyle,
    data: {
      label: 'Claim one issue',
      description: 'Add codex-active, post a claim comment, and build the issue packet for exactly one work item.',
      trigger: 'one issue at a time',
      category: 'workflow',
    },
  },
  {
    id: 'exec-codex',
    type: 'pipeline',
    position: { x: COL.exec, y: ROW.r2 },
    ...wfStyle,
    data: {
      label: 'Headless Codex exec',
      description: 'Run a local copied codex.exe against the repo, with a structured JSON result contract for the issue worker.',
      trigger: 'codex exec --output-schema',
      category: 'workflow',
    },
  },
  {
    id: 'exec-outcome',
    type: 'pipeline',
    position: { x: COL.exec, y: ROW.r3 },
    ...wfStyle,
    data: {
      label: 'Push result back to GitHub',
      description: 'Comment on the issue, move labels to codex-complete or codex-blocked, and then continue to the next queued issue.',
      trigger: 'completed / blocked / needs_human',
      category: 'workflow',
    },
  },
  {
    id: 'observe-surfaces',
    type: 'pipeline',
    position: { x: COL.observe, y: ROW.r1 },
    ...wfStyle,
    data: {
      label: 'Watch surfaces',
      description: 'Issue page, Actions run, runner busy state, and worker.log all tell the same story from different angles.',
      category: 'artifact',
    },
  },
  {
    id: 'observe-log',
    type: 'pipeline',
    position: { x: COL.observe, y: ROW.r2 },
    ...wfStyle,
    data: {
      label: 'worker.log',
      description: 'Local file log under %LOCALAPPDATA% shows every wake, claim, and queue-empty exit for the side machine.',
      trigger: '%LOCALAPPDATA%/CodexIssueQueue/.../worker.log',
      category: 'artifact',
    },
  },
  {
    id: 'observe-drain',
    type: 'pipeline',
    position: { x: COL.observe, y: ROW.r3 },
    ...wfStyle,
    data: {
      label: 'Queue drains until empty',
      description: 'The model does not own the queue. The script keeps asking for the next issue until there are no queued items left.',
      trigger: 'deterministic outer loop',
      category: 'repo',
    },
  },
  {
    id: 'note-loop-owner',
    type: 'pipeline',
    position: { x: COL.worker + 40, y: ROW.note },
    data: {
      label: 'Critical invariant',
      description: 'The worker script owns queue continuation. Codex only owns one issue. That is what prevents the process from stopping after 2–3 items.',
      category: 'issue',
    },
  },
]
