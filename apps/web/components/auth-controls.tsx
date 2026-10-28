"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  LogIn,
  LogOut,
  Mail,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/client";
type Account = {
  configured: boolean;
  signedIn: boolean;
  id?: string;
  email?: string;
  workspace?: string;
  role?: string;
  workspaces: { id: string; name: string; role: string }[];
};
export function SignInLink({
  returnTo = "/account",
  children = "Sign in securely",
}: {
  returnTo?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      className="primary"
      href={"/api/auth/start?returnTo=" + encodeURIComponent(returnTo)}
      onClick={() => {
        if (location.hash)
          sessionStorage.setItem("tastekey.return.hash", location.hash);
      }}
    >
      <LogIn size={17} />
      {children}
    </a>
  );
}
export function AccountPanel() {
  const [account, setAccount] = useState<Account>(),
    [error, setError] = useState("");
  useEffect(() => {
    api<Account>("auth/status")
      .then(setAccount)
      .catch((e) => setError(e.message));
    if (new URLSearchParams(location.search).has("auth"))
      setError(
        "Sign-in did not complete. Verify your email with the provider and try again.",
      );
  }, []);
  return (
    <div className="account-layout">
      <section className="account-story">
        <span className="story-symbol">
          <KeyRound size={34} />
        </span>
        <h1>
          Your taste.
          <br />
          Your people.
          <br />
          One secure home.
        </h1>
        <p>
          Keep personal discovery private. Bring the right people into your
          business workspace, with access you control.
        </p>
        <ul className="benefit-list">
          <li>
            <ShieldCheck size={20} /> Verified email sign-in
          </li>
          <li>
            <Users size={20} /> Owners, admins, editors and viewers
          </li>
          <li>
            <Mail size={20} /> Invitations bound to the intended email
          </li>
        </ul>
      </section>
      <section className="panel account-card">
        <h2>{account?.signedIn ? "You’re signed in" : "Make it yours"}</h2>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {!account ? (
          <p>Checking your account…</p>
        ) : account.signedIn ? (
          <>
            <p className="identity-email">
              <ShieldCheck size={20} />
              {account.email}
            </p>
            <span className="role-badge">{account.role}</span>
            <p>
              Your email was verified by the sign-in provider. This confirms
              account access, not a unique person or a verified business.
            </p>
            <Link className="primary" href="/studio/team">
              Manage your team <Users size={17} />
            </Link>
            <Link className="secondary" href="/personal/proof">
              Review audience sharing
            </Link>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const result = await api<{ logout?: string }>(
                    "auth/logout",
                    {},
                  );
                  location.assign(result.logout || "/account");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={16} />
              Sign out of TasteKey
            </button>
            <p className="microcopy">
              TasteKey sessions last up to eight hours. Sign-out also clears the
              configured identity provider session.
            </p>
          </>
        ) : (
          <>
            <p>
              Use secure sign-in to recover your Studio workspace, collaborate
              with a team and contribute verified-account audience insights.
            </p>
            {account.configured ? (
              <SignInLink />
            ) : (
              <p className="notice">
                Secure sign-in is temporarily unavailable. You can still explore
                privately below.
              </p>
            )}
            <Link className="secondary" href="/personal/discover">
              Explore without an account
            </Link>
            <p className="microcopy">
              First sign-in secures this browser’s private Studio workspace.
              Returning accounts reopen their workspace; any new private Studio
              work is preserved as a separate workspace. Your Personal taste
              graph stays on this browser.
            </p>
            <details>
              <summary>What is shared when I sign in?</summary>
              <p>
                Your identity provider verifies your email. TasteKey stores its
                account identifier, verified email and workspace membership.
                Audience reports never include your email or account identifier.
                Sign-in does not upload your taste graph.
              </p>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
const roleDescriptions = {
  owner: "Controls the workspace, team and ownership.",
  admin: "Manages editors, viewers and business operations.",
  editor: "Creates analyses, strategies, plans and outcomes.",
  viewer: "Reads and exports the shared workspace.",
};
type TeamData = {
  role: string;
  members: { id: string; email: string; role: string }[];
  invites: { email: string; role: string; expires: number }[];
  audit: { action: string; detail: string; at: number }[];
};
export function TeamPanel() {
  const [account, setAccount] = useState<Account>(),
    [data, setData] = useState<TeamData>(),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("editor"),
    [link, setLink] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  async function refresh() {
    const a = await api<Account>("auth/status");
    setAccount(a);
    if (a.signedIn) setData(await api<TeamData>("team"));
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const hash =
      location.hash || sessionStorage.getItem("tastekey.return.hash") || "";
    setCode(new URLSearchParams(hash.slice(1)).get("invite") || "");
    sessionStorage.removeItem("tastekey.return.hash");
  }, []);
  async function act(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const result = await api(path, body);
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const manage = data && ["owner", "admin"].includes(data.role);
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Good ideas need good company.</h1>
          <p>A shared Studio, with a clear role for everyone.</p>
        </div>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!account ? (
        <p>Opening your team…</p>
      ) : !account.signedIn ? (
        <section className="panel">
          <h2>Your team starts with secure sign-in</h2>
          <p>
            Verify your email before inviting people or joining their workspace.
            Your private demo remains available.
          </p>
          {account.configured ? (
            <SignInLink returnTo="/studio/team" />
          ) : (
            <Link className="secondary" href="/account">
              View sign-in status
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className="team-switcher">
            <label className="field-label">
              Active workspace
              <select
                value={account.workspace}
                onChange={async (e) => {
                  if (await act("team/switch", { workspaceId: e.target.value }))
                    location.assign("/studio/team");
                }}
              >
                {account.workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
            </label>
            <span className="role-badge">Your role: {data?.role}</span>
          </div>
          {manage && (
            <form
              className="panel"
              onSubmit={async (e) => {
                e.preventDefault();
                const name = new FormData(e.currentTarget).get("name");
                await act("team/name", { name });
              }}
            >
              <label className="field-label">
                Workspace name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  key={account.workspace}
                  defaultValue={
                    account.workspaces.find((w) => w.id === account.workspace)
                      ?.name
                  }
                />
              </label>
              <button className="secondary" disabled={busy}>
                Save workspace name
              </button>
            </form>
          )}
          <div className="role-guide">
            {Object.entries(roleDescriptions).map(([r, text]) => (
              <div key={r}>
                <strong>{r}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="team-grid">
            <section className="panel">
              <h2>People in this workspace</h2>
              <div className="member-list">
                {data?.members.map((m) => (
                  <div className="member-row" key={m.id}>
                    <div>
                      <strong>{m.email}</strong>
                      <small>
                        {m.id === account.id ? "You" : "Verified email account"}
                      </small>
                    </div>
                    <span className="role-badge">{m.role}</span>
                    {manage &&
                      m.id !== account.id &&
                      m.role !== "owner" &&
                      (data?.role === "owner" || m.role !== "admin") && (
                        <>
                          <select
                            aria-label={"Role for " + m.email}
                            value={m.role}
                            disabled={busy}
                            onChange={(e) =>
                              void act("team/member", {
                                userId: m.id,
                                role: e.target.value,
                              })
                            }
                          >
                            {(data?.role === "owner"
                              ? ["admin", "editor", "viewer"]
                              : ["editor", "viewer"]
                            ).map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            className="text-button danger"
                            disabled={busy}
                            onClick={() =>
                              void act("team/member", {
                                userId: m.id,
                                role: "remove",
                              })
                            }
                          >
                            Remove
                          </button>
                        </>
                      )}
                    {data?.role === "owner" && m.id !== account.id && (
                      <details>
                        <summary>Transfer ownership</summary>
                        <p>
                          This makes you an admin and gives this member full
                          workspace control.
                        </p>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            void act("team/transfer", { userId: m.id })
                          }
                        >
                          Confirm ownership transfer
                        </button>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <h2>
                {manage
                  ? "Invite your next collaborator"
                  : "Join another workspace"}
              </h2>
              {manage && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const result = await act("team/invite", { email, role });
                    if (result) {
                      setLink(
                        location.origin +
                          "/studio/team#invite=" +
                          result.invitation,
                      );
                      setCopied(false);
                    }
                  }}
                >
                  <label className="field-label">
                    Teammate email
                    <input
                      type="email"
                      autoComplete="off"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Invitation role
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      {(data?.role === "owner"
                        ? ["admin", "editor", "viewer"]
                        : ["editor", "viewer"]
                      ).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <button className="primary" disabled={busy}>
                    Create team invitation
                  </button>
                  <p className="microcopy">
                    Share the generated link yourself. It expires after seven
                    days and only the intended verified email can accept it.
                    Creating a new invitation for that email replaces the old
                    one.
                  </p>
                </form>
              )}
              {link && (
                <div className="notice">
                  <a className="secret-code" href={link}>
                    {link}
                  </a>
                  <button
                    className="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setCopied(true);
                      } catch {
                        setError("Copy the invitation link above manually.");
                      }
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                    {copied ? "Copied" : "Copy invitation"}
                  </button>
                </div>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await act("team/accept", { invitation: code }))
                    location.assign("/studio/dashboard");
                }}
              >
                <label className="field-label">
                  Team invitation code
                  <input
                    autoComplete="off"
                    required
                    pattern="[a-f0-9]{64}"
                    maxLength={64}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <button
                  className="secondary"
                  disabled={busy || code.length !== 64}
                >
                  Join invited workspace
                </button>
              </form>
            </section>
          </div>
          {manage && (
            <section className="panel audit-panel">
              <h2>Recent access changes</h2>
              {data?.audit.map((a, i) => (
                <p key={i}>
                  <time>{new Date(a.at).toLocaleString()}</time> {a.detail}
                </p>
              ))}
              {!!data?.invites.length && (
                <details>
                  <summary>Pending invitations ({data.invites.length})</summary>
                  {data.invites.map((i) => (
                    <p key={i.email}>
                      {i.email} — {i.role}; expires{" "}
                      {new Date(i.expires).toLocaleDateString()}
                      {(data.role === "owner" || i.role !== "admin") && (
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={() =>
                            void act("team/revoke-invite", { email: i.email })
                          }
                        >
                          Revoke invitation
                        </button>
                      )}
                    </p>
                  ))}
                </details>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
