import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: 'runs',
};

describe('digest page', () => {
  it('renders rows sorted by job and marks retry and failure rows', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('<title>rig · digest · 2026-10-28</title>');
    expect(html.indexOf('digest/render')).toBeLessThan(html.indexOf('fixtures/refresh'));
    expect(html.indexOf('fixtures/refresh')).toBeLessThan(html.indexOf('lane/sync'));
    expect(html.indexOf('lane/sync')).toBeLessThan(html.indexOf('notes/backup'));
    expect(html).toContain('<tr class="warn"><td>fixtures/refresh</td>');
    expect(html).toContain('<tr class="warn"><td>notes/backup</td>');
    expect(html).toContain('<span class="mute">—</span>');
  });

  it('returns 404 when the night file does not exist', async () => {
    const res = await createApp(config).request('/digest/2026-10-30');

    expect(res.status).toBe(404);
  });

  it('renders the empty-night message', async () => {
    const res = await createApp({ ...config, runsDir: 'test/fixtures/empty-runs' }).request(
      '/digest/2026-11-11',
    );
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table>');
  });
});
