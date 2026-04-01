// ============================================
// Slide Descriptor — the intermediate representation
// between DOM extraction and PPTX generation.
// JSON-serializable, no DOM dependencies.
// ============================================

export interface SlideDescriptor {
  width: number; // px (typically 1920)
  height: number; // px (typically 1080)
  background: BackgroundDescriptor;
  elements: SlideElement[];
}

export interface SlideElement {
  type: "rect" | "text" | "image" | "ellipse" | "group";
  bounds: Bounds;
  background?: BackgroundDescriptor;
  border?: BorderDescriptor;
  shadow?: ShadowDescriptor;
  text?: TextRun[];
  opacity?: number; // 0-1
  zIndex: number;
  cornerRadius?: number; // px, 0 = sharp corners
  children?: SlideElement[];
  image?: ImageDescriptor;
  // Explicit alignment overrides (used when CSS context can't be inferred from background alone)
  valign?: "top" | "middle" | "bottom";
  align?: "left" | "center" | "right" | "justify";
  // Override font size floor for this element (in pt) — bypasses the global minimum
  fontSizeOverridePt?: number;
  // Override line spacing for this element (replaces CSS line-height derived value)
  lineHeightOverride?: number;
}

export interface Bounds {
  x: number; // px from left of slide
  y: number; // px from top of slide
  w: number; // px width
  h: number; // px height
}

// ---- Backgrounds ----

export type BackgroundDescriptor =
  | SolidBackground
  | GradientBackground
  | NoneBackground;

export interface SolidBackground {
  type: "solid";
  color: ColorValue;
}

export interface GradientBackground {
  type: "gradient";
  gradient: GradientDescriptor;
}

export interface NoneBackground {
  type: "none";
}

export interface GradientDescriptor {
  direction: "linear" | "radial";
  angle?: number; // degrees for linear (CSS convention: 0=to top, 90=to right)
  stops: GradientStop[];
}

export interface GradientStop {
  color: ColorValue;
  position: number; // 0-100 percentage
}

// ---- Colors ----

export interface ColorValue {
  hex: string; // 6-digit hex without # (e.g. "CE0E2D")
  alpha: number; // 0-1 (1 = fully opaque)
}

// ---- Borders ----

export interface BorderDescriptor {
  width: number; // px
  color: ColorValue;
  radius: number; // px (shorthand, uniform)
}

// ---- Shadows ----

export interface ShadowDescriptor {
  offsetX: number; // px
  offsetY: number; // px
  blur: number; // px
  spread: number; // px
  color: ColorValue;
}

// ---- Text ----

export interface TextRun {
  text: string;
  style: TextStyle;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number; // px
  fontWeight: number; // 100-900
  color: ColorValue;
  italic: boolean;
  underline: boolean;
  letterSpacing: number; // px
  lineHeight: number; // ratio (e.g. 1.5)
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  textAlign: "left" | "center" | "right" | "justify";
}

// ---- Images ----

export interface ImageDescriptor {
  src: string; // original src attribute
  dataUrl?: string; // base64 data URL for embedding
  objectFit?: "cover" | "contain" | "fill" | "none";
}

// ---- Export options ----

export interface ExportOptions {
  fileName?: string;
  slideWidth?: number; // inches (default 13.333 for widescreen)
  slideHeight?: number; // inches (default 7.5 for widescreen)
  skipDownload?: boolean; // return blob instead of triggering download
  backgroundImageData?: string; // base64 data URL — if provided, used as slide bg image instead of CSS reconstruction
}
