"use client";

import { ReactNode } from "react";

export default function AppShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {sidebar}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
