import { notFound } from "next/navigation";
import { slides, getSlideBySlug } from "@/data/slides";
import { getGeneratedSlides } from "@/data/generated-slides";
import GenerateClient from "./GenerateClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return slides.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const slide = getSlideBySlug(slug);
  return { title: slide ? `Generar — ${slide.title}` : "Generar slide" };
}

export default async function GeneratePage({ params }: Props) {
  const { slug } = await params;
  const slide = getSlideBySlug(slug);
  if (!slide) notFound();

  const initialSavedSlides = getGeneratedSlides().filter(
    (s) => s.templateSlug === slug
  );

  return (
    <GenerateClient slide={slide} initialSavedSlides={initialSavedSlides} />
  );
}
