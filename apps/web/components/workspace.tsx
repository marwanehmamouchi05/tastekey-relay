"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Aperture,
  Compass,
  Network,
  ArrowUpRight,
  ShieldCheck,
  FlaskConical,
  LayoutDashboard,
  Building2,
  ChartNoAxesCombined,
  GitCompareArrows,
  ListChecks,
  TrendingUp,
  Users,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  KeyRound,
  Info,
} from "lucide-react";
import Personal from "./personal";
import Studio from "./studio";
const personalNav = [
  ["discover", "Discover", Compass],
  ["taste-dna", "Taste DNA", Network],
  ["relay", "Relay experiences", ArrowUpRight],
  ["proof", "Proof & privacy", FlaskConical],
] as const;
const studioNav = [
  ["onboarding", "Business setup", Building2],
  ["dashboard", "Dashboard", LayoutDashboard],
  ["analysis", "Cultural analysis", ChartNoAxesCombined],
  ["advisor", "Strategy advisor", Compass],
  ["scenarios", "Scenarios", GitCompareArrows],
  ["actions", "Action plans", ListChecks],
  ["outcomes", "Outcome tracking", TrendingUp],
  ["audience", "Customer intelligence", Users],
  ["reviews", "Human evaluation", FlaskConical],
] as const;
export default function Workspace() {
  const pathname = usePathname();
  const studio = pathname.startsWith("/studio");
  const section = pathname.split("/")[2] || (studio ? "dashboard" : "discover");
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState<{
    qloo: boolean;
    model: boolean;
  } | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ qloo: false, model: false }));
  }, []);
  const nav = studio ? studioNav : personalNav;
  return (
    <div className={`app-shell ${studio ? "studio-shell" : ""}`}>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Aperture size={25} />
          </span>
          <span>
            TasteKey<span className="brand-sub">Relay</span>
          </span>
        </Link>
        <div className="product-switch" aria-label="Product">
          <Link className={!studio ? "selected" : ""} href="/personal/discover">
            Personal
          </Link>
          <Link className={studio ? "selected" : ""} href="/studio/dashboard">
            Studio <span>↗</span>
          </Link>
        </div>
        <div className="workspace-label">
          {studio ? "Your business workspace" : "Your personal workspace"}
        </div>
        <nav aria-label="Main navigation">
          {nav.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={`/${studio ? "studio" : "personal"}/${id}`}
              onClick={() => setMenu(false)}
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {section === id && <ChevronRight size={15} />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={21} />
            <div>
              <strong>
                {studio ? "Private by business" : "Your taste belongs to you"}
              </strong>
              <p>
                {studio
                  ? "Records stay in this private session."
                  : "Stored on this browser. Shared by choice."}
              </p>
            </div>
          </div>
          <Link
            href={studio ? "/personal/discover" : "/studio/onboarding"}
            className="other-product"
          >
            {studio ? "Explore your own taste" : "Meet TasteKey Studio"}
            <ArrowUpRight size={16} />
          </Link>
          <div className="engine-status">
            <span className={`status-dot ${status?.qloo ? "online" : ""}`} />
            {status === null
              ? "Checking Qloo connection"
              : status.qloo
                ? "Qloo credential configured"
                : "Qloo credential pending"}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
            <span className="crumb">{studio ? "Studio" : "Personal"}</span>
            <ChevronRight size={13} />
            <strong>
              {nav.find((n) => n[0] === section)?.[1] || "Workspace"}
            </strong>
          </div>
          <div>
            <span className="local-badge">
              <ShieldCheck size={14} />
              {studio ? "Private demo session" : "Local-first profile"}
            </span>
            <span className="avatar">
              {studio ? <Building2 size={17} /> : <KeyRound size={17} />}
            </span>
          </div>
        </header>
        <main id="main-content">
          {status && !status.qloo && (
            <div className="connection-banner">
              <Info size={16} />
              <span>
                Qloo access is pending. You can build your profile and manage
                your business. Cultural results appear only after a live
                connection.
              </span>
            </div>
          )}
          {studio ? (
            <Studio section={section} model={status?.model ?? false} />
          ) : (
            <Personal section={section} model={status?.model ?? false} />
          )}
        </main>
        <footer>
          <span>TasteKey Relay</span>
          <span>One intelligence, two worlds.</span>
          <a
            href="https://github.com/qloo/qloo-hackathon-kit"
            target="_blank"
            rel="noreferrer"
          >
            Built for the Qloo Agentic Hackathon <ArrowUpRight size={12} />
          </a>
        </footer>
      </div>
    </div>
  );
}
