import { describe, it, expect } from 'vitest';
import { checkFiles, formatBytes, MAX_FILES, MAX_TOTAL_BYTES } from './TemplateAttachments';

const file = (name, size) => ({ name, size });
const MB = 1024 * 1024;

describe('checkFiles', () => {
  it('accepts ordinary documents', () => {
    const { accepted, errors } = checkFiles([file('deck.pdf', MB), file('sheet.xlsx', MB)]);
    expect(accepted.map((f) => f.name)).toEqual(['deck.pdf', 'sheet.xlsx']);
    expect(errors).toEqual([]);
  });

  it('refuses types Gmail blocks, whatever the case', () => {
    const { accepted, errors } = checkFiles([file('Setup.EXE', 10), file('run.js', 10)]);
    expect(accepted).toEqual([]);
    expect(errors).toHaveLength(2);
  });

  it('refuses empty and oversized files', () => {
    const { accepted, errors } = checkFiles([file('empty.pdf', 0), file('huge.pdf', 11 * MB)]);
    expect(accepted).toEqual([]);
    expect(errors).toHaveLength(2);
  });

  it('applies the total cap across what the template already holds', () => {
    // 14 MB already attached: a 2 MB file would cross 15 MB, a 0.5 MB one would not.
    const { accepted, errors } = checkFiles(
      [file('big.pdf', 2 * MB), file('small.pdf', MB / 2)],
      [14 * MB],
    );
    expect(accepted.map((f) => f.name)).toEqual(['small.pdf']);
    expect(errors[0]).toMatch(/total/);
    expect(MAX_TOTAL_BYTES).toBe(15 * MB);
  });

  it('applies the file-count cap within a single pick', () => {
    const existing = Array(MAX_FILES - 1).fill(10);
    const { accepted, errors } = checkFiles([file('a.pdf', 10), file('b.pdf', 10)], existing);
    expect(accepted.map((f) => f.name)).toEqual(['a.pdf']);
    expect(errors).toHaveLength(1);
  });
});

describe('formatBytes', () => {
  it('reads the way a person writes a size', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2.5 * MB)).toBe('2.5 MB');
  });
});
