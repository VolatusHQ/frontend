"use client";

import { useEffect, useState } from "react";

export type DocSection = { id: string; label: string };

/**
 * Sticky rail plus a scrollspy — the active section is set by which one
 * intersects the top band of the viewport, the same discrete
 * enter/leave-toggle pattern `Reveal` and `Pipeline` already use elsewhere on
 * the site (never a continuous scroll-linked transform; §7.5 caps the page at
 * one of those, and it's already spent on the fixed background parallax).
 */
export function DocsChrome({
  sections,
  children,
}: {
  sections: DocSection[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const index = Math.max(0, sections.findIndex((s) => s.id === active));

  return (
    <div className="docs-shell">
      <button
        type="button"
        className="docs-shell__toggle"
        aria-expanded={open}
        aria-controls="docs-rail"
        onClick={() => setOpen((o) => !o)}
      >
        {sections[index]?.label ?? "Contents"}
        <span className="docs-shell__toggle-chev" aria-hidden="true" />
      </button>

      <nav
        id="docs-rail"
        className={`docs-rail${open ? " is-open" : ""}`}
        aria-label="Docs contents"
      >
        <div className="docs-rail__count">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span className="docs-rail__count-of">/ {String(sections.length).padStart(2, "0")}</span>
        </div>
        <ol className="docs-rail__list">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`docs-rail__link${s.id === active ? " is-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="docs-rail__dot" data-done={i <= index} aria-hidden="true" />
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="docs-content">{children}</div>
    </div>
  );
}
