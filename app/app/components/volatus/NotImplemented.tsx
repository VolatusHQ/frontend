import { PageHead } from "./AppShell";

/** Shared stub for routes whose UX is designed separately. */
export function NotImplementedPage({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PageHead eyebrow={eyebrow} title={title} />
      <div className="ruled pt-s4 flex flex-col gap-s2 max-w-[60ch]">
        <span className="lbl">Not implemented yet</span>
        {note ? <p className="text-t4 text-bone-2 m-0">{note}</p> : null}
      </div>
    </div>
  );
}
