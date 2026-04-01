// ============================================
// slide-to-pptx — Public API
//
// Two entry points:
//   1. exportSlideToPptx(element, options) — browser: DOM → PPTX file
//   2. generatePptx(descriptor, pptxLib, options) — anywhere: JSON → PPTX
// ============================================

export type {
  SlideDescriptor,
  SlideElement,
  Bounds,
  BackgroundDescriptor,
  SolidBackground,
  GradientBackground,
  NoneBackground,
  GradientDescriptor,
  GradientStop,
  ColorValue,
  BorderDescriptor,
  ShadowDescriptor,
  TextRun,
  TextStyle,
  ImageDescriptor,
  ExportOptions,
} from "./types";

export { extractSlideDescriptor } from "./extractors/dom-extractor";
export type { ExtractOptions } from "./extractors/dom-extractor";

export { generatePptx } from "./generators/pptx-generator";

export { parseColor, toPptxColor, alphaToTransparency } from "./generators/color-mapper";
export { parseGradient, parseLinearGradient } from "./generators/gradient-mapper";
export { pxToInchesX, pxToInchesY, pxToPoints } from "./generators/unit-converter";

// Convenience: full pipeline from DOM element to PPTX file download
export async function exportSlideToPptx(
  slideElement: HTMLElement,
  options: import("./types").ExportOptions = {}
): Promise<Blob> {
  const { extractSlideDescriptor } = await import("./extractors/dom-extractor");
  const { generatePptx } = await import("./generators/pptx-generator");
  const PptxGenJS = (await import("pptxgenjs")).default;

  const descriptor = await extractSlideDescriptor(slideElement);
  const pres = await generatePptx(descriptor, PptxGenJS, options);

  if (!options.skipDownload) {
    const fileName = options.fileName ?? "slide.pptx";
    await pres.writeFile({ fileName });
  }

  // Return blob regardless
  return (await pres.write({ outputType: "blob" })) as Blob;
}
