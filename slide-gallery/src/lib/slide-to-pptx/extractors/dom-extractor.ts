// ============================================
// DOM Extractor — walks the rendered DOM tree and
// produces a SlideDescriptor (JSON-serializable).
//
// This is the only module that depends on the browser DOM.
// ============================================

import type { SlideDescriptor, SlideElement } from "../types";
import {
  getBounds,
  readBackground,
  readBorder,
  readShadow,
  readCornerRadius,
  isVisible,
  readOpacity,
  readZIndex,
} from "./style-reader";
import { readTextRuns } from "./text-reader";
import { readImage, svgToDataUrl } from "./image-reader";

export interface ExtractOptions {
  includeHidden?: boolean;
  minSize?: number;

  // contentOnly: extract only <img> and text-bearing leaf elements.
  // Pure structural containers (header-area, cards, etc.) are already in the background image.
  contentOnly?: boolean;

  // The window object of the iframe containing the slide.
  // Required when the slide lives in an iframe — ensures getComputedStyle
  // uses the iframe's window rather than the parent's.
  iframeWindow?: Window;
}

// Main entry: extract a SlideDescriptor from a DOM element
export async function extractSlideDescriptor(
  slideRoot: HTMLElement,
  options: ExtractOptions = {}
): Promise<SlideDescriptor> {
  const minSize = options.minSize ?? 2;
  const win = options.iframeWindow ?? window;

  // Freeze animations so we read final visual state
  const styleTag = slideRoot.ownerDocument.createElement("style");
  styleTag.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      opacity: 1 !important;
    }
  `;
  slideRoot.ownerDocument.head.appendChild(styleTag);

  // Remove scale transform so getBoundingClientRect returns true px coordinates
  const originalTransform = slideRoot.style.transform;
  slideRoot.style.transform = "none";
  slideRoot.getBoundingClientRect(); // force reflow

  try {
    const rootStyle = win.getComputedStyle(slideRoot);
    const background = readBackground(rootStyle);

    const elements: SlideElement[] = [];
    await walkElement(slideRoot, slideRoot, elements, minSize, 0, options, win);

    return {
      width: slideRoot.offsetWidth || 1920,
      height: slideRoot.offsetHeight || 1080,
      background,
      elements,
    };
  } finally {
    slideRoot.style.transform = originalTransform;
    styleTag.remove();
  }
}

async function walkElement(
  el: Element,
  slideRoot: HTMLElement,
  elements: SlideElement[],
  minSize: number,
  domOrder: number,
  options: ExtractOptions,
  win: Window
): Promise<number> {
  let order = domOrder;

  for (const child of Array.from(el.children)) {
    const htmlChild = child as HTMLElement;
    const tag = htmlChild.tagName.toLowerCase();

    if (tag === "script" || tag === "style" || tag === "link") continue;

    // ── <img>: extract unconditionally — skip visibility/size checks
    if (tag === "img") {
      const imgEl = htmlChild as HTMLImageElement;
      const imgStyle = win.getComputedStyle(imgEl);
      const rawBounds = getBounds(imgEl, slideRoot);
      // Use natural dimensions scaled to CSS height for correct proportions.
      // getComputedStyle height may be viewport-scaled — prefer naturalHeight-based calculation.
      // The logo CSS is height:20px on a 1920px slide, so the natural h is always reliable.
      let imgH = rawBounds.h;
      let imgW = rawBounds.w;
      if (imgEl.naturalWidth && imgEl.naturalHeight) {
        const renderedH = rawBounds.h > 1 ? rawBounds.h : parseFloat(imgStyle.height) || 20;
        const scale = renderedH / imgEl.naturalHeight;
        imgH = renderedH;
        imgW = imgEl.naturalWidth * scale;
      }
      console.log("[pptx] img", imgEl.src, "rawBounds:", rawBounds, "final:", {imgW, imgH}, "natural:", imgEl.naturalWidth, imgEl.naturalHeight);
      const bounds = { x: rawBounds.x, y: rawBounds.y, w: imgW, h: imgH };
      const image = await readImage(imgEl, win);
      elements.push({
        type: "image",
        bounds,
        image,
        zIndex: readZIndex(imgStyle) || order,
        opacity: readOpacity(imgStyle),
        cornerRadius: readCornerRadius(imgStyle),
      });
      order++;
      continue;
    }

    const style = win.getComputedStyle(htmlChild);

    if (!options.includeHidden && !isVisible(style)) continue;

    const bounds = getBounds(htmlChild, slideRoot);

    if (bounds.w < minSize || bounds.h < minSize) continue;

    if (
      bounds.x + bounds.w < 0 ||
      bounds.y + bounds.h < 0 ||
      bounds.x > 1920 ||
      bounds.y > 1080
    ) continue;

    order++;

    if (options.contentOnly) {
      // ── contentOnly mode ──────────────────────────────────────────────────
      // SVG icons (checkmarks, decorative) are already in background image — skip
      if (tag === "svg") continue;

      // If this element contains any <img> descendants, always recurse so each
      // child gets its own bounds (prevents text boxes overlapping the logo).
      const hasNestedImg = htmlChild.querySelector("img") !== null;
      if (hasNestedImg) {
        if (htmlChild.children.length > 0) {
          order = await walkElement(htmlChild, slideRoot, elements, minSize, order, options, win);
        }
        continue;
      }

      // Check if this is a text leaf: has direct text content and only inline children
      const textRuns = readTextRuns(htmlChild, win);
      const hasDirectText = textRuns.length > 0 && textRuns.some((r) => r.text.trim());

      if (hasDirectText) {
        const background = readBackground(style);
        const cornerRadius = readCornerRadius(style, bounds.w);
        const hasBackground = background.type !== "none";

        // For single-line text elements without a background (plain labels), measure
        // actual rendered text width using canvas so the box doesn't span the full grid cell.
        let w = bounds.w;
        if (!hasBackground && bounds.h <= 32) {
          const measuredW = measureContentWidth(htmlChild, win);
          if (measuredW > 0 && measuredW < bounds.w) {
            w = measuredW;
          }
        }
        const finalBounds = w !== bounds.w ? { ...bounds, w } : bounds;
        console.log("[pptx] text", JSON.stringify(textRuns.map(r => r.text).join("")), "bounds:", finalBounds);

        elements.push({
          type: "text",
          bounds: finalBounds,
          opacity: readOpacity(style),
          zIndex: readZIndex(style) || order,
          text: textRuns,
          background: hasBackground ? background : undefined,
          cornerRadius: cornerRadius > 0 ? cornerRadius : undefined,
        });
        continue;
      }

      // No direct text — recurse into children
      if (htmlChild.children.length > 0) {
        order = await walkElement(htmlChild, slideRoot, elements, minSize, order, options, win);
      }
      continue;
    }

    // ── Full extraction mode ───────────────────────────────────────────────
    if (tag === "svg") {
      const dataUrl = await svgToDataUrl(htmlChild as unknown as SVGElement);
      if (dataUrl) {
        elements.push({
          type: "image",
          bounds,
          image: { src: "inline-svg", dataUrl },
          zIndex: readZIndex(style) || order,
          opacity: readOpacity(style),
        });
      }
      continue;
    }

    const background = readBackground(style);
    const border = readBorder(style);
    const shadow = readShadow(style);
    const cornerRadius = readCornerRadius(style, bounds.w);
    const opacity = readOpacity(style);
    const zIndex = readZIndex(style) || order;
    const textRuns = readTextRuns(htmlChild, win);
    const hasDirectText = textRuns.length > 0 && textRuns.some((r) => r.text.trim());

    const hasVisualProperties =
      background.type !== "none" ||
      border !== undefined ||
      shadow !== undefined ||
      hasDirectText;

    await extractPseudoElement(htmlChild, slideRoot, "::before", elements, order, win);

    if (hasVisualProperties) {
      const isCircle =
        cornerRadius > 0 &&
        Math.abs(bounds.w - bounds.h) < 4 &&
        cornerRadius >= bounds.w / 2 - 2;

      elements.push({
        type: isCircle ? "ellipse" : hasDirectText ? "text" : "rect",
        bounds,
        background: background.type !== "none" ? background : undefined,
        border,
        shadow,
        cornerRadius: isCircle ? undefined : cornerRadius,
        opacity,
        zIndex,
        text: hasDirectText ? textRuns : undefined,
      });
    }

    if (htmlChild.children.length > 0 && !isLeafTextElement(htmlChild, win)) {
      order = await walkElement(htmlChild, slideRoot, elements, minSize, order, options, win);
    }

    await extractPseudoElement(htmlChild, slideRoot, "::after", elements, order, win);
  }

  return order;
}

function isLeafTextElement(el: HTMLElement, win: Window): boolean {
  const blockChildren = Array.from(el.children).filter((child) => {
    const cs = win.getComputedStyle(child);
    const display = cs.display;
    const t = child.tagName.toLowerCase();
    return (
      display !== "inline" &&
      display !== "inline-block" &&
      t !== "span" && t !== "strong" && t !== "em" && t !== "b" && t !== "i" && t !== "a"
    );
  });
  return blockChildren.length === 0 && el.textContent?.trim() !== "";
}

async function extractPseudoElement(
  el: HTMLElement,
  slideRoot: HTMLElement,
  pseudo: "::before" | "::after",
  elements: SlideElement[],
  order: number,
  win: Window
): Promise<void> {
  const style = win.getComputedStyle(el, pseudo);

  const content = style.content;
  if (!content || content === "none" || content === "normal") return;

  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  if (!width || !height || width < 2 || height < 2) return;

  const background = readBackground(style);
  if (background.type === "none") return;

  const parentBounds = getBounds(el, slideRoot);
  const position = style.position;

  let x = parentBounds.x;
  let y = parentBounds.y;

  if (position === "absolute") {
    const top = parseFloat(style.top);
    const right = parseFloat(style.right);
    const bottom = parseFloat(style.bottom);
    const left = parseFloat(style.left);

    if (!isNaN(top)) y = parentBounds.y + top;
    else if (!isNaN(bottom)) y = parentBounds.y + parentBounds.h - bottom - height;

    if (!isNaN(left)) x = parentBounds.x + left;
    else if (!isNaN(right)) x = parentBounds.x + parentBounds.w - right - width;
  }

  const cornerRadius = readCornerRadius(style, width);
  const isCircle =
    cornerRadius > 0 &&
    Math.abs(width - height) < 4 &&
    cornerRadius >= width / 2 - 2;

  elements.push({
    type: isCircle ? "ellipse" : "rect",
    bounds: { x, y, w: width, h: height },
    background,
    cornerRadius: isCircle ? undefined : cornerRadius,
    opacity: parseFloat(style.opacity) || 1,
    zIndex: order,
  });
}

// Measure the actual rendered text width of an element using Canvas measureText.
// This returns the natural text width independent of the container's layout width.
function measureContentWidth(el: HTMLElement, win: Window = window): number {
  try {
    const style = win.getComputedStyle(el);
    const fontSize = style.fontSize;
    const fontWeight = style.fontWeight;
    const fontFamily = style.fontFamily;
    const text = el.textContent || "";
    if (!text.trim()) return 0;

    const canvas = el.ownerDocument.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    const letterSpacing = parseFloat(style.letterSpacing) || 0;
    const measured = ctx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
    return Math.ceil(measured) + 4; // +4px margin so text doesn't clip at edge
  } catch {
    return 0;
  }
}
