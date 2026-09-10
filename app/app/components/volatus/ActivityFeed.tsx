"use client";

import { useState } from "react";
import { cn } from "@/app/app/lib/utils";
import { MOCK_NOW, poolDisplay } from "@/app/app/lib/market-data";
import { agoSeconds, dayLabel, hhmm, int } from "@/app/app/lib/format";
import type { ActivityEntry, ActivityKind } from "@/app/app/lib/portfolio";

const FILTERS: { label: string; kind: ActivityKind | "all" }[] = [
  { label: "All", kind: "all" },
  { label: "Trading", kind: "trading" },
  { label: "Liquidity", kind: "liquidity" },
  { label: "Underwriting", kind: "underwriting" },
];

/**
 * A chronological ledger of what the wallet has done across all three areas.
 * Reads as an account statement, not a social feed — one line per action,
 * the money on the right, no avatars or verbs-of-approval.
 *
 * `limit` trims to the most recent N (the Overview's "recent activity");
 * `filterable` adds the All / Trading / Liquidity / Underwriting control and
 * switches the timestamp to a calendar label (the History page).
 */
export function ActivityFeed({
  entries,
  limit,
  filterable = false,
}: {
  entries: ActivityEntry[];
  limit?: number;
  filterable?: boolean;
}) {
  const [kind, setKind] = useState<ActivityKind | "all">("all");

  const filtered = filterable && kind !== "all" ? entries.filter((e) => e.kind === kind) : entries;
  const shown = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

  return (
    <div className="flex flex-col gap-s3">
      {filterable ? (
        <div className="flex flex-wrap gap-s4">
          {FILTERS.map((f) => (
            <button
              key={f.kind}
              type="button"
              aria-pressed={kind === f.kind}
              onClick={() => setKind(f.kind)}
              className={cn(
                "lbl pb-s1 border-b transition-colors duration-[140ms]",
                kind === f.kind
                  ? "text-bone border-bone"
                  : "text-bone-3 border-transparent hover:text-bone",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-t3 text-bone-3 m-0">No activity in this view yet.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col">
          {shown.map((e) => (
            <li
              key={e.id}
              className="flex items-baseline justify-between gap-s4 py-s3 border-t border-hair-2 first:border-t-0"
            >
              <div className="flex flex-col gap-[2px] min-w-0">
                <span className="text-t3 text-bone">{e.action}</span>
                <span className="text-t2 text-bone-3">{poolDisplay(e.pool)}</span>
              </div>
              <div className="flex flex-col items-end gap-[2px] shrink-0">
                <span
                  className={cn(
                    "num text-t3",
                    typeof e.amountUsd === "number" && e.amountUsd < 0 ? "text-down" : "text-bone-2",
                  )}
                >
                  {typeof e.amountUsd === "number"
                    ? `${e.amountUsd < 0 ? "−" : "+"}$${int(Math.abs(e.amountUsd))}`
                    : e.note}
                </span>
                <span className="num text-t2 text-bone-3">
                  {filterable
                    ? `${dayLabel(e.timestamp, MOCK_NOW)}, ${hhmm(e.timestamp)}`
                    : agoSeconds(e.timestamp, MOCK_NOW)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
