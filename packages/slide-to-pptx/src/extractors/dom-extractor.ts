// ============================================
// DOM Extractor — walks the rendered DOM tree and
// produces a SlideDescriptor (JSON-serializable).
//
// This is the only module that depends on the browser DOM.
// ============================================

import type { SlideDescriptor, SlideElement, BackgroundDescriptor } from "../types";
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
  minSize?: number; // skip elements smaller than this (px), default 2
}

// Main entry: extract a SlideDescriptor from a DOM element
export async function extractSlideDescriptor(
  slideRoot: HTMLElement,
  options: ExtractOptions = {}
): Promise<SlideDescriptor> {
  const minSize = options.minSize ?? 2;

  // Temporarily disable animations so we get final visual state
  const styleTag = slideRoot.ownerDocument.createElement("style");
  styleTag.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      opacity: 1 !important;
    }
  `;
  slideRoot.ownerDocument.head.appendChild(styleTag);

  // Temporarily remove slide scale transform to get true coordinates
  const originalTransform = slideRoot.style.transform;
  slideRoot.style.transform = "none";

  // Force a reflow so computed styles update
  slideRoot.getBoundingClientRect();

  try {
    const rootStyle = getComputedStyle(slideRoot);
    const background = readBackground(rootStyle);

    const elements: SlideElement[] = [];
    await walkElement(slideRoot, slideRoot, elements, minSize, 0, options);

    return {
      width: slideRoot.offsetWidth || 1920,
      height: slideRoot.offsetHeight || 1080,
      background,
      elements,
    };
  } finally {
    // Restore original state
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
  options: ExtractOptions
): Promise<number> {
  let order = domOrder;

  for (const child of Array.from(el.children)) {
    const htmlChild = child as HTMLElement;
    const style = getComputedStyle(htmlChild);

    // Skip invisible elements
    if (!options.includeHidden && !isVisible(style)) {
      continue;
    }

    const bounds = getBounds(htmlChild, slideRoot);

    // Skip tiny elements
    if (bounds.w < minSize || bounds.h < minSize) {
      continue;
    }

    // Skip elements entirely outside the slide
    if (
      bounds.x + bounds.w < 0 ||
      bounds.y + bounds.h < 0 ||
      bounds.x > 1920 ||
      bounds.y > 1080
    ) {
      continue;
    }

    order++;
    const tag = htmlChild.tagName.toLowerCase();

    // Handle <img> elements
    if (tag === "img") {
      const image = await readImage(htmlChild as HTMLImageElement);
      elements.push({
        type: "image",
        bounds,
        image,
        zIndex: readZIndex(style) || order,
        opacity: readOpacity(style),
        cornerRadius: readCornerRadius(style),
      });
      continue;
    }

    // Handle inline <svg> elements
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

    // Skip <script>, <style>, <link>
    if (tag === "script" || tag === "style" || tag === "link") continue;

    // Extract this element's visual properties
    const background = readBackground(style);
    const border = readBorder(style);
    const shadow = readShadow(style);
    const cornerRadius = readCornerRadius(style, bounds.w);
    const opacity = readOpacity(style);
    const zIndex = readZIndex(style) || order;

    // Determine if this element has direct text content
    const textRuns = readTextRuns(htmlChild);
    const hasDirectText = textRuns.length > 0 && textRuns.some((r) => r.text.trim());

    // Determine if this element is visually significant (has bg, border, shadow, or text)
    const hasVisualProperties =
      background.type !== "none" ||
      border !== undefined ||
      shadow !== undefined ||
      hasDirectText;

    // Extract pseudo-elements (::before, ::after)
    await extractPseudoElement(
      htmlChild,
      slideRoot,
      "::before",
      elements,
      order
    );

    // If this element has visual properties, add it
    if (hasVisualProperties) {
      const isCircle =
        cornerRadius > 0 &&
        Math.abs(bounds.w - bounds.h) < 4 &&
        cornerRadius >= bounds.w / 2 - 2;

      const element: SlideElement = {
        type: isCircle ? "ellipse" : hasDirectText ? "text" : "rect",
        bounds,
        background: background.type !== "none" ? background : undefined,
        border,
        shadow,
        cornerRadius: isCircle ? undefined : cornerRadius,
        opacity,
        zIndex,
        text: hasDirectText ? textRuns : undefined,
      };

      elements.push(element);
    }

    // Recurse into children (but not for text-only elements — those are leaf nodes)
    if (htmlChild.children.length > 0 && !isLeafTextElement(htmlChild, style)) {
      order = await walkElement(
        htmlChild,
        slideRoot,
        elements,
        minSize,
        order,
        options
      );
    }

    // Extract ::after pseudo-element
    await extractPseudoElement(
      htmlChild,
      slideRoot,
      "::after",
      elements,
      order
    );
  }

  return order;
}

// Check if this element is a leaf text node (no meaningful children beyond inline text)
function isLeafTextElement(
  el: HTMLElement,
  style: CSSStyleDeclaration
): boolean {
  // If all children are inline text elements, treat as leaf
  const blockChildren = Array.from(el.children).filter((child) => {
    const cs = getComputedStyle(child);
    const display = cs.display;
    return (
      display !== "inline" &&
      display !== "inline-block" &&
      child.tagName.toLowerCase() !== "span" &&
      child.tagName.toLowerCase() !== "strong" &&
      child.tagName.toLowerCase() !== "em" &&
      child.tagName.toLowerCase() !== "b" &&
      child.tagName.toLowerCase() !== "i" &&
      child.tagName.toLowerCase() !== "a"
    );
  });
  return blockChildren.length === 0 && el.textContent?.trim() !== "";
}

// Extract a pseudo-element (::before or ::after) as a shape
async function extractPseudoElement(
  el: HTMLElement,
  slideRoot: HTMLElement,
  pseudo: "::before" | "::after",
  elements: SlideElement[],
  order: number
): Promise<void> {
  const style = getComputedStyle(el, pseudo);

  // Pseudo-elements only exist if they have content
  const content = style.content;
  if (!content || content === "none" || content === "normal") return;

  // Read dimensions — pseudo-elements may have explicit width/height
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  if (!width || !height || width < 2 || height < 2) return;

  const background = readBackground(style);
  if (background.type === "none") return;

  // Compute position relative to the parent element
  const parentBounds = getBounds(el, slideRoot);
  const position = style.position;

  let x = parentBounds.x;
  let y = parentBounds.y;

  // Handle absolute positioning from computed values
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

  // Clip to parent bounds if parent has overflow: hidden
  // (the browser clips pseudo-elements to the parent's box — PPTX doesn't, so we do it manually)
  const parentStyle = getComputedStyle(el);
  const parentOverflow = parentStyle.overflow;
  const parentOverflowX = parentStyle.overflowX;
  const parentOverflowY = parentStyle.overflowY;
  const clipsOverflow =
    parentOverflow === "hidden" ||
    parentOverflow === "clip" ||
    parentOverflowX === "hidden" ||
    parentOverflowY === "hidden";

  let finalX = x;
  let finalY = y;
  let finalW = width;
  let finalH = height;

  if (clipsOverflow) {
    // Intersect pseudo-element bounds with parent bounds
    const clipX1 = parentBounds.x;
    const clipY1 = parentBounds.y;
    const clipX2 = parentBounds.x + parentBounds.w;
    const clipY2 = parentBounds.y + parentBounds.h;

    const elX2 = x + width;
    const elY2 = y + height;

    finalX = Math.max(x, clipX1);
    finalY = Math.max(y, clipY1);
    finalW = Math.min(elX2, clipX2) - finalX;
    finalH = Math.min(elY2, clipY2) - finalY;

    // If clipped to nothing, skip
    if (finalW <= 0 || finalH <= 0) return;
  }

  const cornerRadius = readCornerRadius(style, width);
  const isCircle =
    cornerRadius > 0 &&
    Math.abs(width - height) < 4 &&
    cornerRadius >= width / 2 - 2;

  elements.push({
    type: isCircle ? "ellipse" : "rect",
    bounds: { x: finalX, y: finalY, w: finalW, h: finalH },
    background,
    // For clipped circles, use rect instead since the shape is now partial
    cornerRadius: isCircle && (finalW < width || finalH < height)
      ? Math.min(finalW, finalH) / 2  // keep as much roundness as fits
      : isCircle ? undefined : cornerRadius,
    opacity: parseFloat(style.opacity) || 1,
    zIndex: order,
  });
}
