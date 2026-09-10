import Link from "next/link";
import { Block } from "./Stat";
import { poolDisplay } from "@/app/app/lib/market-data";
import type { AttentionItem } from "@/app/app/lib/portfolio";
import { UniswapMark } from "./UniswapMark";

/**
 * What the portfolio needs a decision on — derived from real position state,
 * never invented to fill the panel. Each row states the metric, one reason,
 * and the single action that resolves it.
 */
export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <Block title="Needs attention">
      {items.length === 0 ? (
        <p className="text-t3 text-bone-3 m-0">Nothing needs attention right now.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col">
          {items.map((item) => (
            <li
              key={item.slug}
              className="flex flex-col gap-s2 py-s4 border-t border-hair-2 first:border-t-0"
            >
              <span className="flex items-center gap-s3 text-t4 text-bone">
                <UniswapMark />
                {poolDisplay(item.pool)}
              </span>
              <span className="num text-t3 text-bone-2">
                {item.metricLabel} <span className="text-bone">{item.metricValue}</span>
              </span>
              <p className="text-t3 text-bone-2 m-0">{item.reason}</p>
              <Link
                href={item.actionHref}
                className="text-t3 text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms] w-fit"
              >
                {item.actionLabel} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
