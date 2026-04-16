import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * CI Dashboard routes — webhook receiver + SSE broadcaster + version tracking.
 *
 * @param {object} opts
 * @param {string} opts.webhookSecret - GitHub webhook HMAC signing secret
 */
export function createCIRoutes({ webhookSecret }) {
  const router = Router();

  // In-memory state
  const runs = new Map();              // key: `${repo}/${runId}` → pipeline run
  const versions = new Map();          // key: repoName → latest published version
  const deployedVersions = new Map();  // key: repoName → deployed version info
  const sseClients = new Set();

  function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      client.write(msg);
    }
  }

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

    // ── Release events — track latest published version ──
    if (event === 'release') {
      const { action, release, repository } = req.body;
      if (action === 'published' && release && repository) {
        const version = {
          repo: repository.full_name,
          repoName: repository.name,
          version: release.tag_name,
          publishedAt: release.published_at,
          htmlUrl: release.html_url,
        };
        versions.set(repository.name, version);
        broadcast('version', version);
        return res.status(200).json({ received: true, type: 'release', version: release.tag_name });
      }
      return res.status(200).json({ ignored: true, event, action });
    }

    // ── Workflow run events — track pipeline status ──
    if (event === 'workflow_run') {
      const { action, workflow_run: wr } = req.body;
      if (!wr) {
        return res.status(400).json({ error: 'Missing workflow_run payload' });
      }

      if (wr.head_branch?.startsWith('dependabot/')) {
        return res.status(200).json({ ignored: true, reason: 'dependabot' });
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

      broadcast('update', run);
      return res.status(200).json({ received: true, key });
    }

    // Ignore other event types
    return res.status(200).json({ ignored: true, event });
  });

  // ── Deploy report — consumer sites report their live versions ──

  router.post('/deployed', (req, res) => {
    const { site, repo, versions: deployedVers } = req.body;
    if (!site || !repo) {
      return res.status(400).json({ error: 'Missing site or repo' });
    }

    const deployed = {
      site,
      repo,
      versions: deployedVers || {},
      reportedAt: new Date().toISOString(),
    };
    deployedVersions.set(repo, deployed);
    broadcast('deployed', deployed);
    res.status(200).json({ received: true, repo });
  });

  // ── SSE endpoint ──────────────────────────────────────────────

  router.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send current state snapshot
    const snapshot = {
      runs: Array.from(runs.values()),
      versions: Array.from(versions.values()),
      deployed: Array.from(deployedVersions.values()),
    };
    res.write(`event: init\ndata: ${JSON.stringify(snapshot)}\n\n`);

    sseClients.add(res);

    const keepalive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      sseClients.delete(res);
      clearInterval(keepalive);
    });
  });

  // ── Status snapshots ──────────────────────────────────────────

  router.get('/status', (req, res) => {
    res.json({
      runs: Array.from(runs.values()),
      clients: sseClients.size,
    });
  });

  router.get('/versions', (req, res) => {
    res.json({
      published: Array.from(versions.values()),
      deployed: Array.from(deployedVersions.values()),
    });
  });

  return router;
}
