'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_REPO = {
  owner: 'tobq',
  repo: 'boardclip',
  branch: 'main',
};

const DEFAULT_POLL_MS = 4 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 90 * 1000;

function requestJson(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'BoardClip auto-update',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      timeout: timeoutMs,
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`GitHub returned ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('GitHub request timed out')));
    req.on('error', reject);
  });
}

async function latestCommitSha(repo = DEFAULT_REPO) {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${encodeURIComponent(repo.branch)}`;
  const data = await requestJson(url);
  return data && data.sha ? String(data.sha) : null;
}

function updateScriptPath(appDir, platform = process.platform) {
  return platform === 'win32'
    ? path.win32.join(appDir, 'update.bat')
    : path.posix.join(appDir, 'update.sh');
}

function canAutoUpdate(appDir, buildInfo) {
  if (!buildInfo || !buildInfo.fullCommit) return false;
  if (buildInfo.dirty) return false;
  return fs.existsSync(path.join(appDir, '.git')) && fs.existsSync(updateScriptPath(appDir));
}

function runUpdate(appDir, platform = process.platform) {
  const script = updateScriptPath(appDir, platform);
  const child = platform === 'win32'
    ? spawn('cmd.exe', ['/c', script], {
        cwd: appDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
    : spawn('sh', [script], {
        cwd: appDir,
        detached: true,
        stdio: 'ignore',
      });
  child.unref();
}

function createAutoUpdater({
  appDir,
  buildInfo,
  repo = DEFAULT_REPO,
  pollMs = DEFAULT_POLL_MS,
  startupDelayMs = STARTUP_DELAY_MS,
  logger = console,
} = {}) {
  let checking = false;
  let updating = false;
  let timer = null;

  async function check({ manual = false } = {}) {
    if (checking || updating) return { ok: false, status: 'busy' };
    if (!canAutoUpdate(appDir, buildInfo)) return { ok: false, status: 'unsupported' };

    checking = true;
    try {
      const latest = await latestCommitSha(repo);
      const current = buildInfo.fullCommit;
      if (!latest) return { ok: false, status: 'unknown' };
      if (latest === current) return { ok: true, status: 'current', latest };

      updating = true;
      logger.log(`BoardClip update available: ${current.slice(0, 7)} -> ${latest.slice(0, 7)}`);
      runUpdate(appDir);
      return { ok: true, status: 'updating', latest };
    } catch (error) {
      if (manual) logger.error(`BoardClip update check failed: ${error.message}`);
      return { ok: false, status: 'error', error };
    } finally {
      checking = false;
    }
  }

  function start() {
    if (!canAutoUpdate(appDir, buildInfo)) return;
    setTimeout(() => check(), startupDelayMs).unref();
    timer = setInterval(() => check(), pollMs);
    timer.unref();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { check, start, stop };
}

module.exports = {
  DEFAULT_REPO,
  DEFAULT_POLL_MS,
  STARTUP_DELAY_MS,
  canAutoUpdate,
  createAutoUpdater,
  latestCommitSha,
  runUpdate,
  updateScriptPath,
};
