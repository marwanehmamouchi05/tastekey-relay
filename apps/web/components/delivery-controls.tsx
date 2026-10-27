"use client";
import { useEffect, useState } from "react";
import type { Analysis, Profile, Review } from "@tastekey/shared-types";
import { Category } from "@tastekey/shared-types";
import { api, download } from "@/lib/client";

export function RecoveryControls({ restore = false }: { restore?: boolean }) {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState("");
  return (
    <section className="panel">
      <h2>{restore ? "Reopen a saved workspace" : "Keep a recovery code"}</h2>
      <p>
        {restore
          ? "A recovery code restores your private Studio workspace and signs out its other sessions. Export this browser’s current workspace first if you need it. Personal tastes stay on this browser."
          : "Create a one-use recovery code before clearing cookies or moving to another device. Anyone holding it can open your Studio records. Keep it private. Creating a new code invalidates the previous one; codes expire after 90 days."}
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {restore ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("recovery/restore", { code: code.trim() });
              location.assign("/studio/dashboard");
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <label className="field-label">
            Recovery code
            <input
              type="password"
              autoComplete="off"
              required
              pattern="[a-f0-9]{64}"
              maxLength={64}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="secondary" disabled={busy}>
            {busy ? "Restoring…" : "Restore workspace"}
          </button>
        </form>
      ) : (
        <>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setCreated(
                  (await api<{ code: string }>("recovery/create", {})).code,
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create recovery code
          </button>
          {created && (
            <div className="notice">
              <p>
                Your recovery code is ready. Download it now; the server stores
                only its hash.
              </p>
              <button
                className="secondary"
                onClick={() =>
                  download("tastekey-recovery-private.json", {
                    code: created,
                    expiresAfterDays: 90,
                    origin: location.origin,
                  })
                }
              >
                Download private recovery code
              </button>
              <button className="text-button" onClick={() => setCreated("")}>
                Hide recovery code
              </button>
              <code className="secret-code" data-testid="recovery-code">
                {created}
              </code>
            </div>
          )}
        </>
      )}
    </section>
  );
}
const dimensions = [
  ["relevance", "Relevance"],
  ["feasibility", "Feasibility"],
  ["specificity", "Specificity"],
  ["grounding", "Cultural grounding"],
  ["traceability", "Traceability"],
] as const;
export function ReviewForm({
  analyses,
  reviews,
  save,
  busy,
}: {
  analyses: Analysis[];
  reviews: Review[];
  save: (input: unknown) => Promise<unknown>;
  busy: boolean;
}) {
  const [analysisId, setId] = useState(""),
    [reviewer, setReviewer] = useState(""),
    [rationale, setRationale] = useState(""),
    [scores, setScores] = useState<Record<string, number>>({}),
    [notice, setNotice] = useState("");
  return (
    <section className="panel">
      <h2>Review the evidence, then score the proposal</h2>
      <p>
        Human review, on a fixed 1–5 scale. Use the same business inputs when
        comparing Qloo-assisted and baseline investigations. These are reviewer
        judgments, not automatic quality measurements.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const saved = await save({
            input: { analysisId, reviewer, rationale, ...scores },
          });
          if (saved) {
            setNotice("Review saved with its exact analysis and timestamp.");
            setRationale("");
          }
        }}
      >
        <label className="field-label">
          Analysis to review
          <select
            required
            value={analysisId}
            onChange={(e) => setId(e.target.value)}
          >
            <option value="">Choose an investigation</option>
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.mode} · {a.input.city} ·{" "}
                {new Date(a.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Reviewer alias
          <input
            required
            minLength={2}
            maxLength={80}
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Use a pseudonym, not personal contact details"
          />
        </label>
        <div className="form-grid">
          {dimensions.map(([key, label]) => (
            <label key={key} className="field-label">
              {label}
              <select
                required
                value={scores[key] || ""}
                onChange={(e) =>
                  setScores({ ...scores, [key]: Number(e.target.value) })
                }
              >
                <option value="">Select score</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} —{" "}
                    {n === 1
                      ? "weak / unsupported"
                      : n === 3
                        ? "partial / needs review"
                        : n === 5
                          ? "strong / traceable"
                          : "between anchors"}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <details>
          <summary>Scoring anchors</summary>
          <p>
            Relevance: unrelated → directly addresses objective. Feasibility:
            violates constraints → fits budget and verified dependencies.
            Specificity: generic → named offering, owner, timing and metric.
            Cultural grounding: unsupported → traceable cultural result with a
            bounded interpretation. Traceability: missing sources → reproducible
            inputs, evidence and limitations.
          </p>
        </details>
        <label className="field-label">
          Review rationale
          <textarea
            required
            minLength={10}
            maxLength={2000}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </label>
        <button className="secondary" disabled={busy || !analyses.length}>
          Save human review
        </button>
        {notice && <p role="status">{notice}</p>}
      </form>
      <h3>Saved reviews ({reviews.length})</h3>
      <p className="microcopy">
        Aliases are self-reported and not verified independent reviewers.
        Reviews are not blinded. No causal or statistical improvement is
        claimed.
      </p>
      {reviews.map((r) => (
        <article className="outcome-record" key={r.id}>
          <strong>{r.reviewer}</strong>
          <small> · {new Date(r.createdAt).toLocaleString()}</small>
          <p>
            {dimensions
              .map(([key, label]) => `${label}: ${r[key]}/5`)
              .join(" · ")}
          </p>
          <p>{r.rationale}</p>
          <small>Analysis {r.analysisId}</small>
        </article>
      ))}
    </section>
  );
}
type Report = {
  suppressed: boolean;
  minimum: number;
  groups: { category: string; count: number }[];
};
export function AudienceOwner({ businessId }: { businessId: string }) {
  const [report, setReport] = useState<Report>(),
    [invitation, setInvitation] = useState(""),
    [error, setError] = useState("");
  async function refresh() {
    try {
      setReport(await api<Report>("audience/report?businessId=" + businessId));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    setInvitation("");
    setReport(undefined);
    void refresh();
  }, [businessId]);
  return (
    <section className="panel">
      <h2>Invite people to share broad interests</h2>
      <p>
        People choose whether to contribute category-level interests. No taste
        names, entity IDs, budgets, browsing history, or contact details are
        collected. Each private participant session contributes at most once per
        business, for 30 days.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button
        className="secondary"
        onClick={async () => {
          try {
            setInvitation(
              (
                await api<{ invitation: string }>("audience/invite", {
                  businessId,
                })
              ).invitation,
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Create or replace audience invitation
      </button>
      {invitation && (
        <div className="notice">
          <p>
            Share this link only with people you want to invite. Replacing it
            expires the previous invitation without withdrawing existing
            contributions.
          </p>
          <a
            className="secret-code"
            href={"/personal/proof#audience=" + invitation}
          >
            {typeof location !== "undefined" ? location.origin : ""}
            /personal/proof#audience={invitation}
          </a>
        </div>
      )}
      <h3>Consented category report</h3>
      <button className="text-button" onClick={refresh}>
        Refresh audience report
      </button>
      {report?.suppressed ? (
        <p className="notice">
          Insufficient consented data. Reporting requires at least{" "}
          {report.minimum} active participant sessions; small groups and small
          complements are suppressed.
        </p>
      ) : report ? (
        <>
          {report.groups.length ? (
            report.groups.map((g) => (
              <p key={g.category}>
                <strong>{g.category}</strong>: {g.count} active contributions
              </p>
            ))
          ) : (
            <p>No categories meet the disclosure rules.</p>
          )}
        </>
      ) : (
        <p>Loading disclosure-safe report…</p>
      )}
      <p className="microcopy">
        Counts represent browser sessions, not verified independent customers.
        No individual records or participant identifiers are exposed to a
        business. Withdrawal and expiry remove contributions from future reports
        immediately. Threshold suppression is not differential privacy; repeated
        reports can still permit inference. A privacy review is required before
        broad real-customer use.
      </p>
    </section>
  );
}
type Own = {
  businessId: string;
  name: string;
  categories: string[];
  expiresAt: string;
};
export function AudienceConsent({ profile }: { profile: Profile }) {
  const [invitation, setInvitation] = useState(""),
    [preview, setPreview] = useState<{ businessId: string; name: string }>(),
    [selected, setSelected] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [own, setOwn] = useState<Own[]>([]),
    [notice, setNotice] = useState("");
  const available = [
    ...new Set(
      profile.nodes
        .filter((n) => ["stated", "confirmed"].includes(n.status))
        .map((n) => n.category),
    ),
  ];
  async function refresh() {
    try {
      setOwn(await api<Own[]>("audience/mine"));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  useEffect(() => {
    setInvitation(
      new URLSearchParams(location.hash.slice(1)).get("audience") || "",
    );
    void refresh();
  }, [profile.nodes.length]);
  return (
    <section className="panel">
      <h2>Share a category summary, by choice</h2>
      <p>
        Your graph stays private. An invitation lets you contribute only the
        broad interest categories you select below to a named business.
        Participation is optional, lasts 30 days, and can be withdrawn here.
        Categories can be stored privately before any aggregate is large enough
        to display.
      </p>
      <label className="field-label">
        Business invitation code
        <input
          value={invitation}
          maxLength={64}
          autoComplete="off"
          onChange={(e) => {
            setInvitation(e.target.value);
            setPreview(undefined);
            setConsent(false);
          }}
        />
      </label>
      <button
        className="secondary"
        disabled={!/^[a-f0-9]{64}$/.test(invitation)}
        onClick={async () => {
          try {
            setPreview(await api("audience/preview", { invitation }));
            setNotice("");
          } catch (e) {
            setNotice((e as Error).message);
          }
        }}
      >
        Review audience invitation
      </button>
      {preview && (
        <div className="notice">
          <h3>Recipient: {preview.name}</h3>
          <p>
            Select the categories this business may count. No preference labels
            or spending details will be sent.
          </p>
          {available.map((c) => (
            <label className="checkbox-label" key={c}>
              <input
                type="checkbox"
                checked={selected.includes(c)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, c]
                      : selected.filter((v) => v !== c),
                  )
                }
              />
              {c}
            </label>
          ))}
          {!available.length && (
            <p>
              Add a stated or confirmed taste first to contribute a category.
            </p>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I consent to this category summary being stored for this business
            for 30 days.
          </label>
          <button
            className="secondary"
            disabled={!consent || !selected.length}
            onClick={async () => {
              try {
                await api("audience/contribute", {
                  invitation,
                  categories: selected.filter(
                    (c) =>
                      Category.options.includes(c as any) &&
                      available.includes(c as any),
                  ),
                  consent: true,
                });
                setNotice(
                  "Category contribution saved. You can withdraw it below.",
                );
                setConsent(false);
                await refresh();
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Share selected category summary
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <h3>Your active audience contributions</h3>
      {!own.length && <p>No active category contributions.</p>}
      {own.map((c) => (
        <article className="outcome-record" key={c.businessId}>
          <strong>{c.name}</strong>
          <p>
            {c.categories.join(", ")} · expires{" "}
            {new Date(c.expiresAt).toLocaleDateString()}
          </p>
          <button
            className="text-button"
            onClick={async () => {
              try {
                await api("audience/withdraw", { businessId: c.businessId });
                await refresh();
                setNotice("Contribution withdrawn. Future reports exclude it.");
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Withdraw category contribution
          </button>
        </article>
      ))}
      <p className="microcopy">
        Contributions are linked to this private cookie, so retain the cookie or
        a Studio recovery code to withdraw on another device. Previously viewed
        reports or downloaded exports cannot be recalled.
      </p>
    </section>
  );
}
