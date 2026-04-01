import { notFound } from "next/navigation";
import { slides, getSlideBySlug } from "@/data/slides";
import type { Metadata } from "next";
import SlideViewer from "./SlideViewer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return slides.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const slide = getSlideBySlug(slug);
  if (!slide) return { title: "Not found" };
  return {
    title: `${slide.title} — Slide Gallery`,
    description: slide.description,
  };
}

export default async function SlideViewerPage({ params }: Props) {
  const { slug } = await params;
  const slide = getSlideBySlug(slug);
  if (!slide) notFound();

  return <SlideViewer slide={slide} />;
}
