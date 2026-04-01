// ============================================
// Extract rich text runs from DOM elements
// ============================================

import type { TextRun, TextStyle } from "../types";
import { parseColor } from "../generators/color-mapper";

// Extract text runs from an element, preserving per-span styling
export function readTextRuns(el: Element): TextRun[] {
  const runs: TextRun[] = [];
  walkTextNodes(el, runs);
  return runs;
}

function walkTextNodes(node: Node, runs: TextRun[]) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text.trim() === "") continue;

      // Get style from the parent element
      const parentEl = child.parentElement;
      if (!parentEl) continue;

      const style = getComputedStyle(parentEl);
      runs.push({
        text,
        style: readTextStyle(style),
      });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      // Skip non-text child elements (images, svgs, etc.)
      if (tag === "img" || tag === "svg" || tag === "iframe") continue;

      // For inline elements (span, strong, em, a), extract their text with their styles
      const display = getComputedStyle(el).display;
      if (
        display === "inline" ||
        display === "inline-block" ||
        tag === "span" ||
        tag === "strong" ||
        tag === "em" ||
        tag === "b" ||
        tag === "i" ||
        tag === "a"
      ) {
        walkTextNodes(child, runs);
      }
      // For block-level children, skip — they'll be extracted as separate elements
    }
  }
}

export function readTextStyle(style: CSSStyleDeclaration): TextStyle {
  return {
    fontFamily: cleanFontFamily(style.fontFamily),
    fontSize: parseFloat(style.fontSize) || 16,
    fontWeight: parseFontWeight(style.fontWeight),
    color: parseColor(style.color),
    italic: style.fontStyle === "italic",
    underline: style.textDecorationLine.includes("underline"),
    letterSpacing: parseFloat(style.letterSpacing) || 0,
    lineHeight: parseLineHeight(style.lineHeight, style.fontSize),
    textTransform: parseTextTransform(style.textTransform),
    textAlign: parseTextAlign(style.textAlign),
  };
}

function cleanFontFamily(ff: string): string {
  // getComputedStyle returns quoted families: "'Poppins', sans-serif"
  // Extract the first family name, unquoted
  const first = ff.split(",")[0].trim();
  return first.replace(/['"]/g, "");
}

function parseFontWeight(weight: string): number {
  const num = parseInt(weight);
  if (!isNaN(num)) return num;

  // Keywords
  const keywords: Record<string, number> = {
    normal: 400,
    bold: 700,
    lighter: 300,
    bolder: 700,
  };
  return keywords[weight] || 400;
}

function parseLineHeight(lh: string, fontSize: string): number {
  if (lh === "normal") return 1.2;
  const lhPx = parseFloat(lh);
  const fsPx = parseFloat(fontSize);
  if (lhPx && fsPx) return +(lhPx / fsPx).toFixed(2);
  return 1.2;
}

function parseTextTransform(
  tt: string
): "none" | "uppercase" | "lowercase" | "capitalize" {
  if (
    tt === "uppercase" ||
    tt === "lowercase" ||
    tt === "capitalize"
  )
    return tt;
  return "none";
}

function parseTextAlign(
  ta: string
): "left" | "center" | "right" | "justify" {
  if (ta === "center" || ta === "right" || ta === "justify") return ta;
  return "left";
}
