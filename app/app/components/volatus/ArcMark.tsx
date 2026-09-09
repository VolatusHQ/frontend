import { cn } from "@/app/app/lib/utils";

/**
 * The Arc wordmark, used inline wherever the payment rail is named. Sized
 * in `em` so it tracks the surrounding text. Arc is the payment
 * infrastructure — not the protection provider — so it stays small and
 * quiet, never a headline.
 */
export function ArcMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline em-sized mark, matches app/components/Nav.tsx
    <img
      src="/art/arc.png"
      alt="Arc"
      width={520}
      height={179}
      className={cn("inline-block w-auto h-[1.15em] align-[-0.22em] opacity-85", className)}
    />
  );
}
