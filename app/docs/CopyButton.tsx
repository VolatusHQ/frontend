"use client";

import { useState } from "react";

/** Copies `value`. Label flips to "Copied" for 1.2s — a state change, not a toast. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard denied — nothing to fall back to that isn't worse
    }
  };

  return (
    <button type="button" className="copy-btn" onClick={onClick} aria-label={`Copy ${value}`}>
      {copied ? "Copied" : label}
    </button>
  );
}
