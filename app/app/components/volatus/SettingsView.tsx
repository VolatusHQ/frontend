"use client";

import { useSyncExternalStore } from "react";
import { Block } from "./Stat";
import { cn } from "@/app/app/lib/utils";
import { addr } from "@/app/app/lib/format";
import {
  getSettings,
  getServerSettings,
  setSettings,
  subscribeSettings,
  WALLET_ADDRESS,
  type ProfileSettings,
} from "@/app/app/lib/account";

const REPO_URL = "https://github.com/CodeBlocker52/sigma";

/** A hand-rolled segmented control — the pattern the rest of /app already uses. */
function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex border border-hair w-fit">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-s3 py-[5px] text-t2 num transition-colors duration-[140ms]",
            o.value === value ? "bg-panel-2 text-bone" : "text-bone-3 hover:text-bone",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const ONOFF = [
  { label: "On", value: true },
  { label: "Off", value: false },
];

function Setting({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-s4 py-s3 border-t border-hair-2 first:border-t-0">
      <div className="flex flex-col gap-[2px] max-w-[46ch]">
        <span className="text-t4 text-bone">{label}</span>
        {hint ? <span className="text-t2 text-bone-3">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Profile settings — deliberately small. View preferences persist to
 * localStorage; nothing here talks to a chain or a wallet, because the
 * prototype has neither.
 */
export function SettingsView() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);

  const patch = (next: Partial<ProfileSettings>) => {
    setSettings({ ...settings, ...next });
  };

  return (
    <div className="flex flex-col gap-s6">
      <Block title="Connected wallet">
        <Setting label={addr(WALLET_ADDRESS)} hint="The wallet is assumed connected for this prototype.">
          <button
            type="button"
            disabled
            className="text-t3 text-bone-3 underline decoration-hair-lit underline-offset-4 disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
        </Setting>
      </Block>

      <Block title="Display">
        <Setting label="Compact currency" hint="Show large amounts as $42.8M rather than $42,800,000.">
          <Segmented
            options={ONOFF}
            value={settings.compactCurrency}
            onChange={(v) => patch({ compactCurrency: v })}
          />
        </Setting>
      </Block>

      <Block title="Protection & payment">
        <Setting label="Default coverage" hint="Pre-selected share of a position when starting protection.">
          <Segmented
            options={[
              { label: "25%", value: 0.25 },
              { label: "50%", value: 0.5 },
              { label: "75%", value: 0.75 },
              { label: "100%", value: 1 },
            ]}
            value={settings.defaultCoveragePct}
            onChange={(v) => patch({ defaultCoveragePct: v as ProfileSettings["defaultCoveragePct"] })}
          />
        </Setting>
      </Block>

      <Block title="Notifications" aside="Display only — nothing is sent">
        <Setting label="Volatility moves against a position">
          <Segmented
            options={ONOFF}
            value={settings.notifyVolatility}
            onChange={(v) => patch({ notifyVolatility: v })}
          />
        </Setting>
        <Setting label="Protection is about to lapse">
          <Segmented
            options={ONOFF}
            value={settings.notifyProtectionLapse}
            onChange={(v) => patch({ notifyProtectionLapse: v })}
          />
        </Setting>
        <Setting label="An epoch settles">
          <Segmented
            options={ONOFF}
            value={settings.notifySettlement}
            onChange={(v) => patch({ notifySettlement: v })}
          />
        </Setting>
      </Block>

      <Block title="About">
        <div className="flex flex-col gap-s2 text-t3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms] w-fit"
          >
            Documentation and source →
          </a>
          <span className="num text-t2 text-bone-3">Volatus prototype · local mock data</span>
        </div>
      </Block>
    </div>
  );
}
