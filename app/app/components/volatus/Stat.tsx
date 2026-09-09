"use client";

import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/app/app/lib/utils";

export type Ink = "realized" | "implied" | "neutral" | "up" | "down";

const INK_CLASS: Record<Ink, string> = {
  realized: "text-yellow",
  implied: "text-pink",
  neutral: "text-bone",
  // Trading convention (long/profit vs short/loss), used only on the trade
  // panel and position card — see app.css's --up/--down note.
  up: "text-up",
  down: "text-down",
};

/**
 * A stat. Micro label above a tabular value by default, never in a bordered
 * box and never with an icon. DESIGN.md §9.
 *
 * `layout="value-first"` flips it — the number leads, the label reads as a
 * caption beneath it. Used where the number is the thing being scanned for
 * (the pool header's headline figures); everywhere else keeps the default.
 */
export function Stat({
  label,
  value,
  ink = "neutral",
  sub,
  size = "md",
  layout = "label-first",
  className,
}: {
  label: string;
  value: React.ReactNode;
  ink?: Ink;
  sub?: React.ReactNode;
  size?: "md" | "lg" | "hero";
  layout?: "label-first" | "value-first";
  className?: string;
}) {
  const sizeClass =
    size === "hero" ? "text-num leading-none" : size === "lg" ? "text-d4" : "text-[20px]";
  const labelEl = <span className="lbl">{label}</span>;
  const valueEl = <span className={cn("num", sizeClass, INK_CLASS[ink])}>{value}</span>;
  return (
    <div className={cn("flex flex-col gap-s1", className)}>
      {layout === "value-first" ? (
        <>
          {valueEl}
          {labelEl}
        </>
      ) : (
        <>
          {labelEl}
          {valueEl}
        </>
      )}
      {sub ? <span className="text-t2 text-bone-3">{sub}</span> : null}
    </div>
  );
}

/**
 * A number that changes on its own.
 *
 * Two rules from DESIGN.md §15.3, both enforced here so no screen can break
 * them:
 *
 *  - The changed value lifts its colour for 220ms and decays. The glyph never
 *    moves. No slot-machine roll, no odometer.
 *  - A value that changes without the user acting must be attributable, so
 *    `cause` is required and surfaces on hover. If you cannot say why a number
 *    moved, it should not be a Ticker.
 */
export function Ticker({
  value,
  ink = "neutral",
  cause,
  className,
}: {
  value: string;
  ink?: Ink;
  /** Why this number last moved. Shown on hover. Required by §15.3. */
  cause: string;
  className?: string;
}) {
  const [lifting, setLifting] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setLifting(true);
    const id = window.setTimeout(() => setLifting(false), 620);
    return () => window.clearTimeout(id);
  }, [value]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("num cursor-help", lifting && "is-lifting", className)}
          data-ink={ink}
          tabIndex={0}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent>{cause}</TooltipContent>
    </Tooltip>
  );
}

/** A plate: flat fill, hairline, radius 0. Never contains another plate. §5 */
export function Plate({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("plate", className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * A titled region. The default surface is a rule and whitespace, not a card —
 * `plate` is opt-in for a genuinely distinct object. §5
 */
export function Block({
  title,
  aside,
  children,
  plate = false,
  className,
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  plate?: boolean;
  className?: string;
}) {
  return (
    <section className={cn(plate ? "plate p-s4" : "ruled pt-s4", className)}>
      {title ? (
        <header className="flex items-baseline justify-between gap-s4 mb-s3">
          <h2 className="lbl">{title}</h2>
          {aside ? <div className="text-t2 text-bone-3">{aside}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
