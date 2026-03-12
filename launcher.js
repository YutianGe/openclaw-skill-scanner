#!/usr/bin/env node

import http from 'node:http';
import url from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn, exec } from 'node:child_process';

import { scanSkills } from './src/scanner.js';
import { loadConfig, addWhitelistDomain, removeWhitelistDomain } from './src/config.js';
import { quarantineSkill, disableSkill } from './src/actions.js';
import {
  getOllamaStatus,
  installOllama,
  startOllama,
  stopOllama,
  downloadModel
} from './src/ollama-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsRoot =
  process.env.OPENCLAW_SKILLS_ROOT ||
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.agents', 'skills');

const projectRoot = __dirname;
const rulesConfig = loadConfig(projectRoot);

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleApi(req, res) {
  const parsed = url.parse(req.url, true);

  // 实时扫描端点（SSE）
  if (parsed.pathname === '/api/scan-stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const allResults = [];
    let scannedCount = 0;

    try {
      await scanSkills(skillsRoot, {
        rulesConfig,
        projectRoot,
        onProgress: (progress) => {
          res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
        },
        onSkillScanned: (result) => {
          scannedCount++;
          allResults.push(result);

          const highCount = result.findings.filter(f => f.severity === 'high').length;
          const mediumCount = result.findings.filter(f => f.severity === 'medium').length;

          res.write(`data: ${JSON.stringify({
            type: 'skill',
            data: {
              ...result,
              highCount,
              mediumCount,
              status: result.status || (result.findings.length > 0 ? 'risky' : 'safe')
            }
          })}\n\n`);
        }
      });

      const highRiskSkills = allResults.filter(s => s.findings.some(f => f.severity === 'high'));
      const mediumRiskSkills = allResults.filter(s => {
        const hasHigh = s.findings.some(f => f.severity === 'high');
        const hasMedium = s.findings.some(f => f.severity === 'medium');
        return hasMedium && !hasHigh;
      });
      const safeSkills = allResults.filter(s => s.findings.length === 0 && s.status !== 'disabled');
      const disabledSkills = allResults.filter(s => s.status === 'disabled');

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: {
          total: allResults.length,
          risky: highRiskSkills.length,
          medium: mediumRiskSkills.length,
          safe: safeSkills.length,
          disabled: disabledSkills.length,
          scannedAt: new Date().toISOString()
        }
      })}\n\n`);

      res.end();
    } catch (e) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e.message || String(e) })}\n\n`);
      res.end();
    }
    return;
  }

  if (parsed.pathname === '/api/scan' && req.method === 'GET') {
    try {
      const results = await scanSkills(skillsRoot, { rulesConfig, projectRoot });

      const highRiskSkills = results.filter(s => s.findings.some(f => f.severity === 'high'));
      const mediumRiskSkills = results.filter(s => {
        const hasHigh = s.findings.some(f => f.severity === 'high');
        const hasMedium = s.findings.some(f => f.severity === 'medium');
        return hasMedium && !hasHigh;
      });
      const safeSkills = results.filter(s => s.findings.length === 0 && s.status !== 'disabled');
      const disabledSkills = results.filter(s => s.status === 'disabled');

      const summary = results.map((s) => {
        const highCount = s.findings.filter((f) => f.severity === 'high').length;
        const mediumCount = s.findings.filter((f) => f.severity === 'medium').length;
        return {
          skillName: s.skillName,
          skillDir: s.skillDir,
          highCount,
          mediumCount,
          status: s.status || (s.findings.length > 0 ? 'risky' : 'safe')
        };
      });

      sendJson(res, 200, {
        ok: true,
        results,
        summary,
        stats: {
          total: results.length,
          risky: highRiskSkills.length,
          medium: mediumRiskSkills.length,
          safe: safeSkills.length,
          disabled: disabledSkills.length
        },
        scannedAt: new Date().toISOString(),
      });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message || String(e) });
    }
    return;
  }

  if (parsed.pathname === '/api/quarantine' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { skillName } = JSON.parse(body || '{}');
        if (!skillName) {
          sendJson(res, 400, { ok: false, error: 'missing skillName' });
          return;
        }
        const skillDir = path.join(skillsRoot, skillName);
        if (!fs.existsSync(skillDir)) {
          sendJson(res, 404, { ok: false, error: 'skill not found' });
          return;
        }
        const quarantineDir = path.join(projectRoot, '.skill-quarantine');
        const moved = quarantineSkill(skillDir, quarantineDir);
        sendJson(res, 200, { ok: true, skillName, movedTo: moved });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (parsed.pathname === '/api/disable' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { skillName } = JSON.parse(body || '{}');
        if (!skillName) {
          sendJson(res, 400, { ok: false, error: 'missing skillName' });
          return;
        }
        const skillDir = path.join(skillsRoot, skillName);
        if (!fs.existsSync(skillDir)) {
          sendJson(res, 404, { ok: false, error: 'skill not found' });
          return;
        }
        const markFile = disableSkill(skillDir);
        sendJson(res, 200, { ok: true, skillName, markFile });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (parsed.pathname === '/api/open-dir' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { skillName } = JSON.parse(body || '{}');
        if (!skillName) {
          sendJson(res, 400, { ok: false, error: 'missing skillName' });
          return;
        }
        const skillDir = path.join(skillsRoot, skillName);
        if (!fs.existsSync(skillDir)) {
          sendJson(res, 404, { ok: false, error: 'skill not found' });
          return;
        }
        const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        spawn(cmd, [skillDir], { detached: true, stdio: 'ignore' }).unref();
        sendJson(res, 200, { ok: true, skillName, opened: skillDir });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (parsed.pathname === '/api/open-file' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { filePath } = JSON.parse(body || '{}');
        if (!filePath) {
          sendJson(res, 400, { ok: false, error: 'missing filePath' });
          return;
        }
        if (!fs.existsSync(filePath)) {
          sendJson(res, 404, { ok: false, error: 'file not found' });
          return;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        sendJson(res, 200, { ok: true, filePath, content });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (parsed.pathname === '/api/whitelist' && req.method === 'GET') {
    try {
      const config = loadConfig(projectRoot);
      sendJson(res, 200, { ok: true, domains: config.whitelistDomains });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message || String(e) });
    }
    return;
  }

  if (parsed.pathname === '/api/whitelist/add' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { domain } = JSON.parse(body || '{}');
        if (!domain) {
          sendJson(res, 400, { ok: false, error: 'missing domain' });
          return;
        }
        const domains = addWhitelistDomain(projectRoot, domain);
        sendJson(res, 200, { ok: true, domains });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (parsed.pathname === '/api/whitelist/remove' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { domain } = JSON.parse(body || '{}');
        if (!domain) {
          sendJson(res, 400, { ok: false, error: 'missing domain' });
          return;
        }
        const domains = removeWhitelistDomain(projectRoot, domain);
        sendJson(res, 200, { ok: true, domains });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (parsed.pathname === '/api/ollama/status' && req.method === 'GET') {
    try {
      const status = await getOllamaStatus();
      sendJson(res, 200, { ok: true, ...status });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message || String(e) });
    }
    return;
  }

  if (parsed.pathname === '/api/ollama/install' && req.method === 'POST') {
    try {
      const result = await installOllama();
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message || String(e) });
    }
    return;
  }

  if (parsed.pathname === '/api/ollama/start' && req.method === 'POST') {
    try {
      const result = await startOllama();
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message || String(e) });
    }
    return;
  }

  if (parsed.pathname === '/api/ollama/stop' && req.method === 'POST') {
    try {
      const result = await stopOllama();
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message || String(e) });
    }
    return;
  }

  if (parsed.pathname === '/api/ollama/download-model' && req.method === 'POST') {
    try {
      const result = await downloadModel('llama3.2:3b');
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message || String(e) });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'not found' });
}

function handleStatic(req, res) {
  const parsed = url.parse(req.url);
  let pathname = parsed.pathname || '/';
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }
  const filePath = path.join(projectRoot, 'web', pathname);
  const webRoot = path.join(projectRoot, 'web');
  if (!filePath.startsWith(webRoot)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const mime =
      ext === '.html'
        ? 'text/html; charset=utf-8'
        : ext === '.js'
        ? 'text/javascript; charset=utf-8'
        : ext === '.css'
        ? 'text/css; charset=utf-8'
        : 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
  } else {
    handleStatic(req, res);
  }
});

const PORT = process.env.SKILL_SCAN_PORT || 5173;

// 自动打开浏览器
function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start ${url}`
    : process.platform === 'darwin'
    ? `open ${url}`
    : `xdg-open ${url}`;

  exec(cmd, (error) => {
    if (error) {
      console.log(`请手动打开浏览器访问: ${url}`);
    }
  });
}

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`✅ OpenClaw Skill Scanner 已启动`);
  console.log(`🌐 访问地址: ${url}`);
  console.log(`\n正在自动打开浏览器...`);

  // 延迟 1 秒后打开浏览器，确保服务器完全启动
  setTimeout(() => {
    openBrowser(url);
  }, 1000);
});
