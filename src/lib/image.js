// Client-side image downscale + JPEG re-encode.
//
// Business-card photos straight off a phone are often 4-12MB. We compress before
// (a) sending to the scan endpoint — smaller upload, faster vision, well under the
// 10MB cap — and (b) storing the card image as a base64 data URL on the contact,
// so we don't write 13MB rows to Postgres for every saved card.
//
// Everything degrades gracefully: if the browser can't decode the file (e.g. some
// HEIC images) we fall back to the original file and its raw data URL.

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dataURLToFile(dataUrl, filename) {
  const [header, b64] = dataUrl.split(',');
  const mime = (header.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Downscale `file` so its longest edge is at most `maxDim` and re-encode as JPEG.
 * Resolves to `{ file, dataUrl, width, height, compressed }`. On any failure the
 * original file is returned untouched (with a best-effort data URL).
 */
export async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  try {
    const rawUrl = await readAsDataURL(file);
    const img = await loadImage(rawUrl);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return { file, dataUrl: rawUrl, width: w, height: h, compressed: false };

    const scale = Math.min(1, maxDim / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    // White matte so transparent PNGs don't turn black when flattened to JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, th);
    ctx.drawImage(img, 0, 0, tw, th);

    const outUrl = canvas.toDataURL('image/jpeg', quality);
    const outFile = dataURLToFile(outUrl, (file.name || 'card').replace(/\.[^.]+$/, '') + '.jpg');

    // If we didn't actually shrink it (already small), keep whichever is smaller.
    if (scale === 1 && outFile.size >= file.size) {
      return { file, dataUrl: rawUrl, width: w, height: h, compressed: false };
    }
    return { file: outFile, dataUrl: outUrl, width: tw, height: th, compressed: true };
  } catch {
    const dataUrl = await readAsDataURL(file).catch(() => null);
    return { file, dataUrl, width: 0, height: 0, compressed: false };
  }
}
