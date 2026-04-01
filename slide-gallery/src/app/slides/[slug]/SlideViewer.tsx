"use client";

import Link from "next/link";
import { useState } from "react";
import SlideIframe from "@/components/SlideIframe";
import ExportPptxButton from "@/components/ExportPptxButton";
import type { SlideMetadata } from "@/data/slides";

export default function SlideViewer({ slide }: { slide: SlideMetadata }) {
  const [metaVisible, setMetaVisible] = useState(true);

  return (
    <div className="fixed inset-0 bg-surface-low flex flex-col">
      {/* Top bar — glassmorphism overlay */}
      <div
        className={`relative z-20 flex items-center justify-between px-6 py-4 transition-all duration-500 ${
          metaVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="glass rounded-full shadow-ambient flex items-center gap-5 pl-2 pr-6 py-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-on-primary transition-transform duration-200 hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #9a4000 0%, #fe8947 100%)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="translate-x-[-1px]"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-sm font-semibold text-on-surface leading-tight">
              {slide.title}
            </h1>
            {slide.client && (
              <p className="font-body text-[11px] text-on-surface-variant">
                {slide.client}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportPptxButton filename={slide.filename} title={slide.title} variant="viewer" />
          <button
            onClick={() => setMetaVisible(false)}
            className="glass rounded-full shadow-ambient h-9 w-9 flex items-center justify-center text-on-surface-variant transition-all duration-200 hover:text-on-surface hover:scale-110"
            title="Hide overlay"
          >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          </button>
        </div>
      </div>

      {/* Click to restore overlay when hidden */}
      {!metaVisible && (
        <button
          onClick={() => setMetaVisible(true)}
          className="absolute top-4 left-4 z-20 glass rounded-full shadow-ambient h-10 w-10 flex items-center justify-center text-on-surface-variant transition-all duration-200 hover:text-on-surface hover:scale-110"
          title="Show overlay"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 5H14M2 8H14M2 11H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* Slide iframe — fills remaining space */}
      <div className="flex-1 relative z-10">
        <SlideIframe filename={slide.filename} mode="viewer" />
      </div>
    </div>
  );
}
