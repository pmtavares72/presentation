export interface SlideMetadata {
  slug: string;
  title: string;
  description: string;
  filename: string;
  tags: string[];
  client?: string;
}

export const slides: SlideMetadata[] = [
  {
    slug: "incarlopsa-crm",
    title: "Incarlopsa CRM",
    description:
      "Plan de proyecto CRM a medida con timeline de 7 fases y diagrama Gantt.",
    filename: "incarlopsa_crm_fases.html",
    tags: ["CRM", "Timeline", "Gantt"],
    client: "Incarlopsa",
  },
  {
    slug: "soquilab",
    title: "SOQUILAB",
    description:
      "Proyecto de gestion centralizada para Soquimica con arquitectura .NET y Blazor.",
    filename: "soquilab_slide.html",
    tags: [".NET", "Blazor", "Enterprise"],
    client: "Soquimica, Lda.",
  },
  {
    slug: "soquilab-v2",
    title: "SOQUILAB v2",
    description:
      "Proyecto de gestion centralizada para Soquimica — versión con dimensiones fijas 1920×1080.",
    filename: "soquilab_slide_v2.html",
    tags: [".NET", "Blazor", "Enterprise"],
    client: "Soquimica, Lda.",
  },
  {
    slug: "desarrollo",
    title: "Desarrollo",
    description:
      "Capacidades tecnologicas del equipo: .NET, Java, Node.js y bases de datos.",
    filename: "desarrollo_slide.html",
    tags: [".NET", "Java", "Node.js", "Capabilities"],
  },
  {
    slug: "template",
    title: "Slide Template",
    description:
      "Plantilla base para nuevas presentaciones de proyectos Timestamp.",
    filename: "slide_template.html",
    tags: ["Template"],
  },
];

export function getSlideBySlug(slug: string): SlideMetadata | undefined {
  return slides.find((s) => s.slug === slug);
}
