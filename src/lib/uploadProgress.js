// A multipart request sends its files back to back, so the bytes sent for the
// whole request say how far along each file is. `total` includes multipart
// overhead, so progress is scaled onto the files' combined size.
export function splitUploadProgress(sizes, loaded, total) {
  const sum = sizes.reduce((a, b) => a + b, 0);
  const fraction = total > 0 ? Math.min(loaded / total, 1) : 0;
  const sent = fraction * sum;
  let offset = 0;
  return sizes.map((size) => {
    const start = offset;
    offset += size;
    if (size === 0) return sent >= start ? 1 : 0;
    return Math.min(Math.max((sent - start) / size, 0), 1);
  });
}
