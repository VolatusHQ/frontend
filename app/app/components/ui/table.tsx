import * as React from "react";

import { cn } from "@/app/app/lib/utils";

/**
 * The one table shell for the application. DESIGN.md §15.4 — every board
 * (Markets, Underwrite, Liquidity, Profile) renders through this so a
 * header, a row and a right-aligned numeric column always mean the same
 * thing everywhere. Never restyle these primitives at the call site; if a
 * table looks wrong, fix it here.
 */

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-t3", className)}
        {...props}
      />
    </div>
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
      <tr>
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

/** The shared empty state — a ruled hairline, one line of copy. Never a table with zero rows. */
function TableEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ruled pt-s4", className)}>
      <p className="m-0 text-t4 text-bone-2">{children}</p>
    </div>
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
