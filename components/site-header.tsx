import { BrandIcon } from "./icons";
import { SettingsButton } from "./settings-dialog";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand">
        <div className="brand-mark">
          <BrandIcon />
        </div>
        Clayify
      </div>
      <SettingsButton />
    </header>
  );
}
