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
import { AccountPanel } from "./auth-controls";
import { api } from "@/lib/client";
import { ConnectLikes, IntegrationHome } from "./integrations";
const personalNav = [
  ["discover", "Start", Compass],
  ["taste-dna", "Your likes", Network],
  ["relay", "Suggestions", ArrowUpRight],
  ["proof", "Privacy", ShieldCheck],
] as const;
const studioNav = [
  ["onboarding", "Your business", Building2],
  ["dashboard", "Overview", LayoutDashboard],
  ["analysis", "Find ideas", ChartNoAxesCombined],
  ["advisor", "Review ideas", Compass],
  ["scenarios", "Compare options", GitCompareArrows],
  ["actions", "Your plan", ListChecks],
  ["outcomes", "Results", TrendingUp],
  ["audience", "Audience interests", Users],
  ["reviews", "Rate the ideas", FlaskConical],
  ["team", "Team", Users],
  ["integrations", "Website widget", ArrowUpRight],
] as const;
export default function Workspace() {
  const pathname = usePathname();
  const studio = pathname.startsWith("/studio");
  const section = pathname.split("/")[2] || (studio ? "dashboard" : "discover");
  const [menu, setMenu] = useState(false);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<{
    qloo: boolean;
    model: boolean;
  } | null>(null);
  useEffect(() => {
    api("auth/status")
      .then((a) => setRole(a.role || ""))
      .catch(() => {});
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ qloo: false, model: false }));
  }, []);
  const nav = studio ? studioNav : personalNav;
  const extraIds = [
    "advisor",
    "scenarios",
    "audience",
    "reviews",
    "integrations",
  ];
  const mainNav = studio ? nav.filter(([id]) => !extraIds.includes(id)) : nav;
  const extraNav = studio ? nav.filter(([id]) => extraIds.includes(id)) : [];
  const navLink = ([id, label, Icon]: (typeof nav)[number]) => (
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
  );
  return (
    <div className={`app-shell ${studio ? "studio-shell" : "personal-shell"}`}>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <KeyRound size={25} />
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
          {mainNav.map(navLink)}
          {studio && (
            <details className="more-tools" open={extraIds.includes(section)}>
              <summary>More tools</summary>
              {extraNav.map(navLink)}
            </details>
          )}
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
                  ? role
                    ? "Shared only with your workspace team."
                    : "Records stay in this private session."
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
              {pathname === "/account"
                ? "Account"
                : nav.find((n) => n[0] === section)?.[1] || "Workspace"}
            </strong>
          </div>
          <div>
            <Link href="/account" className="account-link">
              <KeyRound size={16} /> Account
            </Link>
            <span className="local-badge">
              <ShieldCheck size={14} />
              {studio
                ? role
                  ? `${role} access`
                  : "Private demo session"
                : "Saved on this device"}
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
                Suggestions are offline right now. You can still save your likes
                and business work.
              </span>
            </div>
          )}
          {pathname === "/connect" ? (
            <ConnectLikes />
          ) : pathname === "/integrations" ? (
            <IntegrationHome />
          ) : pathname === "/account" ? (
            <AccountPanel />
          ) : studio ? (
            <Studio section={section} model={status?.model ?? false} />
          ) : (
            <Personal section={section} model={status?.model ?? false} />
          )}
        </main>
        <footer>
          <span>TasteKey Relay</span>
          <span>One intelligence, two worlds.</span>
          <Link href="/integrations">Use on other websites</Link>
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
