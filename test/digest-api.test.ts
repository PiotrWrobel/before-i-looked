import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const runsDirs: string[] = [];
const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: '',
};

function createRunsDir() {
  const runsDir = mkdtempSync(join(process.cwd(), '.test-runs-'));
  runsDirs.push(runsDir);
  return runsDir;
}

afterEach(() => {
  for (const runsDir of runsDirs.splice(0)) {
    rmSync(runsDir, { recursive: true, force: true });
  }
});

describe('GET /api/digest/:night', () => {
  it('returns rows sorted by job and counts malformed lines', async () => {
    const runsDir = createRunsDir();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-28T02:00:00+01:00","job":"zeta","status":"ok","owner":"rook"}',
        'not json',
        '{"at":"2026-10-28T01:00:00+01:00","job":"alpha","status":"retry","owner":null}',
      ].join('\n'),
    );

    const response = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-28');
    const digest = (await response.json()) as {
      rows: { job: string }[];
      malformedLines: number;
    };

    expect(response.status).toBe(200);
    expect(digest.rows.map(({ job }) => job)).toEqual(['alpha', 'zeta']);
    expect(digest.malformedLines).toBe(1);
  });

  it('returns 404 when the night file does not exist', async () => {
    const runsDir = createRunsDir();

    const response = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-28');

    expect(response.status).toBe(404);
  });

  it('returns an empty rows array for an empty night', async () => {
    const runsDir = createRunsDir();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');

    const response = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rows: [], malformedLines: 0 });
  });
});
