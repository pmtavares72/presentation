// ============================================
// Extract images from DOM elements
// Convert <img> and inline SVGs to data URLs
// ============================================

import type { ImageDescriptor } from "../types";

// Convert an <img> element to a data URL via canvas
export async function imageToDataUrl(
  img: HTMLImageElement,
  win: Window = window
): Promise<string | undefined> {
  try {
    // Wait for image to load if not already
    if (!img.complete) {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
      });
    }

    // Use the element's own document to create the canvas — avoids cross-origin taint
    const doc = img.ownerDocument || win.document;
    const canvas = doc.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

// Convert an inline SVG element to a data URL.
// Pass the owning document (e.g. iframe's doc) so canvas is created in the right context.
export async function svgToDataUrl(
  svg: SVGElement,
  doc: Document = document
): Promise<string | undefined> {
  try {
    // Ensure SVG has explicit width/height so canvas renders at correct size
    const rect = svg.getBoundingClientRect();
    const w = rect.width || 24;
    const h = rect.height || 24;

    const serializer = new XMLSerializer();
    // Clone with explicit dimensions so the image renders at the right size
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.width = w;
    img.height = h;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG render failed"));
      img.src = url;
    });

    const scale = 2; // Render at 2x for crisp output
    const canvas = doc.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);

    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

// Read image descriptor from an <img> element
export async function readImage(
  img: HTMLImageElement,
  win: Window = window
): Promise<ImageDescriptor> {
  // Try canvas approach first, then fall back to fetch
  let dataUrl = await imageToDataUrl(img, win);

  if (!dataUrl && img.src) {
    dataUrl = await fetchImageAsDataUrl(img.src) ?? undefined;
  }

  return {
    src: img.src,
    dataUrl,
    objectFit: (win.getComputedStyle(img).objectFit as ImageDescriptor["objectFit"]) || "fill",
  };
}

// Fetch an image URL and return it as a base64 data URL
async function fetchImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
