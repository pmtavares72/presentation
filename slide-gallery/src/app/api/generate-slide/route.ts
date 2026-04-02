import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { slides } from "@/data/slides";

const SYSTEM_PROMPT = `You are a slide content editor. You receive an HTML slide template and a user instruction.
Your ONLY job is to update the visible text content and data values inside the HTML.

STRICT RULES — violating any rule makes your response invalid:
1. Return ONLY the complete HTML document. No markdown, no code fences, no explanation.
2. Do NOT change any CSS classes, inline styles, CSS variables, or <style> blocks.
3. Do NOT change the JavaScript at the bottom of the file.
4. Do NOT add new HTML elements or change the structure/nesting of elements.
5. Do NOT change any attributes other than alt text on images.
6. ONLY change text node content inside existing elements.
7. Keep all Spanish text in Spanish unless the instruction explicitly requests a language change.
8. The Timestamp logo <img> tag must remain untouched.`;

export async function POST(req: NextRequest) {
  try {
    const { templateSlug, prompt } = await req.json() as { templateSlug: string; prompt: string };

    if (!templateSlug || !prompt) {
      return NextResponse.json({ error: "templateSlug and prompt are required" }, { status: 400 });
    }

    const slide = slides.find((s) => s.slug === templateSlug);
    if (!slide) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const templatePath = path.join(process.cwd(), "public/slides", slide.filename);
    const templateHtml = fs.readFileSync(templatePath, "utf-8");

    const client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });

    const response = await client.chat.completions.create({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `TEMPLATE HTML:\n${templateHtml}\n\nUSER INSTRUCTION:\n${prompt}\n\nReturn the modified HTML now.`,
        },
      ],
      max_tokens: 16000,
    });

    let html = response.choices[0]?.message?.content ?? "";
    // Strip markdown fences if model wraps output despite instructions
    html = html.trim();
    if (html.startsWith("```")) {
      html = html.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json({ html });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
