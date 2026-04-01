// ============================================
// Unit conversion: CSS px → PowerPoint inches/points
//
// LAYOUT_WIDE = 13.333 × 7.5 inches
// Slide HTML  = 1920 × 1080 px
// ============================================

const DEFAULT_SLIDE_PX_WIDTH = 1920;
const DEFAULT_SLIDE_PX_HEIGHT = 1080;
const DEFAULT_PPTX_WIDTH_IN = 13.333;
const DEFAULT_PPTX_HEIGHT_IN = 7.5;

let scaleX = DEFAULT_PPTX_WIDTH_IN / DEFAULT_SLIDE_PX_WIDTH;
let scaleY = DEFAULT_PPTX_HEIGHT_IN / DEFAULT_SLIDE_PX_HEIGHT;

export function setSlideScale(
  pxWidth: number,
  pxHeight: number,
  inchWidth: number = DEFAULT_PPTX_WIDTH_IN,
  inchHeight: number = DEFAULT_PPTX_HEIGHT_IN
) {
  scaleX = inchWidth / pxWidth;
  scaleY = inchHeight / pxHeight;
}

export function pxToInchesX(px: number): number {
  return +(px * scaleX).toFixed(4);
}

export function pxToInchesY(px: number): number {
  return +(px * scaleY).toFixed(4);
}

export function pxToInchesW(px: number): number {
  return +(px * scaleX).toFixed(4);
}

export function pxToInchesH(px: number): number {
  return +(px * scaleY).toFixed(4);
}

// CSS px → PowerPoint points (1pt = 1/72 inch, 1px = 1/96 inch)
// For general use (border widths, shadow offsets, etc.)
export function pxToPoints(px: number): number {
  return +(px * 0.75).toFixed(2);
}

// Font size: slide layout px → PowerPoint points
// The slide is designed at 1920px wide = 13.333 inches wide.
// A font at N px in slide layout coordinates occupies N×(13.333/1920) inches,
// which is N×(13.333/1920)×72 points.
// Minimum of 6pt — preserves relative size differences between small labels.
export function fontPxToPoints(px: number): number {
  return Math.max(6, +(px * scaleX * 72).toFixed(2));
}

// CSS px → PowerPoint EMU for fine shadow/offset control
// 1 inch = 914400 EMU, 1 px = 914400/96 = 9525 EMU
export function pxToEmu(px: number): number {
  return Math.round(px * 9525);
}
