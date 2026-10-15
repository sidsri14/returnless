/**
 * ReturnLess Native HTTP Web & API Server
 * Powers the interactive comparison board, YouCam S2S gateway, and wardrobe overlap analyzer.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YouCamAdapter } from './youcam_adapter.mjs';
import { analyzeWardrobeOverlap, compareGarments } from './wardrobe_overlap.mjs';
import {
  validateTryOnPayload,
  validateDecisionPayload,
  validateApparelItem,
} from './validator.mjs';
import { DecisionStore } from './decision_store.mjs';
import {
  SAMPLE_SHOPPERS,
  SAMPLE_CANDIDATES,
  SAMPLE_OWNED_WARDROBE,
} from '../fixtures/sample_data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

export function createReturnLessServer(options = {}) {
  const adapter = options.adapter || new YouCamAdapter();
  const decisionStore = options.decisionStore || new DecisionStore();

  const server = http.createServer(async (req, res) => {
    // Enable CORS for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Helper: JSON response
    const sendJson = (statusCode, data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify(data));
    };

    // Helper: Parse JSON body
    const parseBody = () =>
      new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 10 * 1024 * 1024) {
            reject(new Error('Payload too large'));
          }
        });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            reject(new Error('Malformed JSON payload'));
          }
        });
        req.on('error', reject);
      });

    try {
      // API Routes
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(200, {
          status: 'ok',
          app: 'ReturnLess',
          version: '1.0.0',
          engine: adapter.getEngineMetadata(),
          stats: decisionStore.getSummaryStats(),
          timestamp: new Date().toISOString(),
        });
      }

      if (pathname === '/api/fixtures' && req.method === 'GET') {
        return sendJson(200, {
          shoppers: SAMPLE_SHOPPERS,
          candidates: SAMPLE_CANDIDATES,
          ownedWardrobe: SAMPLE_OWNED_WARDROBE,
        });
      }

      if (pathname === '/api/tryon' && req.method === 'POST') {
        const rawBody = await parseBody();
        const validation = validateTryOnPayload(rawBody);
        if (!validation.valid) {
          return sendJson(400, { error: validation.error });
        }

        const taskResult = await adapter.createTryOnTask(validation.data);
        return sendJson(200, taskResult);
      }

      if (pathname.startsWith('/api/tryon/') && req.method === 'GET') {
        const taskId = pathname.slice('/api/tryon/'.length);
        if (!taskId) {
          return sendJson(400, { error: 'Task ID is required' });
        }

        const statusResult = await adapter.getTaskStatus(taskId);
        return sendJson(200, statusResult);
      }

      if (pathname === '/api/analyze-overlap' && req.method === 'POST') {
        const rawBody = await parseBody();
        const candidateValidation = validateApparelItem(rawBody.candidate, 'candidate');
        if (!candidateValidation.valid) {
          return sendJson(400, { error: candidateValidation.error });
        }

        const ownedWardrobe = Array.isArray(rawBody.ownedWardrobe)
          ? rawBody.ownedWardrobe
          : SAMPLE_OWNED_WARDROBE;

        const analysis = analyzeWardrobeOverlap(candidateValidation.data, ownedWardrobe);
        return sendJson(200, analysis);
      }

      if (pathname === '/api/decision' && req.method === 'POST') {
        const rawBody = await parseBody();
        const validation = validateDecisionPayload(rawBody);
        if (!validation.valid) {
          return sendJson(400, { error: validation.error });
        }

        const record = decisionStore.recordDecision({
          ...validation.data,
          tryOnTaskId: rawBody.tryOnTaskId,
        });

        return sendJson(200, {
          success: true,
          record,
          summary: decisionStore.getSummaryStats(),
        });
      }

      if (pathname === '/api/audit-log' && req.method === 'GET') {
        return sendJson(200, {
          decisions: decisionStore.getAllDecisions(),
          summary: decisionStore.getSummaryStats(),
        });
      }

      // Static File Serving
      if (req.method === 'GET') {
        let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

        // Security check: prevent directory traversal
        if (!filePath.startsWith(PUBLIC_DIR)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        // If file not found in public, serve index.html for SPA-like navigation
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
    } catch (err) {
      console.error('Server Error:', err);
      sendJson(500, { error: err.message || 'Internal Server Error' });
    }
  });

  return {
    server,
    adapter,
    decisionStore,
    listen: (port, host) =>
      new Promise((resolve) => {
        server.listen(port, host, () => {
          resolve(server.address());
        });
      }),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '127.0.0.1';
  const instance = createReturnLessServer();
  await instance.listen(port, host);
  console.log(`[ReturnLess Server] Active and listening at http://${host}:${port}`);
}
