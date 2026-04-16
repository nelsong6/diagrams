import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * CI Dashboard routes — webhook receiver + SSE broadcaster.
 *
 * @param {object} opts
 * @param {string} opts.webhookSecret - GitHub webhook HMAC signing secret
 */
export function createCIRoutes({ webhookSecret }) {
  const router = Router();

  // In-memory pipeline state: key = `${repo}/${runId}`
  const runs = new Map();
  const sseClients = new Set();

  // ── Webhook receiver ──────────────────────────────────────────

  router.post('/webhook', (req, res) => {
    if (!webhookSecret) {
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature || !req.rawBody) {
      return res.status(400).json({ error: 'Missing signature or body' });
    }

    const expected = 'sha256=' + createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    if (event !== 'workflow_run') {
      return res.status(200).json({ ignored: true, event });
    }

    const { action, workflow_run: wr } = req.body;
    if (!wr) {
      return res.status(400).json({ error: 'Missing workflow_run payload' });
    }

    const run = {
      repo: wr.repository?.full_name || wr.head_repository?.full_name || 'unknown',
      repoName: wr.repository?.name || 'unknown',
      workflow: wr.name,
      workflowId: wr.workflow_id,
      runId: wr.id,
      runNumber: wr.run_number,
      status: wr.status,
      conclusion: wr.conclusion,
      headBranch: wr.head_branch,
      headSha: wr.head_sha?.substring(0, 7),
      commitMessage: wr.head_commit?.message?.split('\n')[0] || '',
      event: wr.event,
      htmlUrl: wr.html_url,
      startedAt: wr.run_started_at,
      updatedAt: wr.updated_at,
      action,
    };

    const key = `${run.repo}/${run.runId}`;
    runs.set(key, run);

    // Prune runs older than 2 hours
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [k, v] of runs) {
      if (new Date(v.updatedAt).getTime() < cutoff) {
        runs.delete(k);
      }
    }

    // Broadcast to SSE clients
    const msg = `event: update\ndata: ${JSON.stringify(run)}\n\n`;
    for (const client of sseClients) {
      client.write(msg);
    }

    res.status(200).json({ received: true, key });
  });

  // ── SSE endpoint ──────────────────────────────────────────────

  router.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send current state snapshot
    const snapshot = Array.from(runs.values());
    res.write(`event: init\ndata: ${JSON.stringify(snapshot)}\n\n`);

    sseClients.add(res);

    // Keepalive every 30 seconds
    const keepalive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      sseClients.delete(res);
      clearInterval(keepalive);
    });
  });

  // ── Status snapshot ───────────────────────────────────────────

  router.get('/status', (req, res) => {
    res.json({
      runs: Array.from(runs.values()),
      clients: sseClients.size,
    });
  });

  return router;
}
