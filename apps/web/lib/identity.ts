import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, newSession, revokeSessions } from "./db";
export type Role = "owner" | "admin" | "editor" | "viewer";
export class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
export const digest = (v: string) =>
  createHash("sha256").update(v).digest("hex");
export function identity(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    (db()
      .prepare(
        `SELECT u.id,u.email,s.workspace,m.role FROM auth_sessions s JOIN auth_users u ON u.id=s.user JOIN memberships m ON m.workspace=s.workspace AND m.user=s.user JOIN sessions t ON t.token=s.token WHERE s.token=? AND s.expires>? AND t.expires>?`,
      )
      .get(digest(token), Date.now(), Date.now()) as
      | { id: string; email: string; workspace: string; role: Role }
      | undefined) || null
  );
}
export function audit(
  workspace: string,
  actor: string,
  action: string,
  detail: string,
) {
  db()
    .prepare("INSERT INTO audit_events VALUES (?,?,?,?,?,?)")
    .run(
      randomUUID(),
      workspace,
      actor,
      action,
      detail.slice(0, 500),
      Date.now(),
    );
}
export function requireRole(token: string | undefined, roles: Role[]) {
  const who = identity(token);
  if (!who)
    throw new AccessError(
      "Sign in with a verified account to manage your team.",
      401,
    );
  if (!roles.includes(who.role))
    throw new AccessError("Your workspace role does not allow this action.");
  return who;
}
export function assertWrite(token: string | undefined, ownerOnly = false) {
  const who = identity(token);
  if (
    who &&
    !(ownerOnly ? ["owner"] : ["owner", "admin", "editor"]).includes(who.role)
  )
    throw new AccessError("Your workspace role does not allow this action.");
}
export function completeSignIn(
  claims: { iss: string; sub: string; email: string; email_verified?: unknown },
  guestTenant?: string | null,
) {
  if (
    claims.email_verified !== true ||
    !claims.sub ||
    !claims.iss ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
  )
    throw new AccessError(
      "Verify your email with the sign-in provider before continuing.",
      401,
    );
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    let user = conn
      .prepare("SELECT id,home FROM auth_users WHERE issuer=? AND subject=?")
      .get(claims.iss, claims.sub) as { id: string; home: string } | undefined;
    if (!user) {
      const id = randomUUID();
      const home =
        guestTenant &&
        !conn
          .prepare("SELECT 1 FROM auth_workspaces WHERE id=?")
          .get(guestTenant)
          ? guestTenant
          : randomUUID();
      user = { id, home };
      conn
        .prepare("INSERT INTO auth_users VALUES (?,?,?,?,?)")
        .run(id, claims.iss, claims.sub, claims.email.toLowerCase(), home);
      conn
        .prepare("INSERT INTO auth_workspaces VALUES (?,?)")
        .run(home, "My TasteKey studio");
      conn
        .prepare("INSERT INTO memberships VALUES (?,?,?)")
        .run(home, id, "owner");
      revokeSessions(home);
      conn.prepare("DELETE FROM recovery_codes WHERE tenant=?").run(home);
      audit(
        home,
        id,
        "workspace.claim",
        "Private workspace secured with verified sign-in.",
      );
    } else
      conn
        .prepare("UPDATE auth_users SET email=? WHERE id=?")
        .run(claims.email.toLowerCase(), user.id);
    let home = user.home;
    if (
      guestTenant &&
      guestTenant !== home &&
      !conn
        .prepare("SELECT 1 FROM auth_workspaces WHERE id=?")
        .get(guestTenant) &&
      conn
        .prepare("SELECT 1 FROM records WHERE tenant=? LIMIT 1")
        .get(guestTenant)
    ) {
      home = guestTenant;
      conn
        .prepare("INSERT INTO auth_workspaces VALUES (?,?)")
        .run(home, "Recovered private studio");
      conn
        .prepare("INSERT INTO memberships VALUES (?,?,?)")
        .run(home, user.id, "owner");
      revokeSessions(home);
      conn.prepare("DELETE FROM recovery_codes WHERE tenant=?").run(home);
      conn
        .prepare("UPDATE auth_users SET home=? WHERE id=?")
        .run(home, user.id);
      audit(
        home,
        user.id,
        "workspace.claim",
        "Private draft preserved during verified sign-in.",
      );
    }
    if (
      !conn
        .prepare("SELECT 1 FROM memberships WHERE workspace=? AND user=?")
        .get(home, user.id)
    ) {
      const first = conn
        .prepare("SELECT workspace FROM memberships WHERE user=? LIMIT 1")
        .get(user.id) as { workspace: string } | undefined;
      if (first) home = first.workspace;
      else {
        home = randomUUID();
        conn
          .prepare("INSERT INTO auth_workspaces VALUES (?,?)")
          .run(home, "My TasteKey studio");
        conn
          .prepare("INSERT INTO memberships VALUES (?,?,?)")
          .run(home, user.id, "owner");
      }
      conn
        .prepare("UPDATE auth_users SET home=? WHERE id=?")
        .run(home, user.id);
    }
    const token = newSession();
    conn
      .prepare("INSERT INTO auth_sessions VALUES (?,?,?,?)")
      .run(digest(token), user.id, home, Date.now() + 8 * 3600000);
    conn.exec("COMMIT");
    return token;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}
export function signOut(token?: string) {
  if (!token) return;
  db().prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
  db().prepare("DELETE FROM auth_sessions WHERE token=?").run(digest(token));
}
export function accountInfo(token?: string) {
  const who = identity(token);
  if (!who) return { signedIn: false, workspaces: [] };
  return {
    signedIn: true,
    ...who,
    workspaces: db()
      .prepare(
        "SELECT w.id,w.name,m.role FROM memberships m JOIN auth_workspaces w ON w.id=m.workspace WHERE m.user=?",
      )
      .all(who.id),
  };
}
export function switchWorkspace(token: string, workspace: string) {
  const who = identity(token);
  if (
    !who ||
    !db()
      .prepare("SELECT 1 FROM memberships WHERE workspace=? AND user=?")
      .get(workspace, who.id)
  )
    throw new AccessError("Workspace is not available.");
  db()
    .prepare("UPDATE auth_sessions SET workspace=? WHERE token=?")
    .run(workspace, digest(token));
  db()
    .prepare("UPDATE auth_users SET home=? WHERE id=?")
    .run(workspace, who.id);
}

export function renameWorkspace(token: string, name: string) {
  const who = requireRole(token, ["owner", "admin"]);
  db()
    .prepare("UPDATE auth_workspaces SET name=? WHERE id=?")
    .run(name, who.workspace);
  audit(who.workspace, who.id, "workspace.rename", "Workspace name updated.");
}
export function revokeInvite(token: string, email: string) {
  const who = requireRole(token, ["owner", "admin"]);
  const target = db()
    .prepare("SELECT role FROM team_invites WHERE workspace=? AND email=?")
    .get(who.workspace, email.toLowerCase()) as { role: Role } | undefined;
  if (target?.role === "admin" && who.role !== "owner")
    throw new AccessError(
      "Only the owner can manage administrator invitations.",
    );
  db()
    .prepare("DELETE FROM team_invites WHERE workspace=? AND email=?")
    .run(who.workspace, email.toLowerCase());
  audit(who.workspace, who.id, "invite.revoke", "Pending invitation revoked.");
}
export function team(token: string) {
  const who = requireRole(token, ["owner", "admin", "editor", "viewer"]);
  return {
    role: who.role,
    members: db()
      .prepare(
        "SELECT u.id,u.email,m.role FROM memberships m JOIN auth_users u ON u.id=m.user WHERE m.workspace=?",
      )
      .all(who.workspace),
    invites: ["owner", "admin"].includes(who.role)
      ? db()
          .prepare(
            "SELECT email,role,expires FROM team_invites WHERE workspace=? AND expires>?",
          )
          .all(who.workspace, Date.now())
      : [],
    audit: ["owner", "admin"].includes(who.role)
      ? db()
          .prepare(
            "SELECT action,detail,at FROM audit_events WHERE workspace=? ORDER BY at DESC LIMIT 50",
          )
          .all(who.workspace)
      : [],
  };
}
export function inviteMember(
  token: string,
  email: string,
  role: Exclude<Role, "owner">,
) {
  const who = requireRole(token, ["owner", "admin"]);
  if (who.role === "admin" && role === "admin")
    throw new AccessError("Only the owner can invite another administrator.");
  const code = randomBytes(32).toString("hex");
  db()
    .prepare("DELETE FROM team_invites WHERE workspace=? AND email=?")
    .run(who.workspace, email.toLowerCase());
  db()
    .prepare("INSERT INTO team_invites VALUES (?,?,?,?,?)")
    .run(
      digest(code),
      who.workspace,
      email.toLowerCase(),
      role,
      Date.now() + 7 * 86400000,
    );
  audit(
    who.workspace,
    who.id,
    "member.invite",
    `Invited ${role}; invitation expires in 7 days.`,
  );
  return code;
}
export function acceptInvite(token: string, code: string) {
  const who = requireRole(token, ["owner", "admin", "editor", "viewer"]);
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const invite = conn
      .prepare(
        "SELECT workspace,email,role FROM team_invites WHERE digest=? AND expires>?",
      )
      .get(digest(code), Date.now()) as
      { workspace: string; email: string; role: Role } | undefined;
    if (!invite || invite.email !== who.email.toLowerCase())
      throw new AccessError(
        "Invitation is invalid, expired, or belongs to a different verified email.",
      );
    if (
      !conn
        .prepare("SELECT 1 FROM memberships WHERE workspace=? AND user=?")
        .get(invite.workspace, who.id)
    )
      conn
        .prepare("INSERT INTO memberships VALUES (?,?,?)")
        .run(invite.workspace, who.id, invite.role);
    conn.prepare("DELETE FROM team_invites WHERE digest=?").run(digest(code));
    conn
      .prepare("UPDATE auth_sessions SET workspace=? WHERE token=?")
      .run(invite.workspace, digest(token));
    audit(
      invite.workspace,
      who.id,
      "member.join",
      "Email-bound invitation accepted.",
    );
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}
export function changeMember(
  token: string,
  user: string,
  role: Exclude<Role, "owner"> | "remove",
) {
  const who = requireRole(token, ["owner", "admin"]);
  const target = db()
    .prepare("SELECT role FROM memberships WHERE workspace=? AND user=?")
    .get(who.workspace, user) as { role: Role } | undefined;
  if (!target) throw new AccessError("Member not found.", 404);
  if (target.role === "owner" || user === who.id)
    throw new AccessError(
      "The owner cannot be removed and members cannot change their own role here.",
    );
  if (who.role === "admin" && (target.role === "admin" || role === "admin"))
    throw new AccessError("Only the owner can manage administrators.");
  if (role === "remove")
    db()
      .prepare("DELETE FROM memberships WHERE workspace=? AND user=?")
      .run(who.workspace, user);
  else
    db()
      .prepare("UPDATE memberships SET role=? WHERE workspace=? AND user=?")
      .run(role, who.workspace, user);
  audit(
    who.workspace,
    who.id,
    "member.change",
    role === "remove"
      ? "Membership revoked immediately."
      : `Membership changed to ${role}.`,
  );
}
export function transferOwnership(token: string, user: string) {
  const who = requireRole(token, ["owner"]);
  if (
    user === who.id ||
    !db()
      .prepare("SELECT 1 FROM memberships WHERE workspace=? AND user=?")
      .get(who.workspace, user)
  )
    throw new AccessError("Choose another existing member.");
  db().exec("BEGIN IMMEDIATE");
  try {
    db()
      .prepare(
        "UPDATE memberships SET role='admin' WHERE workspace=? AND user=?",
      )
      .run(who.workspace, who.id);
    db()
      .prepare(
        "UPDATE memberships SET role='owner' WHERE workspace=? AND user=?",
      )
      .run(who.workspace, user);
    audit(
      who.workspace,
      who.id,
      "workspace.transfer",
      "Ownership transferred to an existing member.",
    );
    db().exec("COMMIT");
  } catch (e) {
    db().exec("ROLLBACK");
    throw e;
  }
}
export function verifiedParticipant(token: string) {
  const who = requireRole(token, ["owner", "admin", "editor", "viewer"]);
  const participant = digest("tastekey-audience:" + who.id);
  db()
    .prepare("INSERT OR IGNORE INTO verified_audience VALUES (?,?)")
    .run(participant, who.id);
  return participant;
}
