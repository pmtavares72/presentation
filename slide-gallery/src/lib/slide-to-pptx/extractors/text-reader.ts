// ============================================
// Extract rich text runs from DOM elements
// ============================================

import type { TextRun, TextStyle } from "../types";
import { parseColor } from "../generators/color-mapper";

// Extract text runs from an element, preserving per-span styling
export function readTextRuns(el: Element, win: Window = window): TextRun[] {
  const runs: TextRun[] = [];
  walkTextNodes(el, runs, win);
  return runs;
}

function walkTextNodes(node: Node, runs: TextRun[], win: Window) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      // Collapse whitespace: browsers ignore leading/trailing whitespace in HTML text nodes.
      // We must do the same — otherwise indentation becomes literal spaces in PPTX.
      const text = (child.textContent || "").replace(/\s+/g, " ").trim();
      if (text === "") continue;

      const parentEl = child.parentElement;
      if (!parentEl) continue;

      // Add a separator space between sibling inline elements that are flex children
      // (CSS gap on flex containers doesn't translate to text spacing)
      if (runs.length > 0) {
        const last = runs[runs.length - 1];
        if (!last.text.endsWith(" ")) {
          runs.push({ text: " ", style: last.style });
        }
      }

      const style = win.getComputedStyle(parentEl);
      runs.push({ text, style: readTextStyle(style) });

    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === "img" || tag === "svg" || tag === "iframe") continue;

      const display = win.getComputedStyle(el).display;
      if (
        display === "inline" ||
        display === "inline-block" ||
        tag === "span" || tag === "strong" || tag === "em" ||
        tag === "b" || tag === "i" || tag === "a"
      ) {
        walkTextNodes(child, runs, win);
      }
    }
  }
}

export function readTextStyle(style: CSSStyleDeclaration): TextStyle {
  return {
    fontFamily: cleanFontFamily(style.fontFamily),
    fontSize: parseFloat(style.fontSize) || 16,   // raw px — generator scales to pt
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
  const first = ff.split(",")[0].trim();
  return first.replace(/['"]/g, "");
}

function parseFontWeight(weight: string): number {
  const num = parseInt(weight);
  if (!isNaN(num)) return num;
  const keywords: Record<string, number> = { normal: 400, bold: 700, lighter: 300, bolder: 700 };
  return keywords[weight] || 400;
}

function parseLineHeight(lh: string, fontSize: string): number {
  if (lh === "normal") return 1.2;
  const lhPx = parseFloat(lh);
  const fsPx = parseFloat(fontSize);
  if (lhPx && fsPx) return +(lhPx / fsPx).toFixed(2);
  return 1.2;
}

function parseTextTransform(tt: string): "none" | "uppercase" | "lowercase" | "capitalize" {
  if (tt === "uppercase" || tt === "lowercase" || tt === "capitalize") return tt;
  return "none";
}

function parseTextAlign(ta: string): "left" | "center" | "right" | "justify" {
  if (ta === "center" || ta === "right" || ta === "justify") return ta;
  return "left";
}
