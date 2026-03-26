import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
