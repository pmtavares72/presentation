"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import type { SlideMetadata } from "@/data/slides";
import type { GeneratedSlideMetadata } from "@/data/generated-slides";

interface SidebarProps {
  templates: SlideMetadata[];
  generated: GeneratedSlideMetadata[];
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1L10.5 6.5L16 8L10.5 9.5L9 15L7.5 9.5L2 8L7.5 6.5L9 1Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.41 1.41M13.54 13.54l1.41 1.41M3.05 14.95l1.41-1.41M13.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
}

function NavItem({ href, icon, label, expanded }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      title={!expanded ? label : undefined}
      className={`flex items-center gap-3 rounded-full px-3 py-2 transition-all duration-200 group
        ${isActive
          ? "bg-primary/10 text-primary"
          : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
        }`}
      style={{ minHeight: "40px" }}
    >
      <span className="shrink-0">{icon}</span>
      <span
        className="font-body text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200"
        style={{
          opacity: expanded ? 1 : 0,
          width: expanded ? "auto" : 0,
          maxWidth: expanded ? "160px" : 0,
        }}
      >
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar({ templates, generated }: SidebarProps) {
  const { expanded, toggle } = useSidebar();

  return (
    <aside
      className="flex flex-col shrink-0 overflow-hidden bg-surface-low transition-[width] duration-300 ease-in-out"
      style={{
        width: expanded ? "240px" : "64px",
        boxShadow: "2px 0 16px rgba(44,47,49,0.06)",
        minHeight: "100vh",
      }}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-center p-3 pt-5">
        <button
          onClick={toggle}
          className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface hover:text-on-surface transition-all duration-200"
          title={expanded ? "Colapsar menú" : "Expandir menú"}
        >
          <span
            className="transition-transform duration-300"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <IconChevron />
          </span>
        </button>
      </div>

      {/* Nav section label */}
      {expanded && (
        <div className="px-4 pt-4 pb-1">
          <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
            Templates
          </span>
        </div>
      )}
      {!expanded && <div className="mt-2" />}

      {/* Templates */}
      <nav className="flex flex-col gap-1 px-3">
        {templates.map((slide) => (
          <NavItem
            key={slide.slug}
            href={`/slides/${slide.slug}`}
            icon={<IconGrid />}
            label={slide.title}
            expanded={expanded}
          />
        ))}
      </nav>

      {/* Mis Slides section */}
      {generated.length > 0 && (
        <>
          {expanded && (
            <div className="px-4 pt-5 pb-1">
              <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
                Mis Slides
              </span>
            </div>
          )}
          {!expanded && <div className="mt-4" />}
          <nav className="flex flex-col gap-1 px-3">
            {generated.map((slide) => (
              <NavItem
                key={slide.slug}
                href={`/slides/${slide.slug}`}
                icon={<IconSparkle />}
                label={slide.title}
                expanded={expanded}
              />
            ))}
          </nav>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom */}
      <div className="px-3 pb-5">
        <NavItem
          href="/settings"
          icon={<IconSettings />}
          label="Configuración"
          expanded={expanded}
        />
      </div>
    </aside>
  );
}
