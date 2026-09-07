import { BRAND, REPO_URL } from "../lib/brand";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/wordmark.webp" alt={BRAND} />
        <div className="footer__meta">
          <span>Unichain Sepolia · Arc Testnet</span>
          <span>Testnet only · not for real funds</span>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
