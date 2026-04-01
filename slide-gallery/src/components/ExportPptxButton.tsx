"use client";

import { useState } from "react";

interface ExportPptxButtonProps {
  filename: string;
  title: string;
  variant?: "card" | "viewer";
}

const PptxIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 1h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 1v4h4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 8v4M6 10l2 2 2-2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

async function exportSlide(filename: string, title: string) {
  const iframe = document.querySelector(
    `iframe[src="/slides/${filename}"]`
  ) as HTMLIFrameElement | null;

  if (!iframe?.contentDocument || !iframe.contentWindow) {
    console.error("Cannot access slide iframe — export requires viewer mode");
    return;
  }

  const iframeDoc = iframe.contentDocument;
  const iframeWin = iframe.contentWindow;

  const slideEl = iframeDoc.querySelector(".slide") as HTMLElement;
  if (!slideEl) {
    console.error("No .slide element found in iframe");
    return;
  }

  // ── Freeze animations so everything is at final visual state ──────────────
  const freezeStyle = iframeDoc.createElement("style");
  freezeStyle.id = "__pptx-freeze__";
  freezeStyle.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      opacity: 1 !important;
    }
  `;
  iframeDoc.head.appendChild(freezeStyle);
  slideEl.getBoundingClientRect(); // force reflow

  // ── Remove scale transform so we work at true 1920×1080 ──────────────────
  const originalTransform = slideEl.style.transform;
  slideEl.style.transform = "none";
  slideEl.getBoundingClientRect();

  // ── Step 1: Capture background-only image ────────────────────────────────
  // Strategy: hide all content elements (everything that is NOT structural bg),
  // screenshot the slide, then restore.
  //
  // "Background" = the slide base color + .header-area (gradient + circles via ::before/::after).
  // "Content"    = everything inside .header-area's children, .cards-row, .tech-bar, etc.
  //
  // We hide content by hiding all direct children of the slide EXCEPT .header-area,
  // and hide all children inside .header-area (keeping the area itself with its CSS bg).

  const slideChildren = Array.from(slideEl.children) as HTMLElement[];
  const hiddenChildren: { el: HTMLElement; vis: string }[] = [];

  for (const child of slideChildren) {
    const cls = child.className || "";
    if (cls.includes("header-area")) {
      // Keep header-area itself (for gradient bg + pseudo-elements), but hide its children
      for (const inner of Array.from(child.children) as HTMLElement[]) {
        hiddenChildren.push({ el: inner, vis: inner.style.visibility });
        inner.style.visibility = "hidden";
      }
    } else {
      // Hide non-background top-level elements entirely
      hiddenChildren.push({ el: child, vis: child.style.visibility });
      child.style.visibility = "hidden";
    }
  }

  const html2canvas = (await import("html2canvas")).default;
  let backgroundImageData: string | undefined;

  try {
    const canvas = await html2canvas(slideEl, {
      useCORS: true,
      allowTaint: true,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      windowWidth: 1920,
      windowHeight: 1080,
      scrollX: 0,
      scrollY: 0,
      scale: 1,
      backgroundColor: null,
      logging: false,
    });
    console.log("[pptx] html2canvas output:", canvas.width, "×", canvas.height);
    backgroundImageData = canvas.toDataURL("image/png");
  } finally {
    // Restore hidden elements
    for (const { el, vis } of hiddenChildren) {
      el.style.visibility = vis;
    }
  }

  // ── Step 2: Extract content (images + text) as editable PPTX objects ─────
  const { extractSlideDescriptor } = await import(
    "@/lib/slide-to-pptx/extractors/dom-extractor"
  );
  const { generatePptx } = await import(
    "@/lib/slide-to-pptx/generators/pptx-generator"
  );
  const PptxGenJS = (await import("pptxgenjs")).default;

  // Pass iframeWin so the extractor uses the correct window for getComputedStyle
  const descriptor = await extractSlideDescriptor(slideEl, {
    contentOnly: true,
    iframeWindow: iframeWin,
  });

  // Restore transform and unfreeze
  slideEl.style.transform = originalTransform;
  freezeStyle.remove();

  const pres = await generatePptx(descriptor, PptxGenJS, { backgroundImageData });
  await pres.writeFile({ fileName: `${title.replace(/\s+/g, "_")}.pptx` });
}

export default function ExportPptxButton({
  filename,
  title,
  variant = "card",
}: ExportPptxButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExporting(true);
    try {
      await exportSlide(filename, title);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (variant === "viewer") {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        className="glass rounded-full shadow-ambient h-9 px-4 flex items-center gap-2 text-on-surface-variant transition-all duration-200 hover:text-on-surface hover:scale-105 disabled:opacity-50 disabled:cursor-wait font-body text-[12px] font-medium"
        title="Export to PPTX"
      >
        <PptxIcon size={15} />
        {exporting ? "Exporting..." : "PPTX"}
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="shrink-0 flex items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 font-body text-[10px] font-medium text-on-surface-variant transition-all duration-200 hover:!text-primary hover:!bg-primary-container/15 hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
      title="Export to PPTX"
    >
      <PptxIcon size={12} />
      {exporting ? "..." : "PPTX"}
    </button>
  );
}
