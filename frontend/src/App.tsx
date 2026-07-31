import { useEffect, useState } from "react";
import { captureTokenFromUrl, isAuthed, signIn, signOut } from "./auth";
import { AuthError, fetchConfig, fetchManifest } from "./api";
import { toggleTheme, useTheme } from "./theme";
import type { AppConfig, Component, Manifest } from "./types";
import { AssetTree, DataTableView, Kpis, ScatterPlot, StackedBar, Trend } from "./components";

captureTokenFromUrl();

function renderComponent(c: Component) {
  switch (c.type) {
    case "kpi_cards":
      return <Kpis component={c} />;
    case "trend_chart":
      return <Trend component={c} />;
    case "scatter":
      return <ScatterPlot component={c} />;
    case "stacked_bar":
      return <StackedBar component={c} />;
    case "table":
      return <DataTableView component={c} />;
    case "asset_tree":
      return <AssetTree />;
    default:
      return <div className="nodata">Unsupported: {c.type}</div>;
  }
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthed());
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { dark } = useTheme();

  useEffect(() => {
    if (!authed) return;
    Promise.all([fetchConfig(), fetchManifest()])
      .then(([c, m]) => {
        setCfg(c);
        setManifest(m);
      })
      .catch((e) => {
        if (e instanceof AuthError) setAuthed(false);
        else setErr((e as Error)?.message || "Failed to load");
      });
  }, [authed]);

  if (!authed) {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="logo">A</div>
          <h1>Sign in</h1>
          <p>This app runs on Aditum&apos;s governed data platform. Sign in with your Aditum account to continue.</p>
          <button className="btn" onClick={signIn}>Sign in with Aditum</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>{cfg?.app_name || "Aditum App"}</h1>
          <p>{cfg?.description}</p>
        </div>
        <div className="app-head-right">
          {cfg && (
            <span className="prov" title="Where this app's data comes from">
              {cfg.connectors.length
                ? `Live from ${cfg.connectors.map((c) => c.name).join(", ")} · governed`
                : "governed Aditum data"}
            </span>
          )}
          <button className="btn-ghost" onClick={toggleTheme} title="Toggle light / dark" aria-label="Toggle theme">
            {dark ? "☀" : "☾"}
          </button>
          <button className="btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {err && <div className="banner">{err}</div>}

      <main className="grid">
        {manifest?.components.map((c) => (
          <section className={`card card-${c.type}`} key={c.id}>
            <h3>{c.title}</h3>
            {renderComponent(c)}
          </section>
        ))}
      </main>

      <footer className="foot">
        Read-only · RBAC inherited from Aditum · no credentials in the browser · reference architecture{" "}
        {manifest?.reference_architecture}
      </footer>
    </div>
  );
}
