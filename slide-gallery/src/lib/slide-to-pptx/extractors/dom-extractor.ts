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

      // If this is a flex/grid container with multiple direct children that each have
      // their own styling (e.g. tech-bar with chip spans), recurse rather than treating
      // the whole container as one text element.
      const containerDisplay = style.display;
      const isMultiChildContainer = (containerDisplay === "flex" || containerDisplay === "grid" || containerDisplay === "inline-flex")
        && htmlChild.children.length > 2;
      if (isMultiChildContainer) {
        const bgContainer = readBackground(style);
        if (bgContainer.type !== "none") {
          const cr = readCornerRadius(style, bounds.w);
          elements.push({
            type: "rect",
            bounds,
            background: bgContainer,
            cornerRadius: cr > 0 ? cr : undefined,
            opacity: readOpacity(style),
            zIndex: readZIndex(style) || order,
          });
        }
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

        // If this element has a direct SVG child (e.g. icon in a pill):
        // 1. Emit the pill background as a rect at the full bounds
        // 2. Emit the SVG as an image at its true position
        // 3. Emit the text box offset past the icon (no background on text element)
        // If this background container has multiple direct span children (e.g. stat-box
        // with a number span + label span), emit background rect + each child separately.
        const directSpans = Array.from(htmlChild.querySelectorAll(":scope > span"));
        if (directSpans.length >= 2 && hasBackground) {
          const zIdx = readZIndex(style) || order;
          const rootRect = slideRoot.getBoundingClientRect();

          // Use getBoundingClientRect for the container too — consistent coordinate system
          const containerRect = htmlChild.getBoundingClientRect();
          const containerBounds = {
            x: containerRect.left - rootRect.left,
            y: containerRect.top - rootRect.top,
            w: containerRect.width,
            h: containerRect.height,
          };

          // Background rect covering full element
          elements.push({
            type: "rect",
            bounds: containerBounds,
            background,
            cornerRadius: cornerRadius > 0 ? cornerRadius : undefined,
            opacity: readOpacity(style),
            zIndex: zIdx,
          });

          // Each span as its own text element
          const paddingRight = parseFloat(win.getComputedStyle(htmlChild).paddingRight) || 0;
          for (const span of directSpans) {
            const spanEl = span as HTMLElement;
            const spanStyle = win.getComputedStyle(spanEl);
            const spanRuns = readTextRuns(spanEl, win);
            if (!spanRuns.some(r => r.text.trim())) continue;

            const spanRect = spanEl.getBoundingClientRect();
            const spanX = spanRect.left - rootRect.left;
            // Width: from span's left to container right edge
            const spanW = (containerBounds.x + containerBounds.w) - spanX;
            const isMultiLine = spanEl.querySelector("br") !== null;
            // Bypass the 8pt font floor for small spans — use true px→pt so the text
            // fits within the natural container width without inflation.
            const rawFontPt = parseFloat(spanStyle.fontSize) * (13.333 / 1920) * 72;
            console.log("[pptx] span", JSON.stringify(spanRuns.map(r=>r.text).join("")), "x:", spanX, "w:", spanW, "fontSize:", rawFontPt.toFixed(2)+"pt");
            elements.push({
              type: "text",
              bounds: { x: spanX, y: containerBounds.y, w: spanW, h: containerBounds.h },
              opacity: readOpacity(style),
              zIndex: zIdx + 1,
              text: spanRuns,
              valign: "middle",
              align: (["center","right","justify"].includes(spanStyle.textAlign) ? spanStyle.textAlign : "left") as "left"|"center"|"right"|"justify",
              lineHeightOverride: isMultiLine ? 1.0 : undefined,
              fontSizeOverridePt: +rawFontPt.toFixed(2),
            });
          }
          continue;
        }

        // Check for a leading icon element: direct child SVG, or a direct child span/div
        // that contains an SVG (checkmark circle) or is an empty background dot.
        // Pattern: <li><span class="obj-check"><svg/></span>text</li>
        //       or <li><span class="benefit-dot"></span>text</li>
        //       or <div><svg/>text</div> (icon+text pill)
        const rootRect = slideRoot.getBoundingClientRect();
        const svgChild = htmlChild.querySelector(":scope > svg") as SVGElement | null;
        const iconSpan = !svgChild
          ? (Array.from(htmlChild.children).find(c => {
              const t = c.tagName.toLowerCase();
              return (t === "span" || t === "div") && (c.querySelector("svg") !== null || (c as HTMLElement).textContent?.trim() === "");
            }) as HTMLElement | undefined) ?? null
          : null;

        const iconEl = svgChild ?? iconSpan;
        if (iconEl) {
          const zIdx = readZIndex(style) || order;
          const iconRect = iconEl.getBoundingClientRect();
          const gapPx = parseFloat(win.getComputedStyle(htmlChild).gap) || 8;

          if (hasBackground) {
            // Emit pill/container background rect
            elements.push({
              type: "rect",
              bounds,
              background,
              cornerRadius: cornerRadius > 0 ? cornerRadius : undefined,
              opacity: readOpacity(style),
              zIndex: zIdx,
            });
          }

          // Emit icon: SVG as image, or empty background span as ellipse/rect
          if (svgChild) {
            const paddingLeft = parseFloat(win.getComputedStyle(htmlChild).paddingLeft) || 0;
            const svgBounds = {
              x: bounds.x + paddingLeft,
              y: iconRect.top - rootRect.top,
              w: iconRect.width,
              h: iconRect.height,
            };
            const dataUrl = await svgToDataUrl(svgChild, slideRoot.ownerDocument);
            if (dataUrl && svgBounds.w > 0) {
              elements.push({
                type: "image",
                bounds: svgBounds,
                image: { src: "inline-svg", dataUrl },
                zIndex: zIdx + 1,
                opacity: readOpacity(style),
              });
            }
          } else if (iconSpan) {
            const iconStyle = win.getComputedStyle(iconSpan);
            const iconBg = readBackground(iconStyle);
            const iconCr = readCornerRadius(iconStyle, iconRect.width);
            if (iconBg.type !== "none") {
              const isCircle = iconCr >= iconRect.width / 2 - 2;
              elements.push({
                type: isCircle ? "ellipse" : "rect",
                bounds: {
                  x: iconRect.left - rootRect.left,
                  y: iconRect.top - rootRect.top,
                  w: iconRect.width,
                  h: iconRect.height,
                },
                background: iconBg,
                opacity: readOpacity(iconStyle),
                zIndex: zIdx + 1,
              });
              // If the icon span itself contains an SVG, render it too
              const innerSvg = iconSpan.querySelector("svg") as SVGElement | null;
              if (innerSvg) {
                const innerRect = innerSvg.getBoundingClientRect();
                const innerDataUrl = await svgToDataUrl(innerSvg, slideRoot.ownerDocument);
                if (innerDataUrl && innerRect.width > 0) {
                  elements.push({
                    type: "image",
                    bounds: {
                      x: innerRect.left - rootRect.left,
                      y: innerRect.top - rootRect.top,
                      w: innerRect.width,
                      h: innerRect.height,
                    },
                    image: { src: "inline-svg", dataUrl: innerDataUrl },
                    zIndex: zIdx + 2,
                    opacity: readOpacity(style),
                  });
                }
              }
            }
          }

          // Text box starts after icon + gap.
          // For pills (hasBackground): center text vertically in the box.
          // For list items (no background): position the box so line 1 aligns with the
          // icon center, then text flows downward. Use valign:top so wrapped lines go down.
          const textX = iconRect.right - rootRect.left + gapPx;
          const maxW = bounds.x + bounds.w - textX;
          // For single-line list items, measure actual text width so box isn't wider than needed
          const measuredW = !hasBackground ? measureContentWidth(htmlChild, win) : 0;
          const textW = (!hasBackground && measuredW > 0 && measuredW < maxW) ? measuredW : maxW;
          const rawFontPt = parseFloat(style.fontSize) * (13.333 / 1920) * 72;
          // Estimate line height in px to offset y so line 1 top aligns with icon center
          const lineHeightPx = parseFloat(style.lineHeight) || bounds.h;
          const iconCenterY = iconRect.top - rootRect.top + iconRect.height / 2;
          const textY = hasBackground ? bounds.y : iconCenterY - lineHeightPx / 2;
          const textH = bounds.h;
          elements.push({
            type: "text",
            bounds: { x: textX, y: textY, w: textW, h: textH },
            opacity: readOpacity(style),
            zIndex: zIdx + 1,
            text: textRuns,
            valign: hasBackground ? "middle" : "top",
            align: "left",
            fontSizeOverridePt: rawFontPt < 8 ? +rawFontPt.toFixed(2) : undefined,
            lineHeightOverride: !hasBackground ? 1.1 : undefined,
          });
          continue;
        }

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

      // No direct text — emit background rect if visible, then recurse
      const bgNoText = readBackground(style);
      if (bgNoText.type !== "none") {
        const cr = readCornerRadius(style, bounds.w);
        const shadow = readShadow(style);
        elements.push({
          type: "rect",
          bounds,
          background: bgNoText,
          cornerRadius: cr > 0 ? cr : undefined,
          shadow,
          opacity: readOpacity(style),
          zIndex: readZIndex(style) || order,
        });
      }
      if (htmlChild.children.length > 0) {
        order = await walkElement(htmlChild, slideRoot, elements, minSize, order, options, win);
      }
      continue;
    }

    // ── Full extraction mode ───────────────────────────────────────────────
    if (tag === "svg") {
      const dataUrl = await svgToDataUrl(htmlChild as unknown as SVGElement, slideRoot.ownerDocument);
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
