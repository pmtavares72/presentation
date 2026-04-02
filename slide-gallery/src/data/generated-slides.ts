import fs from "fs";
import path from "path";
import type { SlideMetadata } from "./slides";

export interface GeneratedSlideMetadata extends SlideMetadata {
  templateSlug: string;
  createdAt: string;
}

const JSON_PATH = path.join(process.cwd(), "src/data/generated-slides.json");

export function getGeneratedSlides(): GeneratedSlideMetadata[] {
  try {
    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    return JSON.parse(raw) as GeneratedSlideMetadata[];
  } catch {
    return [];
  }
}

export function getGeneratedSlideBySlug(
  slug: string
): GeneratedSlideMetadata | undefined {
  return getGeneratedSlides().find((s) => s.slug === slug);
}
