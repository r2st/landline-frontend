import { describe, expect, it } from 'vitest';
import { splitUploadProgress } from './uploadProgress';

describe('splitUploadProgress', () => {
  it('fills files in order as the request goes out', () => {
    expect(splitUploadProgress([100, 300], 0, 400)).toEqual([0, 0]);
    expect(splitUploadProgress([100, 300], 50, 400)).toEqual([0.5, 0]);
    expect(splitUploadProgress([100, 300], 250, 400)).toEqual([1, 0.5]);
    expect(splitUploadProgress([100, 300], 400, 400)).toEqual([1, 1]);
  });

  it('scales multipart overhead out of the total', () => {
    // 200 bytes of files in a 400-byte request: half sent = first file done.
    expect(splitUploadProgress([100, 100], 200, 400)).toEqual([1, 0]);
  });

  it('handles empty files and a missing total', () => {
    expect(splitUploadProgress([0, 100], 0, 100)).toEqual([1, 0]);
    expect(splitUploadProgress([100], 50, 0)).toEqual([0]);
    expect(splitUploadProgress([100], 500, 100)).toEqual([1]);
  });
});
