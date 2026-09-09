import { cn } from "@/app/app/lib/utils";

/**
 * The Uniswap logomark, marking a pool as measured on Uniswap v4. Square
 * source (641×640), sized in `em` so it tracks the surrounding text.
 */
export function UniswapMark({ className }: { className?: string }) {
  return (
    <img
      src="/art/uniswap.png"
      alt="Uniswap"
      width={641}
      height={640}
      className={cn("inline-block w-[1.5em] h-[1.5em] align-[-0.4em]", className)}
    />
  );
}
