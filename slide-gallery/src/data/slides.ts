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
    slug: "fases-de-proyecto",
    title: "Fases de Proyecto",
    description:
      "Plan de proyecto con timeline de 7 fases y diagrama Gantt.",
    filename: "fases_de_proyecto.html",
    tags: ["Timeline", "Gantt", "Fases"],
  },
  {
    slug: "caso-de-uso",
    title: "Caso de Uso",
    description:
      "Proyecto de gestion centralizada para Soquimica con arquitectura .NET y Blazor.",
    filename: "caso_de_uso.html",
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
