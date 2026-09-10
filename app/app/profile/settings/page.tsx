import { Breadcrumb } from "../../components/volatus/AppShell";
import { SettingsView } from "../../components/volatus/SettingsView";

export default function ProfileSettingsPage() {
  return (
    <div className="flex flex-col gap-s5">
      <Breadcrumb
        trail={[{ label: "Portfolio", href: "/app/profile" }, { label: "Settings" }]}
      />
      <SettingsView />
    </div>
  );
}
