"use client";

import { useId, useState } from "react";

export type Qa = { q: string; a: string };

/** One open at a time. Height animates through grid-template-rows. */
export function Faq({ items }: { items: Qa[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <div className="faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panel = `${base}-p${i}`;
        const button = `${base}-b${i}`;
        return (
          <div key={item.q} className={`faq__item${isOpen ? " is-open" : ""}`}>
            <h3>
              <button
                id={button}
                className="faq__q"
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                {item.q}
                <span className="faq__chev" aria-hidden="true" />
              </button>
            </h3>
            <div className="faq__a" id={panel} role="region" aria-labelledby={button}>
              <div>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
