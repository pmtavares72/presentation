import { slides } from "@/data/slides";
import { getGeneratedSlides } from "@/data/generated-slides";
import SlideCard from "@/components/SlideCard";

export default async function GalleryPage() {
  const generatedSlides = getGeneratedSlides();

  return (
    <div className="min-h-screen bg-surface">
      {/* Atmospheric background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 10%, rgba(254,137,71,0.04) 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <header className="pt-20 pb-10 sm:pt-28 sm:pb-14">
          <p className="font-body text-xs font-medium tracking-[0.25em] uppercase text-on-surface-variant/60 mb-4">
            Timestamp Presentations
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-on-surface tracking-tight leading-[0.95]">
            Slide Gallery
          </h1>
          <p className="mt-5 max-w-lg font-body text-base leading-relaxed text-on-surface-variant">
            A curated collection of presentation slides. Select any to preview
            at full resolution.
          </p>
        </header>

        {/* Templates section */}
        <section className="pb-12">
          <h2 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant/60 mb-6">
            Templates
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {slides.map((slide) => (
              <SlideCard key={slide.slug} slide={slide} showGenerate />
            ))}
          </div>
        </section>

        {/* Mis Slides section — only when there are generated slides */}
        {generatedSlides.length > 0 && (
          <section className="pb-20 sm:pb-28">
            <h2 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant/60 mb-6">
              Mis Slides
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {generatedSlides.map((slide) => (
                <SlideCard key={slide.slug} slide={slide} />
              ))}
            </div>
          </section>
        )}

        {!generatedSlides.length && <div className="pb-20 sm:pb-28" />}
      </div>
    </div>
  );
}
