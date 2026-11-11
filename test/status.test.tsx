import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board', () => {
  it('shows the lane banner and the nights on disk', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');
    expect(html).toContain('<td>4</td><td>0</td><td>1</td>');
    expect(html).toContain('<td>4</td><td>0</td><td>0</td>');
  });

  it('serves a digest page for each night on the board', async () => {
    const app = createApp(config);

    for (const night of ['2026-10-27', '2026-10-28']) {
      const res = await app.request(`/digest/${night}`);
      const html = await res.text();
      expect(res.status).toBe(200);
      expect(html).toContain(`digest · ${night}`);
    }
  });

  it('returns 404 when a digest night is not on disk', async () => {
    const res = await createApp(config).request('/digest/2026-10-26');
    expect(res.status).toBe(404);
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
