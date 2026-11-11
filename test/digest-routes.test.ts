import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
const night = '2026-10-28';
const firstAt = '2026-10-29T01:30:00+01:00';
const lastAt = '2026-10-29T01:37:00+01:00';
let runsDir: string;

function writeNight(lines: string[]) {
  writeFileSync(join(runsDir, `${night}.jsonl`), lines.join('\n'));
}

function entry(job: string, status: 'ok' | 'retry' | 'fail', at: string, owner: string | null, error?: string) {
  return JSON.stringify({ at, job, status, owner, ...(error === undefined ? {} : { error }) });
}

function rowsFromJson(json: unknown): DigestRow[] {
  if (Array.isArray(json)) return json as DigestRow[];
  return (json as { rows: DigestRow[] }).rows;
}

beforeEach(() => {
  runsDir = mkdtempSync(join(process.cwd(), '.digest-route-test-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('renders sorted jobs and returns the same aggregated rows as JSON', async () => {
    writeNight([
      entry('zeta', 'fail', firstAt, 'rook', 'failed'),
      entry('alpha', 'retry', firstAt, null),
      entry('alpha', 'ok', lastAt, null),
    ]);
    const app = createApp({ ...config, runsDir });
    const page = await app.request(`/digest/${night}`);
    const api = await app.request(`/api/digest/${night}`);

    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('alpha');
    expect(html).toContain('zeta');
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('zeta'));
    expect(html).toContain('—');
    expect(html).toContain(firstAt);
    expect(html).toContain(lastAt);
    expect(rowsFromJson(await api.json())).toEqual([
      {
        job: 'alpha', owner: null, runs: 2, retries: 1, lastStatus: 'ok', lastError: null,
        firstAt, lastAt,
      },
      {
        job: 'zeta', owner: 'rook', runs: 1, retries: 0, lastStatus: 'fail', lastError: 'failed',
        firstAt, lastAt: firstAt,
      },
    ]);
  });

  it.each(['/digest', '/api/digest'])('returns 404 from %s for a missing night', async (route) => {
    const res = await createApp({ ...config, runsDir }).request(`${route}/${night}`);

    expect(res.status).toBe(404);
  });

  it('renders nothing ran for an empty night', async () => {
    writeNight([]);
    const res = await createApp({ ...config, runsDir }).request(`/digest/${night}`);

    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('nothing ran');
  });

  it('returns no JSON rows for an empty night', async () => {
    writeNight([]);
    const res = await createApp({ ...config, runsDir }).request(`/api/digest/${night}`);

    expect(res.status).toBe(200);
    expect(rowsFromJson(await res.json())).toEqual([]);
  });

  it('renders valid jobs around a bad line', async () => {
    writeNight([
      entry('alpha', 'ok', firstAt, 'rook'),
      '{not json',
      entry('zeta', 'fail', lastAt, null, 'failed'),
    ]);
    const res = await createApp({ ...config, runsDir }).request(`/digest/${night}`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('alpha');
    expect(html).toContain('zeta');
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('zeta'));
  });

  it('returns valid JSON rows around a bad line', async () => {
    writeNight([
      entry('alpha', 'ok', firstAt, 'rook'),
      '{not json',
      entry('zeta', 'fail', lastAt, null, 'failed'),
    ]);
    const res = await createApp({ ...config, runsDir }).request(`/api/digest/${night}`);

    expect(res.status).toBe(200);
    expect(rowsFromJson(await res.json())).toEqual([
      {
        job: 'alpha', owner: 'rook', runs: 1, retries: 0, lastStatus: 'ok', lastError: null,
        firstAt, lastAt: firstAt,
      },
      {
        job: 'zeta', owner: null, runs: 1, retries: 0, lastStatus: 'fail', lastError: 'failed',
        firstAt: lastAt, lastAt,
      },
    ]);
  });
});
