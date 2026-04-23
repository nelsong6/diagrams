import type { Edge } from '@xyflow/react'

const DISPATCH = { stroke: '#f59e0b', strokeWidth: 2.5 }
const INTERNAL = { stroke: '#38bdf8', strokeWidth: 1.8 }
const STATE = { stroke: '#a78bfa', strokeWidth: 1.8 }
const RECOVERY = { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '6 4' }

export const codexQueueEdges: Edge[] = [
  {
    id: 'issue-to-queue',
    source: 'trigger-issue',
    target: 'github-queue-label',
    style: DISPATCH,
    animated: true,
    label: 'queue signal',
  },
  {
    id: 'manual-to-wakeup',
    source: 'trigger-manual',
    target: 'github-wakeup',
    style: INTERNAL,
    label: 'manual wake',
  },
  {
    id: 'fallback-to-script',
    source: 'trigger-fallback',
    target: 'worker-script',
    style: RECOVERY,
    label: 'recovery wake',
  },
  {
    id: 'queue-to-wakeup',
    source: 'github-queue-label',
    target: 'github-wakeup',
    style: DISPATCH,
    animated: true,
    label: 'issue event',
  },
  {
    id: 'wakeup-to-runner',
    source: 'github-wakeup',
    target: 'worker-runner',
    style: DISPATCH,
    animated: true,
    label: 'runs-on sts2-live',
  },
  {
    id: 'runner-to-script',
    source: 'worker-runner',
    target: 'worker-script',
    style: INTERNAL,
    label: 'start worker',
  },
  {
    id: 'script-to-lock',
    source: 'worker-script',
    target: 'worker-lock',
    style: STATE,
    label: 'single active loop',
  },
  {
    id: 'script-to-claim',
    source: 'worker-script',
    target: 'exec-claim',
    style: INTERNAL,
    label: 'oldest queued issue',
  },
  {
    id: 'claim-to-codex',
    source: 'exec-claim',
    target: 'exec-codex',
    style: INTERNAL,
    label: 'one issue packet',
  },
  {
    id: 'codex-to-outcome',
    source: 'exec-codex',
    target: 'exec-outcome',
    style: INTERNAL,
    label: 'structured result',
  },
  {
    id: 'outcome-to-observe',
    source: 'exec-outcome',
    target: 'observe-surfaces',
    style: STATE,
    label: 'GitHub reflects result',
  },
  {
    id: 'observe-to-log',
    source: 'observe-surfaces',
    target: 'observe-log',
    style: STATE,
    label: 'local proof',
  },
  {
    id: 'log-to-drain',
    source: 'observe-log',
    target: 'observe-drain',
    style: STATE,
    label: 'repeat until empty',
  },
  {
    id: 'outcome-back-to-queue',
    source: 'exec-outcome',
    target: 'github-queue-label',
    style: INTERNAL,
    label: 'next issue',
  },
]
