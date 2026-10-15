import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createReturnLessServer } from '../src/server.mjs';

describe('ReturnLess Server E2E Endpoints', () => {
  let instance;
  let baseUrl;

  before(async () => {
    instance = createReturnLessServer();
    const addr = await instance.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    if (instance) await instance.close();
  });

  it('GET /api/health returns system status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.app, 'ReturnLess');
    assert.ok(data.engine);
  });

  it('GET /api/fixtures returns sample test fixtures', async () => {
    const res = await fetch(`${baseUrl}/api/fixtures`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.candidates));
    assert.ok(Array.isArray(data.ownedWardrobe));
    assert.ok(data.candidates.length >= 3);
  });

  it('POST /api/tryon and GET /api/tryon/:taskId lifecycle', async () => {
    const tryOnRes = await fetch(`${baseUrl}/api/tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        garmentImage: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633',
        garmentCategory: 'upper_body',
      }),
    });
    assert.equal(tryOnRes.status, 200);
    const tryOnData = await tryOnRes.json();
    assert.ok(tryOnData.taskId);

    // Fetch immediate status
    const statusRes = await fetch(`${baseUrl}/api/tryon/${tryOnData.taskId}`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.ok(['processing', 'success'].includes(statusData.status));
  });

  it('POST /api/analyze-overlap produces deterministic verdict', async () => {
    const payload = {
      candidate: {
        id: 'cand_test_navy',
        name: 'Navy Knit Test',
        category: 'upper_body',
        palette: ['#1B2A4A'],
        price: 90,
      },
      ownedWardrobe: [
        {
          id: 'owned_test_navy',
          name: 'Navy Cotton Knit',
          category: 'upper_body',
          palette: ['#17253D'],
          price: 75,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/analyze-overlap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.verdict, 'REDUNDANT');
    assert.ok(data.overallOverlapScore >= 75);
    assert.equal(data.closestMatch.id, 'owned_test_navy');
  });

  it('POST /api/decision and GET /api/audit-log lifecycle', async () => {
    const decisionRes = await fetch(`${baseUrl}/api/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: 'cand_test_navy',
        candidateName: 'Navy Knit Test',
        decision: 'REJECT',
        rationale: 'Duplicate palette with owned jumper, avoiding unnecessary return',
        avoidedCost: 90.0,
        overlapScore: 89,
      }),
    });
    assert.equal(decisionRes.status, 200);
    const decisionData = await decisionRes.json();
    assert.equal(decisionData.success, true);
    assert.equal(decisionData.record.decision, 'REJECT');

    // Audit log check
    const logRes = await fetch(`${baseUrl}/api/audit-log`);
    assert.equal(logRes.status, 200);
    const logData = await logRes.json();
    assert.ok(logData.decisions.length >= 1);
    assert.equal(logData.summary.totalRejected, 1);
    assert.equal(logData.summary.totalAvoidedSpend, 90.0);
  });
});
