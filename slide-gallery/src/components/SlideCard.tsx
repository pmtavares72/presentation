"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import SlideIframe from "./SlideIframe";
import ExportPptxButton from "./ExportPptxButton";
import type { SlideMetadata } from "@/data/slides";

function IconSparkle() {
  return (
    <svg width="11" height="11" viewBox="0 0 18 18" fill="none">
      <path d="M9 1L10.5 6.5L16 8L10.5 9.5L9 15L7.5 9.5L2 8L7.5 6.5L9 1Z" fill="currentColor" />
    </svg>
  );
}

export default function SlideCard({
  slide,
  showGenerate,
}: {
  slide: SlideMetadata;
  showGenerate?: boolean;
}) {
  const router = useRouter();

  return (
    <Link
      href={`/slides/${slide.slug}`}
      className="group relative block rounded-card bg-surface-lowest overflow-hidden shadow-ambient transition-all duration-300 ease-out hover:shadow-ambient-hover hover:scale-[1.02] hover:-translate-y-1"
    >
      {/* Light leak accent */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 z-10 h-36 w-36 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: "radial-gradient(circle, rgba(254,137,71,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Thumbnail */}
      <div className="relative">
        <SlideIframe filename={slide.filename} mode="thumbnail" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/60 to-transparent" />
      </div>

      {/* Card body */}
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
          <div className="flex items-center gap-2">
            {showGenerate && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/generate/${slide.slug}`);
                }}
                className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-medium text-primary bg-primary/10 transition-all duration-200 hover:bg-primary/20 hover:scale-105"
                title="Generar variación con IA"
              >
                <IconSparkle />
                Generar
              </button>
            )}
            <ExportPptxButton filename={slide.filename} title={slide.title} variant="card" />
          </div>
        </div>
      </div>
    </Link>
  );
}
