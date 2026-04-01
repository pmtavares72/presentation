// ============================================
// CSS color string → PptxGenJS color format
//
// PptxGenJS expects: 6-digit hex without # (e.g. "CE0E2D")
// plus a separate transparency: 0-100 (0=opaque, 100=invisible)
// ============================================

import type { ColorValue } from "../types";

// Parse any CSS color string into our ColorValue
export function parseColor(cssColor: string): ColorValue {
  const trimmed = cssColor.trim();

  if (trimmed === "transparent" || trimmed === "") {
    return { hex: "000000", alpha: 0 };
  }

  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    return { hex: rgbToHex(r, g, b), alpha: a };
  }

  // #RRGGBBAA or #RRGGBB or #RGBA or #RGB
  if (trimmed.startsWith("#")) {
    return parseHexColor(trimmed);
  }

  // Named colors fallback (common ones)
  const named = NAMED_COLORS[trimmed.toLowerCase()];
  if (named) {
    return { hex: named, alpha: 1 };
  }

  return { hex: "000000", alpha: 1 };
}

function parseHexColor(hex: string): ColorValue {
  const h = hex.slice(1);

  if (h.length === 3) {
    // #RGB → #RRGGBB
    const expanded = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { hex: expanded.toUpperCase(), alpha: 1 };
  }

  if (h.length === 4) {
    // #RGBA → #RRGGBBAA
    const expanded = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const alpha = parseInt(h[3] + h[3], 16) / 255;
    return { hex: expanded.toUpperCase(), alpha };
  }

  if (h.length === 6) {
    return { hex: h.toUpperCase(), alpha: 1 };
  }

  if (h.length === 8) {
    const color = h.slice(0, 6);
    const alpha = parseInt(h.slice(6), 16) / 255;
    return { hex: color.toUpperCase(), alpha };
  }

  return { hex: "000000", alpha: 1 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// PptxGenJS transparency: 0 = opaque, 100 = invisible
export function alphaToTransparency(alpha: number): number {
  return Math.round((1 - alpha) * 100);
}

// Convert ColorValue to PptxGenJS format string
export function toPptxColor(color: ColorValue): string {
  return color.hex;
}

const NAMED_COLORS: Record<string, string> = {
  white: "FFFFFF",
  black: "000000",
  red: "FF0000",
  green: "008000",
  blue: "0000FF",
  gray: "808080",
  grey: "808080",
};
