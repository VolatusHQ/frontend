import * as React from "react";

import { cn } from "@/app/app/lib/utils";

/**
 * The one table shell for the application. DESIGN.md §15.4 — every board
 * (Markets, Underwrite, Liquidity, Profile) renders through this so a
 * header, a row and a right-aligned numeric column always mean the same
 * thing everywhere. Never restyle these primitives at the call site; if a
 * table looks wrong, fix it here.
 *
 * The card frame — rounded corners plus a soft lit-edge gradient border —
 * is a deliberate, explicit exception to DESIGN.md §5's "radius is 0 or a
 * circle": product asked to match this exact card treatment for every
 * table on the site, so it lives once, here, rather than as a one-off.
 */

/** The gradient-bordered, rounded card every table (and its empty state) renders inside. */
function TableCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full rounded-[20px] bg-gradient-to-b from-hair-lit via-hair to-transparent p-px", className)}>
      <div className="rounded-[19px] overflow-hidden bg-gradient-to-b from-panel-2 to-panel">
        {children}
      </div>
    </div>
  );
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <TableCard>
      <div className="w-full overflow-x-auto px-s5 pt-s4 pb-s2">
        <table
          data-slot="table"
          className={cn("w-full border-collapse text-t3", className)}
          {...props}
        />
      </div>
    </TableCard>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableRow({
  className,
  interactive = true,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-t border-hair-2",
        interactive && "vx-row cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

type Align = "left" | "right";

function TableHead({
  align = "left",
  className,
  ...props
}: React.ComponentProps<"th"> & { align?: Align }) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        "lbl whitespace-nowrap pb-s3 font-medium",
        align === "right" ? "pl-s4 text-right" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Every board's header row is the same shape: a left-aligned label for the
 * subject column, right-aligned labels for every data column, and often one
 * trailing blank column for a row's action link. Column defs, not markup.
 */
function TableColumnHeaders({
  columns,
}: {
  columns: readonly { label: string; align?: Align }[];
}) {
  return (
    <TableHeader>
      <tr className="border-b border-hair">
        {columns.map((col, i) => (
          <TableHead key={col.label || i} align={col.align ?? (i === 0 ? "left" : "right")}>
            {col.label}
          </TableHead>
        ))}
      </tr>
    </TableHeader>
  );
}

function TableCell({
  align = "left",
  className,
  ...props
}: React.ComponentProps<"td"> & { align?: Align }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "py-s4 align-middle",
        align === "right" ? "pl-s4 text-right" : "pr-s4",
        className,
      )}
      {...props}
    />
  );
}

/** The shared empty state — same card frame as a populated table, one line of copy. */
function TableEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableCard className={className}>
      <p className="m-0 px-s5 py-s5 text-t4 text-bone-2">{children}</p>
    </TableCard>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableColumnHeaders,
  TableEmpty,
};
export type { Align };
