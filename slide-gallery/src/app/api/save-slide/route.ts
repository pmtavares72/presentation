import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { GeneratedSlideMetadata } from "@/data/generated-slides";

const JSON_PATH = path.join(process.cwd(), "src/data/generated-slides.json");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { templateSlug, name, html } = await req.json() as {
      templateSlug: string;
      name: string;
      html: string;
    };

    if (!templateSlug || !name || !html) {
      return NextResponse.json({ error: "templateSlug, name and html are required" }, { status: 400 });
    }

    const slug = `${slugify(name)}-${Date.now().toString(36)}`;
    const filename = `generated/${slug}.html`;

    // Ensure generated directory exists
    const generatedDir = path.join(process.cwd(), "public/slides/generated");
    fs.mkdirSync(generatedDir, { recursive: true });

    // Write HTML file
    fs.writeFileSync(path.join(generatedDir, `${slug}.html`), html, "utf-8");

    // Read existing generated slides, append new entry, write back
    let existing: GeneratedSlideMetadata[] = [];
    try {
      existing = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
    } catch {
      existing = [];
    }

    const entry: GeneratedSlideMetadata = {
      slug,
      title: name,
      description: `Variación generada de ${templateSlug}`,
      filename,
      tags: ["AI", "Generado"],
      templateSlug,
      createdAt: new Date().toISOString(),
    };

    existing.push(entry);
    fs.writeFileSync(JSON_PATH, JSON.stringify(existing, null, 2), "utf-8");

    return NextResponse.json({ slug, success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
