"use client";

import Link from "next/link";
import SlideIframe from "./SlideIframe";
import ExportPptxButton from "./ExportPptxButton";
import type { SlideMetadata } from "@/data/slides";

export default function SlideCard({ slide }: { slide: SlideMetadata }) {
  return (
    <Link
      href={`/slides/${slide.slug}`}
      className="group relative block rounded-card bg-surface-lowest overflow-hidden shadow-ambient transition-all duration-300 ease-out hover:shadow-ambient-hover hover:scale-[1.02] hover:-translate-y-1"
    >
      {/* Light leak accent — warm glow in the top-right */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 z-10 h-36 w-36 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle, rgba(254,137,71,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Thumbnail — live HTML slide preview */}
      <div className="relative">
        <SlideIframe filename={slide.filename} mode="thumbnail" />
        {/* Soft vignette at the bottom of the thumbnail for depth */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/60 to-transparent" />
      </div>

      {/* Card body — compact but with title + description */}
      <div className="relative px-5 pt-3 pb-3.5">
        {slide.client && (
          <span className="font-body text-[10px] font-medium text-on-surface-variant/60 uppercase tracking-wider">
            {slide.client}
          </span>
        )}
        <h3 className="font-display text-sm font-semibold text-on-surface leading-tight tracking-tight">
          {slide.title}
        </h3>
        <p className="mt-1 font-body text-[11px] leading-snug text-on-surface-variant line-clamp-2">
          {slide.description}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {slide.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-surface-low px-2 py-0.5 font-body text-[10px] font-medium text-on-surface-variant tracking-wide transition-colors duration-200 group-hover:bg-primary-container/15 group-hover:text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
          <ExportPptxButton filename={slide.filename} title={slide.title} variant="card" />
        </div>
      </div>
    </Link>
  );
}
