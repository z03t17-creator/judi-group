import { MEDIA_MAX_BYTES, MEDIA_MAX_EDGE_PX } from "@/lib/media-shared";

/**
 * Browser-side JPEG compression for camera / gallery picks.
 * Caps the long edge and iteratively lowers quality toward ~500KB.
 */
export async function compressImageToJpeg(
  source: Blob | HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  options?: { maxEdge?: number; maxBytes?: number },
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? MEDIA_MAX_EDGE_PX;
  const maxBytes = options?.maxBytes ?? MEDIA_MAX_BYTES;

  const canvas = await drawToCanvas(source, maxEdge);
  let quality = 0.85;
  let blob = await canvasToJpeg(canvas, quality);

  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }

  if (blob.size > maxBytes) {
    const scale = Math.sqrt(maxBytes / blob.size);
    const w = Math.max(1, Math.round(canvas.width * Math.min(scale, 0.85)));
    const h = Math.max(1, Math.round(canvas.height * Math.min(scale, 0.85)));
    const smaller = document.createElement("canvas");
    smaller.width = w;
    smaller.height = h;
    const ctx = smaller.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(canvas, 0, 0, w, h);
    blob = await canvasToJpeg(smaller, 0.7);
  }

  return blob;
}

async function drawToCanvas(
  source: Blob | HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  maxEdge: number,
): Promise<HTMLCanvasElement> {
  if (source instanceof HTMLCanvasElement) {
    return resizeCanvas(source, maxEdge);
  }

  if (source instanceof HTMLVideoElement) {
    const w = source.videoWidth || 1;
    const h = source.videoHeight || 1;
    return drawSized(source, w, h, maxEdge);
  }

  if (source instanceof HTMLImageElement) {
    const w = source.naturalWidth || source.width || 1;
    const h = source.naturalHeight || source.height || 1;
    return drawSized(source, w, h, maxEdge);
  }

  const bitmap = await createImageBitmap(source);
  try {
    return drawSized(bitmap, bitmap.width, bitmap.height, maxEdge);
  } finally {
    bitmap.close();
  }
}

function resizeCanvas(source: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  return drawSized(source, source.width, source.height, maxEdge);
}

function drawSized(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("jpeg_encode_failed"));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}
