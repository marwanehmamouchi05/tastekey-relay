"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowUpRight,
  Plus,
  Search,
  Check,
  Play,
  GitCompareArrows,
  ListChecks,
  TrendingUp,
  ShieldCheck,
  Download,
  Trash2,
  ChartNoAxesCombined,
  Users,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type {
  Workspace,
  Business,
  BusinessInput,
  Analysis,
  Entity,
  QlooEvidence,
  Strategy,
  Action,
  Outcome,
} from "@tastekey/shared-types";
import { api, download } from "@/lib/client";
import { PageTitle } from "./personal";
const blank: BusinessInput = {
  name: "",
  industry: "cinema",
  city: "",
  catalog: "",
  audience: "",
  positioning: "",
  competitors: "",
  goal: "",
  budget: 0,
  currency: "USD",
  constraints: "",
  seeds: [],
};
export default function Studio({
  section,
  model,
}: {
  section: string;
  model: boolean;
}) {
  const [data, setData] = useState<Workspace>({
    businesses: [],
    analyses: [],
    actions: [],
    outcomes: [],
  });
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    const value = await api<Workspace>("workspace");
    setData(value);
    return value;
  }
  useEffect(() => {
    setSelected(localStorage.getItem("tastekey.business") || "");
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (selected) localStorage.setItem("tastekey.business", selected);
    else if (data.businesses.length) setSelected(data.businesses[0].id);
  }, [selected, data.businesses]);
  const business = data.businesses.find((b) => b.id === selected);
  const analyses = data.analyses.filter((a) => a.businessId === business?.id);
  const actions = data.actions.filter((a) => a.businessId === business?.id);
  const outcomes = data.outcomes.filter((o) => o.businessId === business?.id);
  async function mutate<T = any>(
    path: string,
    body: unknown,
  ): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      const result = await api<T>(path, body);
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ctx = { business, analyses, actions, outcomes, mutate, busy, model };
  if (!ready)
    return (
      <div className="loading">Opening your private business workspace…</div>
    );
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button className="text-button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="business-toolbar">
        <div>
          <span className="tag blue">
            <Building2 size={13} /> Studio workspace
          </span>
          <select
            aria-label="Active business"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="__new__">New business</option>
            {data.businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.city}
              </option>
            ))}
          </select>
        </div>
        <button
          className="text-button"
          onClick={() => download("tastekey-studio.json", data)}
        >
          <Download size={14} />
          Export workspace
        </button>
      </div>
      {section === "onboarding" ? (
        <>
          <PageTitle
            title={
              business
                ? "Make the context count."
                : "Every business has a cultural edge."
            }
            description="Tell Studio what you offer, who you want to reach, and what a practical success looks like."
            action={
              business && (
                <button
                  className="secondary"
                  onClick={() => setSelected("__new__")}
                >
                  <Plus size={16} />
                  New business
                </button>
              )
            }
          />
          <BusinessForm
            key={business?.id || "new"}
            business={business}
            busy={busy}
            save={async (input) => {
              const result = await mutate<Business>("business", {
                id: business?.id,
                input,
              });
              if (result) {
                setSelected(result.id);
                setNotice(
                  "Business saved in your private server-side workspace.",
                );
              }
            }}
          />
        </>
      ) : !business ? (
        <>
          <PageTitle
            title="A clearer direction for your business."
            description="Ground your next move in cultural evidence, then learn from what actually happens."
          />
          <section className="studio-welcome">
            <div className="studio-welcome-art">
              <Building2 size={58} />
              <span className="orbit one" />
              <span className="orbit two" />
              <span className="floating-label label-a">Culture</span>
              <span className="floating-label label-b">Evidence</span>
              <span className="floating-label label-c">Action</span>
            </div>
            <div>
              <h2>
                Start with your business.
                <br />
                Build toward your next move.
              </h2>
              <p>
                Save a profile, review cultural references, investigate
                opportunities, and turn a strategy into a measurable experiment.
              </p>
              <Link className="primary" href="/studio/onboarding">
                Set up your business
                <ArrowUpRight size={17} />
              </Link>
              <small>
                Private demo sessions · Persistent records · No personal taste
                graphs
              </small>
            </div>
          </section>
        </>
      ) : section === "dashboard" ? (
        <Dashboard {...ctx} />
      ) : section === "analysis" || section === "advisor" ? (
        <AnalysisView {...ctx} advisor={section === "advisor"} />
      ) : section === "scenarios" ? (
        <Scenarios {...ctx} />
      ) : section === "actions" ? (
        <ActionsView {...ctx} />
      ) : section === "outcomes" ? (
        <OutcomesView {...ctx} />
      ) : section === "audience" ? (
        <Audience />
      ) : (
        <PageTitle
          title="Page not found"
          description="Choose a view from the navigation."
        />
      )}
      {section === "dashboard" && (
        <section className="panel workspace-controls">
          <div>
            <h3>Private session controls</h3>
            <p>
              Business records are tied to this browser’s private cookie, which
              expires in 30 days. Export records before clearing cookies;
              account sync and recovery are not implemented.
            </p>
          </div>
          <button
            className="danger"
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete all businesses, analyses, plans and outcomes in this session?",
                )
              )
                return;
              try {
                await api("workspace", undefined, "DELETE");
                localStorage.removeItem("tastekey.business");
                location.reload();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Trash2 size={15} />
            Delete workspace
          </button>
        </section>
      )}
    </>
  );
}
type Ctx = {
  business?: Business;
  analyses: Analysis[];
  actions: Action[];
  outcomes: Outcome[];
  mutate: <T = any>(path: string, body: unknown) => Promise<T | undefined>;
  busy: boolean;
  model: boolean;
};
function BusinessForm({
  business,
  busy,
  save,
}: {
  business?: Business;
  busy: boolean;
  save: (input: BusinessInput) => void;
}) {
  const [form, setForm] = useState<BusinessInput>(business || blank);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("movie");
  const [results, setResults] = useState<Entity[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const field = (key: keyof BusinessInput, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function search() {
    setSearching(true);
    setError("");
    try {
      const data = await api<QlooEvidence>("search", { query, category });
      setResults(data.entities);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(form);
      }}
      className="business-form"
    >
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>The business, in your words</h2>
            <p>
              Business inputs are your statements, not externally verified
              facts.
            </p>
          </div>
          <Building2 size={24} />
        </div>
        <div className="form-grid">
          <label className="field-label">
            Business name
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="e.g. Atlas Picture House"
            />
          </label>
          <label className="field-label">
            Category
            <select
              value={form.industry}
              onChange={(e) => field("industry", e.target.value)}
            >
              {[
                ["cinema", "Cinema & culture"],
                ["bookshop", "Bookshop"],
                ["cafe", "Café & hospitality"],
                ["retail", "Retail"],
                ["travel", "Travel experiences"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            City or market
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.city}
              onChange={(e) => field("city", e.target.value)}
              placeholder="Casablanca, Morocco"
            />
          </label>
          <label className="field-label">
            Audience
            <input
              maxLength={1000}
              value={form.audience}
              onChange={(e) => field("audience", e.target.value)}
              placeholder="Local film lovers seeking independent cinema"
            />
          </label>
        </div>
        <label className="field-label">
          Products, services and catalog
          <textarea
            required
            minLength={3}
            maxLength={2000}
            value={form.catalog}
            onChange={(e) => field("catalog", e.target.value)}
            placeholder="What do you offer today?"
          />
        </label>
        <div className="form-grid">
          <label className="field-label">
            Positioning
            <input
              maxLength={1000}
              value={form.positioning}
              onChange={(e) => field("positioning", e.target.value)}
              placeholder="How do you want the experience to feel?"
            />
          </label>
          <label className="field-label">
            Competitors (optional)
            <input
              maxLength={1000}
              value={form.competitors}
              onChange={(e) => field("competitors", e.target.value)}
              placeholder="Only businesses you want to compare against"
            />
          </label>
        </div>
      </section>
      <section className="panel">
        <h2>What would progress look like?</h2>
        <label className="field-label">
          Primary objective
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={form.goal}
            onChange={(e) => field("goal", e.target.value)}
            placeholder="Increase attendance at a weekly independent-film screening"
          />
        </label>
        <div className="form-grid">
          <label className="field-label">
            Pilot budget
            <input
              required
              type="number"
              min="0"
              max="10000000"
              value={form.budget}
              onChange={(e) => field("budget", Number(e.target.value))}
            />
          </label>
          <label className="field-label">
            Currency
            <select
              value={form.currency}
              onChange={(e) => field("currency", e.target.value)}
            >
              {["USD", "MAD", "EUR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field-label">
          Operating constraints
          <textarea
            maxLength={2000}
            value={form.constraints}
            onChange={(e) => field("constraints", e.target.value)}
            placeholder="Staff capacity, licensing, lead times, venue size…"
          />
        </label>
      </section>
      <section className="panel cultural-references">
        <h2>Choose the cultural starting points</h2>
        <p>
          Search public cultural references and review the results. These guide
          Qloo; they do not represent verified customer preferences.
        </p>
        <div className="inline-form">
          <label className="field-label">
            Reference category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["movie", "artist", "book", "brand", "place", "destination"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          <label className="field-label grow">
            Cultural reference
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={150}
              placeholder="A film, brand, artist, book or place"
            />
          </label>
          <button
            type="button"
            className="secondary"
            disabled={searching || query.length < 2}
            onClick={search}
          >
            <Search size={16} />
            {searching ? "Searching…" : "Search Qloo"}
          </button>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="search-results">
          {results.map((e) => (
            <button
              type="button"
              key={e.id}
              disabled={
                form.seeds.length >= 8 || form.seeds.some((s) => s.id === e.id)
              }
              onClick={() => field("seeds", [...form.seeds, e])}
            >
              <span>
                <strong>{e.name}</strong>
                <small>{e.description?.slice(0, 150) || e.category}</small>
              </span>
              <Plus size={16} />
            </button>
          ))}
        </div>
        <div className="recent-tastes">
          {form.seeds.map((s) => (
            <button
              type="button"
              className="taste-chip"
              key={s.id}
              onClick={() =>
                field(
                  "seeds",
                  form.seeds.filter((e) => e.id !== s.id),
                )
              }
            >
              {s.name} <span aria-label="Remove">×</span>
            </button>
          ))}
        </div>
        {!form.seeds.length && (
          <p className="microcopy">
            You can save now and add references when Qloo is connected. Live
            analysis needs at least one reviewed reference.
          </p>
        )}
      </section>
      <div className="save-bar">
        <p>
          <ShieldCheck size={15} />
          Saved only to your private business session.
        </p>
        <button disabled={busy} className="primary" type="submit">
          {busy ? "Saving…" : "Save business profile"}
          <Check size={16} />
        </button>
      </div>
    </form>
  );
}
function Dashboard({ business, analyses, actions, outcomes }: Ctx) {
  const live = analyses.find((a) => a.mode === "live");
  return (
    <>
      <PageTitle
        title={`Your next move, ${business!.name}.`}
        description={`${business!.industry} in ${business!.city}. Turn cultural curiosity into practical experiments.`}
        action={
          <Link href="/studio/analysis" className="primary">
            Investigate opportunities
            <ArrowUpRight size={16} />
          </Link>
        }
      />
      <div className="studio-metrics">
        {[
          [
            analyses.filter((a) => a.mode === "live").length,
            "Completed cultural analyses",
            ChartNoAxesCombined,
          ],
          [
            analyses
              .flatMap((a) => a.strategies)
              .filter((s) => s.status === "accepted").length,
            "Accepted strategies",
            Check,
          ],
          [
            actions.filter((a) => a.status !== "done").length,
            "Open actions",
            ListChecks,
          ],
          [outcomes.length, "Reported outcomes", TrendingUp],
        ].map(([n, label, Icon]: any) => (
          <div key={label}>
            <Icon size={22} />
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <h2>The business brief</h2>
            <Link href="/studio/onboarding" className="text-button">
              Edit
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <h3>{business!.goal}</h3>
          <p>{business!.catalog}</p>
          <dl className="brief-list">
            <div>
              <dt>Pilot budget</dt>
              <dd>
                {business!.budget.toLocaleString()} {business!.currency}
              </dd>
            </div>
            <div>
              <dt>Intended audience</dt>
              <dd>{business!.audience || "Not specified"}</dd>
            </div>
            <div>
              <dt>Constraints</dt>
              <dd>{business!.constraints || "Not specified"}</dd>
            </div>
            <div>
              <dt>Cultural references</dt>
              <dd>
                {business!.seeds.map((e) => e.name).join(", ") ||
                  "Add reviewed references in Business Setup"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel latest-insight">
          <span className="tag lilac">Your next step</span>
          <h2>
            {live
              ? "Take an insight into the real world."
              : "Start with a question worth answering."}
          </h2>
          <p>
            {live
              ? `${live.strategies.length} evidence-linked opportunities are ready for review. Accept a strategy, set a measurable target, and track the result.`
              : "What cultural opportunities fit your offerings, your market, and the budget you actually have?"}
          </p>
          <Link
            href={live ? "/studio/advisor" : "/studio/analysis"}
            className="secondary"
          >
            {live ? "Review strategies" : "Open cultural analysis"}
            <ArrowUpRight size={16} />
          </Link>
          <div className="workflow-chain">
            <span>Investigate</span>
            <ChevronRight size={13} />
            <span>Act</span>
            <ChevronRight size={13} />
            <span>Learn</span>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="section-title">
          <h2>Recent investigations</h2>
          <span className="tag">{analyses.length} saved</span>
        </div>
        {analyses.length ? (
          <div className="record-list">
            {analyses.slice(0, 5).map((a) => (
              <div key={a.id}>
                <span className={`tag ${a.mode === "live" ? "green" : ""}`}>
                  {a.mode}
                </span>
                <strong>{a.input.city}</strong>
                <span>{a.strategies.length} proposals</span>
                <small>{new Date(a.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <p>
            No investigations yet. Your first analysis will preserve its exact
            inputs, evidence, and decision trace here.
          </p>
        )}
      </section>
    </>
  );
}
function AnalysisView(ctx: Ctx & { advisor: boolean }) {
  const { business, analyses, mutate, busy, advisor } = ctx;
  const [id, setId] = useState("");
  const current = analyses.find((a) => a.id === id) || analyses[0];
  const [useModel, setUseModel] = useState(false);
  async function run(baseline = false) {
    const a = await mutate<Analysis>("analysis", {
      businessId: business!.id,
      baseline,
      useModel,
    });
    if (a) setId(a.id);
  }
  return (
    <>
      <PageTitle
        title={
          advisor
            ? "A strategy you can question."
            : "Find the cultural opportunity."
        }
        description={
          advisor
            ? "Review the rationale, inspect the evidence, and decide which proposals deserve a real-world test."
            : "Investigate your selected references in your market, with a trace for every major decision."
        }
        action={
          <button className="primary" disabled={busy} onClick={() => run()}>
            {busy ? "Investigating…" : "Run Qloo analysis"}
            <Play size={15} />
          </button>
        }
      />
      <div className="analysis-toolbar">
        <select
          aria-label="Saved analysis"
          value={current?.id || ""}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="" disabled>
            Select an analysis
          </option>
          {analyses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.mode} · {a.input.city} ·{" "}
              {new Date(a.createdAt).toLocaleString()}
            </option>
          ))}
        </select>
        <button className="secondary" disabled={busy} onClick={() => run(true)}>
          Run no-Qloo baseline
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            disabled={!ctx.model}
            checked={useModel}
            onChange={(e) => setUseModel(e.target.checked)}
          />
          Use configured AI advisor{" "}
          {ctx.model
            ? "(sends business brief and evidence)"
            : "(not configured)"}
        </label>
      </div>
      {current ? (
        <AnalysisReport analysis={current} {...ctx} />
      ) : (
        <section className="panel empty-state">
          <ChartNoAxesCombined size={38} />
          <h2>Evidence first. Recommendations second.</h2>
          <p>
            Studio selects the category for your business, queries Qloo using
            your reviewed cultural references and market, applies budget
            constraints, and links every proposal to returned evidence.
          </p>
          <p className="microcopy">
            Without credentials or valid references, the analysis records a
            clear failure. The no-Qloo baseline is a separate business-input
            planning rule.
          </p>
        </section>
      )}
    </>
  );
}
function AnalysisReport({
  analysis: a,
  business,
  mutate,
  busy,
}: Ctx & { analysis: Analysis }) {
  const [revision, setRevision] = useState<Record<string, string>>({});
  const [made, setMade] = useState<string[]>([]);
  async function status(s: Strategy, value: Strategy["status"]) {
    await mutate("strategy", {
      analysisId: a.id,
      strategyId: s.id,
      status: value,
      revision: revision[s.id] || "",
    });
  }
  async function plan(s: Strategy) {
    const result = await mutate("action", {
      businessId: business!.id,
      strategyId: s.id,
      analysisId: a.id,
      input: {
        title: s.nextAction,
        owner: "Business owner",
        cost: s.cost,
        due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: "planned",
        priority: "high",
        dependencies: s.dependencies,
        objective: "Set a measurable target before implementing this pilot.",
      },
    });
    if (result) setMade([...made, s.id]);
  }
  return (
    <>
      <div className="analysis-summary">
        <span
          className={`tag ${a.mode === "live" ? "green" : a.mode === "unavailable" ? "amber" : ""}`}
        >
          {a.mode === "live"
            ? "Qloo response received"
            : a.mode === "unavailable"
              ? "Live analysis unavailable"
              : "No-Qloo baseline"}
        </span>
        <span>
          {a.input.city} · {a.input.budget} {a.input.currency}
        </span>
        <small>{new Date(a.createdAt).toLocaleString()}</small>
      </div>
      {a.error && (
        <div className="notice error" role="alert">
          <AlertCircle size={18} />
          {a.error}
        </div>
      )}
      <div className="strategies">
        {a.strategies.map((s, i) => (
          <section className="panel strategy" key={s.id}>
            <div className="section-title">
              <span className="strategy-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={`tag ${s.status === "accepted" ? "green" : ""}`}>
                {s.status}
              </span>
            </div>
            <h2>{s.title}</h2>
            <p>{s.rationale}</p>
            <div className="strategy-facts">
              <div>
                <small>Pilot allocation</small>
                <strong>
                  {s.cost} {a.input.currency}
                </strong>
              </div>
              <div>
                <small>Effort</small>
                <strong>{s.effort}</strong>
              </div>
            </div>
            <details>
              <summary>Evidence, dependencies & limitations</summary>
              <p>
                <strong>Evidence:</strong>{" "}
                {s.evidenceIds.join(", ") || "Business-input baseline only."}
              </p>
              <p>
                <strong>Dependency:</strong> {s.dependencies}
              </p>
              <p>
                <strong>Risk:</strong> {s.risks}
              </p>
              <p>
                <strong>Next action:</strong> {s.nextAction}
              </p>
              <p className="microcopy">
                Confidence:{" "}
                {s.source === "baseline"
                  ? "not supported by cultural data"
                  : "aggregate relationship; unvalidated business opportunity"}
                .{" "}
                {a.modelUsed
                  ? "AI language assistance used."
                  : "Deterministic planning rules; no LLM reasoning claimed."}
              </p>
            </details>
            <label className="field-label">
              Your revision or rejection reason
              <input
                maxLength={1000}
                value={revision[s.id] ?? s.revision ?? ""}
                onChange={(e) =>
                  setRevision({ ...revision, [s.id]: e.target.value })
                }
                placeholder="What should the advisor account for?"
              />
            </label>
            <div className="form-buttons">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => status(s, "accepted")}
              >
                <Check size={15} />
                Accept
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => status(s, "rejected")}
              >
                Reject
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => status(s, s.status)}
              >
                Save revision
              </button>
            </div>
            {s.status === "accepted" && (
              <button
                className="primary"
                disabled={busy || made.includes(s.id)}
                onClick={() => plan(s)}
              >
                <ListChecks size={16} />
                {made.includes(s.id)
                  ? "Plan saved in Action plans"
                  : "Create action plan"}
              </button>
            )}
            {s.status === "rejected" && (
              <p className="microcopy">
                Rejected strategies do not create plans. Your reason is included
                as a constraint in subsequent investigations.
              </p>
            )}
          </section>
        ))}
      </div>
      <div className="lower-grid">
        <section className="panel">
          <h2>Agent investigation trace</h2>
          <ol className="agent-trace">
            {a.trace.map((t, i) => (
              <li key={i}>
                <span className="trace-dot" />
                <div>
                  <strong>{t.state}</strong>
                  <small>{t.tool}</small>
                  <p>{t.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="panel">
          <h2>Evidence and limits</h2>
          {a.evidence.map((e) => (
            <details key={e.id}>
              <summary>
                {e.tool} · {e.entities.length} entities
              </summary>
              <pre>{JSON.stringify(e, null, 2)}</pre>
            </details>
          ))}
          <ul className="limitations">
            {a.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <h3>Lessons from reported outcomes</h3>
          {a.lessons.length ? (
            a.lessons.map((l, i) => <p key={i}>{l}</p>)
          ) : (
            <p>
              No owner-reported outcomes yet. No performance improvement is
              claimed.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
function Scenarios(ctx: Ctx) {
  const { business: b, analyses, mutate, busy } = ctx;
  const [form, setForm] = useState<BusinessInput>(b!);
  const [resultId, setResultId] = useState("");
  const [baseId, setBaseId] = useState("");
  const baseline =
    analyses.find((a) => a.id === baseId) ||
    analyses.find((a) => a.mode === "live");
  const result = analyses.find((a) => a.id === resultId);
  useEffect(() => {
    setForm(b!);
    setResultId("");
  }, [b?.id]);
  const changes = Object.keys(form).filter(
    (k) =>
      JSON.stringify(form[k as keyof BusinessInput]) !==
      JSON.stringify(b![k as keyof BusinessInput]),
  );
  return (
    <>
      <PageTitle
        title="What if you took another direction?"
        description="Change an assumption, run the investigation again, and compare the actual differences. No revenue forecast is implied."
      />
      <div className="scenario-layout">
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBaseId(baseline?.id || "");
            const result = await mutate<Analysis>("analysis", {
              businessId: b!.id,
              scenario: form,
            });
            if (result) setResultId(result.id);
          }}
        >
          <h2>Alternative scenario</h2>
          {(
            [
              "city",
              "audience",
              "positioning",
              "catalog",
              "constraints",
            ] as const
          ).map((k) => (
            <label key={k} className="field-label">
              {k === "city"
                ? "City / market"
                : k === "catalog"
                  ? "Product mix"
                  : k[0].toUpperCase() + k.slice(1)}
              <input
                required={k === "city" || k === "catalog"}
                maxLength={k === "catalog" || k === "constraints" ? 2000 : 1000}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="field-label">
            Pilot budget ({b!.currency})
            <input
              type="number"
              min="0"
              max="10000000"
              value={form.budget}
              onChange={(e) =>
                setForm({ ...form, budget: Number(e.target.value) })
              }
            />
          </label>
          <div className="notice">
            <strong>{changes.length} changed inputs</strong>
            <p>{changes.join(", ") || "Change at least one assumption."}</p>
          </div>
          <button className="primary" disabled={busy || !changes.length}>
            <GitCompareArrows size={16} />
            {busy ? "Recomputing…" : "Run alternative scenario"}
          </button>
        </form>
        <section className="panel">
          <h2>Compare the evidence</h2>
          {result ? (
            <>
              <div className="comparison-columns">
                {[baseline, result].map((a, i) => (
                  <div key={i}>
                    <h3>{i ? "Alternative" : "Original"}</h3>
                    {a ? (
                      <>
                        <span className="tag">{a.mode}</span>
                        <p>
                          {a.input.city} · {a.input.budget} {a.input.currency}
                        </p>
                        <p>{a.input.audience}</p>
                        {a.strategies.map((s) => (
                          <div className="scenario-strategy" key={s.id}>
                            <strong>{s.title}</strong>
                            <small>
                              Pilot allocation: {s.cost} {a.input.currency}
                            </small>
                          </div>
                        ))}
                        {a.error && <p className="error-text">{a.error}</p>}
                      </>
                    ) : (
                      <p>
                        Run an original analysis first for a paired comparison.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <details>
                <summary>Saved alternative inputs</summary>
                <pre>{JSON.stringify(result.input, null, 2)}</pre>
              </details>
              <p className="microcopy">
                Location and cultural references change Qloo requests. Budget
                changes recalculate pilot allocations. Audience, positioning,
                product mix and constraints inform planning context, but no
                validated demographic or financial model is claimed.
              </p>
            </>
          ) : (
            <div className="empty-state small">
              <GitCompareArrows size={35} />
              <p>
                Run an alternative to see what changed. Both analyses are saved.
              </p>
            </div>
          )}
        </section>
      </div>
      {result && <AnalysisReport {...ctx} analysis={result} />}
    </>
  );
}
function ActionsView(ctx: Ctx) {
  const { business, actions, mutate, busy } = ctx;
  return (
    <>
      <PageTitle
        title="Make the insight actionable."
        description="Own the next step. Set a cost, a date, and a measure of success before you launch."
      />
      <div className="actions-list">
        {actions.map((a) => (
          <ActionEditor
            key={a.id}
            action={a}
            currency={business!.currency}
            busy={busy}
            save={(input) =>
              mutate("action", { businessId: business!.id, id: a.id, input })
            }
          />
        ))}
        <ActionEditor
          key={`new-${business!.id}`}
          currency={business!.currency}
          busy={busy}
          save={(input) =>
            mutate("action", { businessId: business!.id, input })
          }
        />
      </div>
    </>
  );
}
function ActionEditor({
  action,
  currency,
  busy,
  save,
}: {
  action?: Action;
  currency: string;
  busy: boolean;
  save: (input: any) => Promise<any>;
}) {
  const initial = {
    title: "",
    owner: "",
    cost: 0,
    due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: "planned",
    priority: "medium",
    dependencies: "",
    objective: "",
  };
  const [form, setForm] = useState<any>(action || initial);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="panel action-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await save(form)) {
          setSaved(true);
          if (!action) setForm(initial);
        }
      }}
    >
      <div className="section-title">
        <h2>{action ? "Edit action" : "Add an action"}</h2>
        <span className="tag">{action?.status || "New task"}</span>
      </div>
      <label className="field-label">
        Task
        <input
          required
          minLength={3}
          maxLength={300}
          value={form.title}
          onChange={(e) => {
            setSaved(false);
            setForm({ ...form, title: e.target.value });
          }}
        />
      </label>
      <div className="form-grid">
        <label className="field-label">
          Owner
          <input
            maxLength={100}
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
          />
        </label>
        <label className="field-label">
          Due date
          <input
            required
            type="date"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
        </label>
        <label className="field-label">
          Estimated cost ({currency})
          <input
            required
            type="number"
            min="0"
            max="10000000"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
          />
        </label>
        <label className="field-label">
          Priority
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {["high", "medium", "low"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Status
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {["planned", "in-progress", "done"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field-label">
        Dependencies
        <input
          maxLength={1000}
          value={form.dependencies}
          onChange={(e) => setForm({ ...form, dependencies: e.target.value })}
        />
      </label>
      <label className="field-label">
        Measurable objective
        <input
          maxLength={1000}
          required
          value={form.objective}
          onChange={(e) => setForm({ ...form, objective: e.target.value })}
          placeholder="e.g. 30 attendees at the first screening"
        />
      </label>
      <button className="secondary" disabled={busy}>
        <Check size={15} />
        {busy ? "Saving…" : "Save action"}
      </button>
      {saved && (
        <span className="saved-text" role="status">
          Saved to your business workspace
        </span>
      )}
    </form>
  );
}
function OutcomesView({ business, actions, outcomes, mutate, busy }: Ctx) {
  const [actionId, setActionId] = useState("");
  const [metric, setMetric] = useState("Attendance");
  const [expected, setExpected] = useState(30);
  const [actual, setActual] = useState(0);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <>
      <PageTitle
        title="Let real outcomes teach you."
        description="Record what happened, compare it with your target, and bring that evidence into the next investigation."
      />
      <div className="lower-grid">
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await mutate("outcome", {
              input: { actionId, metric, expected, actual, notes, date },
            });
            if (result) setNotes("");
          }}
        >
          <h2>Record a result</h2>
          <label className="field-label">
            Implemented action
            <select
              required
              value={actionId}
              onChange={(e) => setActionId(e.target.value)}
            >
              <option value="">Choose an action</option>
              {actions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          {!actions.length && (
            <p>
              Create a plan in <Link href="/studio/actions">Action plans</Link>{" "}
              first.
            </p>
          )}
          <label className="field-label">
            Metric
            <input
              required
              minLength={2}
              maxLength={100}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label className="field-label">
              Original target
              <input
                required
                type="number"
                min="0"
                value={expected}
                onChange={(e) => setExpected(Number(e.target.value))}
              />
            </label>
            <label className="field-label">
              Actual reported result
              <input
                required
                type="number"
                min="0"
                value={actual}
                onChange={(e) => setActual(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="field-label">
            Date
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field-label">
            What happened? What did you learn?
            <textarea
              value={notes}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record context, customer feedback, and other explanations."
            />
          </label>
          <button className="primary" disabled={busy || !actionId}>
            Save reported outcome
            <Check size={16} />
          </button>
          <p className="microcopy">
            Source: business owner. Reports are not independently verified and
            cannot establish causation.
          </p>
        </form>
        <section className="panel">
          <h2>What the experiments taught you</h2>
          {outcomes.length ? (
            outcomes.map((o) => (
              <article className="outcome-record" key={o.id}>
                <span className="tag">{o.date} · Owner reported</span>
                <h3>{o.metric}</h3>
                <div className="outcome-values">
                  <span>
                    <strong>{o.actual}</strong> actual
                  </span>
                  <span>
                    <strong>{o.expected}</strong> target
                  </span>
                  <span className={o.actual >= o.expected ? "positive" : ""}>
                    {o.actual - o.expected >= 0 ? "+" : ""}
                    {o.actual - o.expected} vs target
                  </span>
                </div>
                <p>{o.notes}</p>
                <p className="microcopy">
                  {o.actual < o.expected
                    ? "Below-target results reduce the next pilot allocation under the current planning rule."
                    : "This result will be included in subsequent investigation lessons. It does not prove repeatable success."}
                </p>
              </article>
            ))
          ) : (
            <div className="empty-state small">
              <TrendingUp size={35} />
              <p>
                No outcomes yet. Your first real result is more useful than an
                invented forecast.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function Audience() {
  return (
    <>
      <PageTitle
        title="Customer intelligence, with consent."
        description="A foundation for collective insight that keeps individual taste identities private."
      />
      <section className="panel audience-empty">
        <div className="audience-art">
          <Users size={52} />
          <ShieldCheck size={30} />
        </div>
        <span className="tag amber">Insufficient consented data</span>
        <h2>There isn’t an audience dataset to report yet.</h2>
        <p>
          No personal profiles have been collected or shared with Studio.
          Audience reporting is suppressed until at least 10 separately
          consenting participants and 10 participants per reported group can
          support a disclosure.
        </p>
        <div className="audience-rules">
          <span>
            <ShieldCheck size={18} />
            No individual taste graphs
          </span>
          <span>
            <ShieldCheck size={18} />
            No private spending details
          </span>
          <span>
            <ShieldCheck size={18} />
            No invented customer metrics
          </span>
        </div>
        <p className="microcopy">
          Consent collection, aggregate ingestion, withdrawal handling, and a
          privacy audit are required before activating real audience analytics.
          No synthetic dataset is presented as customer evidence.
        </p>
      </section>
    </>
  );
}
