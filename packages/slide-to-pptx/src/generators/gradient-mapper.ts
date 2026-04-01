// ============================================
// CSS gradient string → PptxGenJS gradient fill
//
// Parses computed `background-image` values like:
//   linear-gradient(135deg, rgba(255,255,255,0.92) 0%, ...)
// into PptxGenJS fill objects.
// ============================================

import type { GradientDescriptor, GradientStop, ColorValue } from "../types";
import { parseColor, alphaToTransparency } from "./color-mapper";

// Parse a CSS linear-gradient string into our GradientDescriptor
export function parseLinearGradient(
  cssGradient: string
): GradientDescriptor | null {
  const match = cssGradient.match(/linear-gradient\((.+)\)/);
  if (!match) return null;

  const inner = match[1];

  // Split respecting parentheses (rgba values contain commas)
  const parts = splitGradientArgs(inner);
  if (parts.length < 2) return null;

  let angle = 180; // default: "to bottom"
  let colorStart = 0;

  // First part might be an angle or direction
  const firstPart = parts[0].trim();
  const angleParsed = parseAngleOrDirection(firstPart);
  if (angleParsed !== null) {
    angle = angleParsed;
    colorStart = 1;
  }

  const stops: GradientStop[] = [];
  for (let i = colorStart; i < parts.length; i++) {
    const stop = parseGradientStop(parts[i].trim());
    if (stop) stops.push(stop);
  }

  if (stops.length < 2) return null;

  return { direction: "linear", angle, stops };
}

// Parse a CSS radial-gradient string
export function parseRadialGradient(
  cssGradient: string
): GradientDescriptor | null {
  const match = cssGradient.match(/radial-gradient\((.+)\)/);
  if (!match) return null;

  const inner = match[1];
  const parts = splitGradientArgs(inner);

  // Skip shape/size declaration, find color stops
  const stops: GradientStop[] = [];
  for (const part of parts) {
    const stop = parseGradientStop(part.trim());
    if (stop) stops.push(stop);
  }

  if (stops.length < 2) return null;

  return { direction: "radial", stops };
}

// Parse any CSS gradient string
export function parseGradient(css: string): GradientDescriptor | null {
  const trimmed = css.trim();
  if (trimmed.startsWith("linear-gradient")) return parseLinearGradient(trimmed);
  if (trimmed.startsWith("radial-gradient")) return parseRadialGradient(trimmed);
  return null;
}

// Convert CSS angle convention to PptxGenJS angle
// CSS: 0deg = to top, 90deg = to right (clockwise from top)
// PptxGenJS: rotation angle in degrees, same convention
export function cssToPptxAngle(cssAngle: number): number {
  return cssAngle;
}

// Convert GradientDescriptor to PptxGenJS fill object
export function toPptxGradientFill(gradient: GradientDescriptor): object {
  // PptxGenJS supports linear gradients with color stops
  // Format: { type: 'gradient', ... }
  const stops = gradient.stops.map((stop) => ({
    color: stop.color.hex,
    position: stop.position,
    transparency: alphaToTransparency(stop.color.alpha),
  }));

  if (gradient.direction === "linear") {
    return {
      type: "gradient" as const,
      gradientType: "linear" as const,
      rotate: gradient.angle || 0,
      stops,
    };
  }

  // Radial — PptxGenJS has limited radial support, approximate as "path" gradient
  return {
    type: "gradient" as const,
    gradientType: "radial" as const,
    stops,
  };
}

// ---- Internal helpers ----

function splitGradientArgs(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of str) {
    if (char === "(") depth++;
    else if (char === ")") depth--;

    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseAngleOrDirection(str: string): number | null {
  // Numeric angle: "135deg"
  const degMatch = str.match(/^([\d.]+)deg$/);
  if (degMatch) return parseFloat(degMatch[1]);

  // Keyword directions
  const directions: Record<string, number> = {
    "to top": 0,
    "to top right": 45,
    "to right": 90,
    "to bottom right": 135,
    "to bottom": 180,
    "to bottom left": 225,
    "to left": 270,
    "to top left": 315,
  };

  return directions[str] ?? null;
}

function parseGradientStop(str: string): GradientStop | null {
  // Match: "rgba(255,255,255,0.92) 0%" or "#CE0E2D 50%" or "transparent 100%"
  const posMatch = str.match(/([\d.]+)%\s*$/);
  const position = posMatch ? parseFloat(posMatch[1]) : 0;

  // Remove position from the string to get the color
  const colorStr = posMatch ? str.slice(0, posMatch.index).trim() : str.trim();
  if (!colorStr) return null;

  const color = parseColor(colorStr);
  return { color, position };
}
