import { ClayStudio } from "@/components/clay-studio";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="wrap">
      <SiteHeader />

      {/* Static copy, so it stays out of the client bundle. */}
      <div className="hero">
        <span className="eyebrow">AI Photo Studio</span>
        <h1>
          Clay your <em>memories.</em>
        </h1>
        <p className="sub">Upload a photo, pick a style, get clay art in about twenty seconds.</p>
      </div>

      {/* Only the boolean crosses to the client, never the key itself. */}
      <ClayStudio serverKeyConfigured={Boolean(process.env.PICX_API_KEY)} />

      <SiteFooter />
    </div>
  );
}
