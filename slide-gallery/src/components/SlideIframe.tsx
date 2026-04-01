"use client";

import { useRef, useEffect, useState } from "react";

interface SlideIframeProps {
  filename: string;
  mode: "thumbnail" | "viewer";
}

export default function SlideIframe({ filename, mode }: SlideIframeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (mode !== "thumbnail") return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setScale(width / 1920);
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [mode]);

  if (mode === "viewer") {
    return (
      <iframe
        src={`/slides/${filename}`}
        className="w-full h-full border-none"
        title="Slide preview"
      />
    );
  }

  return (
    <div ref={wrapperRef} className="slide-thumbnail-wrapper">
      {scale > 0 && (
        <iframe
          src={`/slides/${filename}`}
          style={{ transform: `scale(${scale})` }}
          title="Slide thumbnail"
          tabIndex={-1}
          onLoad={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 bg-surface-low animate-pulse" />
      )}
    </div>
  );
}
