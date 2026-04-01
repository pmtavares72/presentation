// ============================================
// PptxGenJS Generator
//
// Takes a SlideDescriptor and produces a PptxGenJS
// presentation with native, editable shapes and text.
// No DOM dependency — pure data transformation.
// ============================================

import type PptxGenJS from "pptxgenjs";
import type {
  SlideDescriptor,
  SlideElement,
  BackgroundDescriptor,
  TextRun,
  ShadowDescriptor,
  ExportOptions,
} from "../types";
import {
  pxToInchesX,
  pxToInchesY,
  pxToInchesW,
  pxToInchesH,
  pxToPoints,
  fontPxToPoints,
  setSlideScale,
} from "./unit-converter";
import { toPptxColor, alphaToTransparency } from "./color-mapper";
import { toPptxGradientFill } from "./gradient-mapper";

export async function generatePptx(
  descriptor: SlideDescriptor,
  pptxLib: typeof PptxGenJS,
  options: ExportOptions = {}
): Promise<PptxGenJS> {
  const slideWidthIn = options.slideWidth ?? 13.333;
  const slideHeightIn = options.slideHeight ?? 7.5;

  setSlideScale(descriptor.width, descriptor.height, slideWidthIn, slideHeightIn);

  const pres = new pptxLib();
  pres.layout = "LAYOUT_WIDE";

  const slide = pres.addSlide();

  // If a rasterized background image is provided, use it instead of CSS reconstruction
  if (options.backgroundImageData) {
    slide.background = { data: options.backgroundImageData };
  } else {
    applySlideBackground(slide, descriptor.background);
  }

  // Sort elements by z-index (paint order)
  const sorted = [...descriptor.elements].sort((a, b) => a.zIndex - b.zIndex);

  // Render each element
  for (const element of sorted) {
    renderElement(slide, element);
  }

  return pres;
}

function applySlideBackground(
  slide: PptxGenJS.Slide,
  bg: BackgroundDescriptor
): void {
  if (bg.type === "solid") {
    slide.background = {
      color: toPptxColor(bg.color),
      transparency: alphaToTransparency(bg.color.alpha),
    };
  } else if (bg.type === "gradient") {
    // PptxGenJS slide background doesn't support gradient directly,
    // so add a full-slide shape with the gradient fill
    // This will be handled by a rect element covering the full slide
  }
}

function renderElement(slide: PptxGenJS.Slide, el: SlideElement): void {
  switch (el.type) {
    case "text":
      renderText(slide, el);
      break;
    case "rect":
      renderRect(slide, el);
      break;
    case "ellipse":
      renderEllipse(slide, el);
      break;
    case "image":
      renderImage(slide, el);
      break;
    case "group":
      // Render children individually (PptxGenJS doesn't have native groups in the simple API)
      if (el.children) {
        for (const child of el.children) {
          renderElement(slide, child);
        }
      }
      break;
  }
}

function renderText(slide: PptxGenJS.Slide, el: SlideElement): void {
  if (!el.text || el.text.length === 0) return;

  const textRuns = el.text.map(mapTextRun);
  const firstStyle = el.text[0].style;

  // For single-line text (height ≤ 30px in slide px), extend width generously
  // and disable wrap to prevent text overflowing a too-narrow bounding box.
  const isSingleLine = el.bounds.h <= 30;
  const w = isSingleLine
    ? Math.max(el.bounds.w, el.bounds.w * 3)  // triple the width as safety margin
    : el.bounds.w;

  const opts: Record<string, unknown> = {
    x: pxToInchesX(el.bounds.x),
    y: pxToInchesY(el.bounds.y),
    w: pxToInchesW(w),
    h: pxToInchesH(el.bounds.h),
    valign: "middle",
    align: firstStyle.textAlign,
    margin: 0,
    wrap: !isSingleLine,
  };

  // Background fill
  applyFill(opts, el.background);

  // Corner radius for rounded text boxes
  if (el.cornerRadius && el.cornerRadius > 0) {
    opts.rectRadius = pxToInchesW(el.cornerRadius);
    opts.shape = "roundRect";
  }

  // Shadow
  if (el.shadow) {
    opts.shadow = mapShadow(el.shadow);
  }

  // Transparency from opacity
  if (el.opacity !== undefined && el.opacity < 1) {
    opts.transparency = alphaToTransparency(el.opacity);
  }

  slide.addText(textRuns as PptxGenJS.TextProps[], opts as PptxGenJS.TextPropsOptions);
}

function renderRect(slide: PptxGenJS.Slide, el: SlideElement): void {
  const isRounded = el.cornerRadius && el.cornerRadius > 0;

  const opts: Record<string, unknown> = {
    x: pxToInchesX(el.bounds.x),
    y: pxToInchesY(el.bounds.y),
    w: pxToInchesW(el.bounds.w),
    h: pxToInchesH(el.bounds.h),
  };

  applyFill(opts, el.background);

  if (isRounded) {
    opts.rectRadius = pxToInchesW(el.cornerRadius!);
  }

  if (el.border && el.border.width > 0) {
    opts.line = {
      color: toPptxColor(el.border.color),
      width: pxToPoints(el.border.width),
      transparency: alphaToTransparency(el.border.color.alpha),
    };
  }

  if (el.shadow) {
    opts.shadow = mapShadow(el.shadow);
  }

  if (el.opacity !== undefined && el.opacity < 1) {
    opts.transparency = alphaToTransparency(el.opacity);
  }

  slide.addShape(
    isRounded ? "roundRect" : "rect",
    opts as PptxGenJS.ShapeProps
  );
}

function renderEllipse(slide: PptxGenJS.Slide, el: SlideElement): void {
  const opts: Record<string, unknown> = {
    x: pxToInchesX(el.bounds.x),
    y: pxToInchesY(el.bounds.y),
    w: pxToInchesW(el.bounds.w),
    h: pxToInchesH(el.bounds.h),
  };

  applyFill(opts, el.background);

  if (el.shadow) {
    opts.shadow = mapShadow(el.shadow);
  }

  if (el.opacity !== undefined && el.opacity < 1) {
    opts.transparency = alphaToTransparency(el.opacity);
  }

  slide.addShape("ellipse", opts as PptxGenJS.ShapeProps);
}

function renderImage(slide: PptxGenJS.Slide, el: SlideElement): void {
  if (!el.image) return;

  const opts: Record<string, unknown> = {
    x: pxToInchesX(el.bounds.x),
    y: pxToInchesY(el.bounds.y),
    w: pxToInchesW(el.bounds.w),
    h: pxToInchesH(el.bounds.h),
  };

  if (el.image.dataUrl) {
    opts.data = el.image.dataUrl;
  } else {
    opts.path = el.image.src;
  }

  if (el.cornerRadius && el.cornerRadius > 0) {
    opts.rounding = true;
  }

  slide.addImage(opts as PptxGenJS.ImageProps);
}

// ---- Helpers ----

function applyFill(
  opts: Record<string, unknown>,
  bg?: BackgroundDescriptor
): void {
  if (!bg || bg.type === "none") return;

  if (bg.type === "solid") {
    opts.fill = {
      color: toPptxColor(bg.color),
      transparency: alphaToTransparency(bg.color.alpha),
    };
  } else if (bg.type === "gradient") {
    opts.fill = toPptxGradientFill(bg.gradient);
  }
}

function mapTextRun(run: TextRun): object {
  const style = run.style;
  let text = run.text;

  // Apply text-transform
  if (style.textTransform === "uppercase") text = text.toUpperCase();
  else if (style.textTransform === "lowercase") text = text.toLowerCase();
  else if (style.textTransform === "capitalize") {
    text = text.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return {
    text,
    options: {
      fontFace: resolveFontFace(style.fontFamily, style.fontWeight),
      fontSize: fontPxToPoints(style.fontSize),
      bold: style.fontWeight >= 600,
      italic: style.italic,
      underline: style.underline ? { style: "sng" } : undefined,
      color: toPptxColor(style.color),
      transparency: alphaToTransparency(style.color.alpha),
      charSpacing: style.letterSpacing > 0 ? pxToPoints(style.letterSpacing) : undefined,
      lineSpacingMultiple: style.lineHeight > 1.5 ? 1.15 : style.lineHeight,
    },
  };
}

// PptxGenJS only supports bold/italic flags — it cannot set font weight numerically.
// For variable-weight fonts like Poppins, we must use the named variant face
// so PowerPoint loads the correct font file (e.g. "Poppins Light" for weight 300).
function resolveFontFace(family: string, weight: number): string {
  if (weight <= 100) return `${family} Thin`;
  if (weight <= 300) return `${family} Light`;
  if (weight >= 900) return `${family} Black`;
  if (weight >= 800) return `${family} ExtraBold`;
  if (weight >= 700) return family; // bold flag handles 700
  return family;
}

function mapShadow(shadow: ShadowDescriptor): object {
  // PptxGenJS shadow uses angle (degrees) and offset (points)
  const angle =
    Math.atan2(shadow.offsetY, shadow.offsetX) * (180 / Math.PI) + 90;
  const offset = Math.sqrt(
    shadow.offsetX * shadow.offsetX + shadow.offsetY * shadow.offsetY
  );

  return {
    type: "outer",
    angle: Math.round(angle) % 360,
    blur: pxToPoints(shadow.blur),
    offset: pxToPoints(offset),
    color: toPptxColor(shadow.color),
    opacity: shadow.color.alpha,
  };
}
