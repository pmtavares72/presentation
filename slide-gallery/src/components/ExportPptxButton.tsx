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

  // ── Force iframe to 1920×1080 so layout and getBoundingClientRect use true slide coords ──
  const originalIframeWidth = iframe.style.width;
  const originalIframeHeight = iframe.style.height;
  iframe.style.width = "1920px";
  iframe.style.height = "1080px";

  // Remove scale transform. Do this AFTER resizing the iframe because the
  // slide's scaleSlide() listener fires on resize and reapplies a transform.
  const originalTransform = slideEl.style.transform;
  slideEl.style.transform = "none";
  // Wait one microtask for any resize listeners to fire, then remove again
  await new Promise<void>(resolve => setTimeout(resolve, 50));
  slideEl.style.transform = "none";
  slideEl.getBoundingClientRect(); // force reflow at true 1920×1080

  // ── Step 1: Capture background image ─────────────────────────────────────
  // Hide the children of every structural container, keeping only the
  // container shapes (gradients, card whites, tech bar). This gives us a
  // clean background at full 1920×1080 with correct proportions.
  const hiddenEls: { el: HTMLElement; vis: string }[] = [];

  function hideChildren(parent: Element) {
    for (const child of Array.from(parent.children) as HTMLElement[]) {
      hiddenEls.push({ el: child, vis: child.style.visibility });
      child.style.visibility = "hidden";
    }
  }

  // Hide all children of every top-level slide section
  for (const child of Array.from(slideEl.children) as HTMLElement[]) {
    hideChildren(child);
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
    backgroundImageData = canvas.toDataURL("image/png");
  } finally {
    for (const { el, vis } of hiddenEls) {
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

  // Restore iframe size, transform and unfreeze
  iframe.style.width = originalIframeWidth;
  iframe.style.height = originalIframeHeight;
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
