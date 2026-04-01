// ============================================
// Read computed styles from DOM elements
// ============================================

import type {
  BackgroundDescriptor,
  BorderDescriptor,
  ShadowDescriptor,
  Bounds,
} from "../types";
import { parseColor } from "../generators/color-mapper";
import { parseGradient } from "../generators/gradient-mapper";

// Get element bounds relative to the slide root.
// Uses offsetLeft/offsetTop walking up the DOM to slideRoot — this gives true
// layout coordinates independent of CSS transforms and viewport size.
export function getBounds(el: Element, slideRoot: Element): Bounds {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el as HTMLElement;

  while (node && node !== slideRoot) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  const htmlEl = el as HTMLElement;

  return {
    x,
    y,
    w: htmlEl.offsetWidth,
    h: htmlEl.offsetHeight,
  };
}

// Extract background from computed styles.
// Handles multi-layer backgrounds like:
//   linear-gradient(white overlay...), linear-gradient(gray base...)
// CSS layers are painted bottom-to-top, so the last layer is the base.
// We use the LAST (bottom-most) parseable gradient as the fill — that's the
// actual solid-looking background. The semi-transparent overlays on top are
// approximated by blending into the chosen base gradient.
export function readBackground(
  style: CSSStyleDeclaration
): BackgroundDescriptor {
  const bgImage = style.backgroundImage;
  const bgColor = style.backgroundColor;
  const hasBgColor =
    bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)";

  if (bgImage && bgImage !== "none") {
    const layers = splitBackgroundLayers(bgImage);

    // Collect all parseable gradient layers
    const gradients = layers
      .map((l) => parseGradient(l.trim()))
      .filter((g) => g !== null);

    if (gradients.length > 0) {
      // Use the last (bottom-most / base) gradient layer — it's the opaque one
      const baseGradient = gradients[gradients.length - 1]!;
      return { type: "gradient", gradient: baseGradient };
    }
  }

  // Fall back to background-color
  if (hasBgColor) {
    const color = parseColor(bgColor);
    if (color.alpha > 0) {
      return { type: "solid", color };
    }
  }

  return { type: "none" };
}

// Split "linear-gradient(...), linear-gradient(...)" at top-level commas
function splitBackgroundLayers(bgImage: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of bgImage) {
    if (char === "(") depth++;
    else if (char === ")") depth--;

    if (char === "," && depth === 0) {
      layers.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) layers.push(current.trim());
  return layers;
}

// Extract border info
export function readBorder(
  style: CSSStyleDeclaration
): BorderDescriptor | undefined {
  const width = parseFloat(style.borderWidth) || 0;
  if (width === 0) return undefined;

  const color = parseColor(style.borderColor);
  const radius = parseFloat(style.borderRadius) || 0;

  return { width, color, radius };
}

// Extract box-shadow
export function readShadow(
  style: CSSStyleDeclaration
): ShadowDescriptor | undefined {
  const shadow = style.boxShadow;
  if (!shadow || shadow === "none") return undefined;

  // Parse: "rgba(0, 0, 0, 0.04) 0px 2px 16px 0px"
  // or: "0px 4px 16px rgba(206, 14, 45, 0.25)"
  // getComputedStyle normalizes to: "rgba(r, g, b, a) Xpx Ypx Bpx Spx"
  const match = shadow.match(
    /(rgba?\([^)]+\))\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s*([-\d.]+)?px?/
  );
  if (!match) return undefined;

  return {
    color: parseColor(match[1]),
    offsetX: parseFloat(match[2]),
    offsetY: parseFloat(match[3]),
    blur: parseFloat(match[4]),
    spread: match[5] ? parseFloat(match[5]) : 0,
  };
}

// Extract corner radius (uniform), given element width for % resolution
export function readCornerRadius(
  style: CSSStyleDeclaration,
  elementWidth?: number
): number {
  const br = style.borderRadius;
  if (!br) return 0;

  // If it's a percentage, resolve against element width
  if (br.endsWith("%")) {
    const pct = parseFloat(br);
    if (!isNaN(pct) && elementWidth) return (pct / 100) * elementWidth;
    return 0;
  }

  const px = parseFloat(br);
  return isNaN(px) ? 0 : px;
}

// Check if element is visually relevant
export function isVisible(style: CSSStyleDeclaration): boolean {
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (parseFloat(style.opacity) === 0) return false;
  return true;
}

// Read opacity
export function readOpacity(style: CSSStyleDeclaration): number {
  return parseFloat(style.opacity) || 1;
}

// Read z-index (default to 0)
export function readZIndex(style: CSSStyleDeclaration): number {
  const z = parseInt(style.zIndex);
  return isNaN(z) ? 0 : z;
}
