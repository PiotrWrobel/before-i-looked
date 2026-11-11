import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('aggregates the 2026-10-28 fixture and counts its malformed line', () => {
    const digest = readNight('runs', '2026-10-28');

    expect(digest.rows).toHaveLength(5);
    expect(digest.malformedLines).toBe(1);
    expect(digest.rows.find(({ job }) => job === 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps jobs whose owner is null', () => {
    const digest = readNight('runs', '2026-10-28');

    expect(digest.rows.find(({ job }) => job === 'digest/render')).toMatchObject({
      job: 'digest/render',
      owner: null,
      runs: 1,
    });
  });
});
