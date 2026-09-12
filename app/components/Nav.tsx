"use client";

import { useEffect, useState } from "react";
import { BRAND, REPO_URL } from "../lib/brand";

/**
 * Sticky full-width bar in the Vercel/shadcn navbar idiom: wordmark left,
 * a horizontal menu with rounded hover pills, an outline action right, and a
 * hairline that fades in once the page is scrolled.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar${scrolled ? " is-scrolled" : ""}`}>
      <div className="navbar__inner">
        <div className="navbar__left">
          <a className="navbar__brand" href="/#top" aria-label={BRAND}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/wordmark.webp" alt={BRAND} />
          </a>
          <nav className="navbar__menu" aria-label="Primary">
            <a href="/#how">How it works</a>
            <a href="/#faq">FAQ</a>
            <a href="/docs">Docs</a>
          </nav>
        </div>

        <div className="navbar__right">
          <a
            className="navbar__btn"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a className="navbar__btn navbar__btn--primary" href="/app">
            Open app
          </a>
        </div>
      </div>
    </header>
  );
}
