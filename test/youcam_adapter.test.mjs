import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { YouCamAdapter } from '../src/youcam_adapter.mjs';

describe('YouCam Adapter Module', () => {
  it('reports simulation mode when API key is empty', () => {
    const adapter = new YouCamAdapter();
    const meta = adapter.getEngineMetadata();

    assert.equal(meta.isLive, false);
    assert.equal(meta.mode, 'simulation');
    assert.match(meta.engine, /YouCam/);
  });

  it('creates simulated task and transitions to success upon polling', async () => {
    const adapter = new YouCamAdapter();
    const created = await adapter.createTryOnTask({
      userImage: 'https://example.com/user.jpg',
      garmentImage: 'https://example.com/garment.jpg',
      garmentCategory: 'upper_body',
    });

    assert.ok(created.taskId.startsWith('sim_vto_'));
    assert.equal(created.status, 'processing');
    assert.equal(created.mode, 'simulation');

    // Poll until ready
    const polled = await adapter.pollTaskStatus(created.taskId, {
      maxWaitMs: 5000,
      pollIntervalMs: 200,
    });

    assert.equal(polled.status, 'success');
    assert.ok(polled.resultUrl.startsWith('data:image/svg+xml'));
    assert.equal(polled.provenance, 'SIMULATED_VTO_FIXTURE');
  });

  it('rejects missing userImage or garmentImage', async () => {
    const adapter = new YouCamAdapter();
    await assert.rejects(
      async () => {
        await adapter.createTryOnTask({ userImage: '' });
      },
      /Both userImage and garmentImage are required/
    );
  });
});
