"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SlideMetadata } from "@/data/slides";
import type { GeneratedSlideMetadata } from "@/data/generated-slides";

interface Props {
  slide: SlideMetadata;
  initialSavedSlides: GeneratedSlideMetadata[];
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M9 1L10.5 6.5L16 8L10.5 9.5L9 15L7.5 9.5L2 8L7.5 6.5L9 1Z" fill="currentColor" />
    </svg>
  );
}

export default function GenerateClient({ slide, initialSavedSlides }: Props) {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSlides, setSavedSlides] = useState<GeneratedSlideMetadata[]>(initialSavedSlides);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build blob URL for preview whenever generatedHtml changes
  useEffect(() => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [generatedHtml]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const res = await fetch("/api/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: slide.slug, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setGeneratedHtml(data.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando slide");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedHtml || !saveName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/save-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: slide.slug, name: saveName.trim(), html: generatedHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error guardando");

      const newSlide: GeneratedSlideMetadata = {
        slug: data.slug,
        title: saveName.trim(),
        description: `Variación generada de ${slide.slug}`,
        filename: `generated/${data.slug}.html`,
        tags: ["AI", "Generado"],
        templateSlug: slide.slug,
        createdAt: new Date().toISOString(),
      };
      setSavedSlides((prev) => [...prev, newSlide]);
      setSaveSuccess(`Guardado como "${saveName.trim()}"`);
      setShowSaveForm(false);
      setSaveName("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-[40%] min-w-[320px] flex flex-col bg-surface-low overflow-y-auto">
        <div className="px-8 pt-8 pb-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-body text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-200 mb-8"
          >
            <IconArrowLeft />
            Galería
          </Link>

          {/* Template header */}
          <div className="mb-8">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-1">
              Template
            </p>
            <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight">
              {slide.title}
            </h1>
            <p className="mt-1 font-body text-sm text-on-surface-variant leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Prompt area */}
          <div className="mb-4">
            <label className="block font-body text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-2">
              Describe los cambios
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
              placeholder="Ej: Cambia el cliente a Acme Corp, adapta las fases para un proyecto de 5 semanas enfocado en e-commerce..."
              className="w-full rounded-2xl bg-surface px-4 py-3 font-body text-sm text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40 min-h-[130px] transition-all duration-200"
              style={{ boxShadow: "0 1px 4px rgba(44,47,49,0.04)" }}
            />
            <p className="mt-1.5 font-body text-[10px] text-on-surface-variant/50">
              ⌘ + Enter para generar
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full rounded-full py-3 font-body text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #9a4000 0%, #fe8947 100%)" }}
          >
            <IconSparkle />
            {isGenerating ? "Generando..." : "Generar"}
          </button>

          {/* Error */}
          {error && (
            <p className="mt-3 font-body text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Save success */}
          {saveSuccess && (
            <p className="mt-3 font-body text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5">
              ✓ {saveSuccess}
            </p>
          )}
        </div>

        {/* Save form — appears after generation */}
        {generatedHtml && (
          <div className="px-8 pb-6">
            <div
              className="rounded-2xl bg-surface p-4"
              style={{ boxShadow: "0 1px 8px rgba(44,47,49,0.05)" }}
            >
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full rounded-full py-2.5 font-body text-sm font-medium text-primary border-2 border-primary/20 hover:bg-primary/5 transition-all duration-200"
                >
                  Guardar esta versión
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="Nombre del slide..."
                    autoFocus
                    className="w-full rounded-xl bg-surface-low px-4 py-2.5 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !saveName.trim()}
                      className="flex-1 rounded-full py-2.5 font-body text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200"
                      style={{ background: "linear-gradient(135deg, #9a4000 0%, #fe8947 100%)" }}
                    >
                      {isSaving ? "Guardando..." : "Confirmar"}
                    </button>
                    <button
                      onClick={() => { setShowSaveForm(false); setSaveName(""); }}
                      className="px-4 rounded-full font-body text-sm text-on-surface-variant hover:bg-surface-low transition-colors duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Saved slides list */}
        {savedSlides.length > 0 && (
          <div className="px-8 pb-8">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-3">
              Versiones guardadas ({savedSlides.length})
            </p>
            <div className="flex flex-col gap-2">
              {savedSlides.map((s) => (
                <Link
                  key={s.slug}
                  href={`/slides/${s.slug}`}
                  className="flex items-center gap-3 rounded-xl bg-surface px-4 py-2.5 font-body text-sm text-on-surface hover:bg-surface-lowest transition-colors duration-200"
                  style={{ boxShadow: "0 1px 4px rgba(44,47,49,0.04)" }}
                >
                  <IconSparkle />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-[10px] text-on-surface-variant/50 shrink-0">
                    {new Date(s.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel — preview ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-surface-lowest">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant/60">
            Vista previa
          </p>
          {generatedHtml && (
            <span className="font-body text-[10px] text-on-surface-variant/50">
              Generado · no guardado aún
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-6 min-h-0">
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            {!previewUrl && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-surface gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(154,64,0,0.08) 0%, rgba(254,137,71,0.08) 100%)" }}
                >
                  <IconSparkle />
                </div>
                <p className="font-body text-sm text-on-surface-variant/60 text-center max-w-[200px]">
                  Escribe un prompt y haz clic en Generar
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface animate-preview-pulse">
                <p className="font-body text-sm text-on-surface-variant">Generando slide...</p>
              </div>
            )}

            {previewUrl && !isGenerating && (
              <iframe
                src={previewUrl}
                className="absolute inset-0 w-full h-full rounded-2xl"
                style={{ border: "none", boxShadow: "0 4px 32px rgba(44,47,49,0.10)" }}
                title="Vista previa del slide generado"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
