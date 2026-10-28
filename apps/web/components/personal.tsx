"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  Check,
  ShieldCheck,
  Film,
  ShoppingBag,
  Plane,
  Trash2,
  Download,
  MessageSquare,
  Network,
  ChevronRight,
  Search,
  RotateCcw,
  LockKeyhole,
} from "lucide-react";
import {
  Category,
  ProfileSchema,
  type Profile,
  type Preference,
  type Entity,
  type Context,
  type QlooEvidence,
} from "@tastekey/shared-types";
import {
  emptyProfile,
  addPreference,
  nextQuestion,
  verify,
  editPreference,
  removePreference,
  setBudget,
  rankByVerifiedMetadata,
} from "@tastekey/taste-engine";
import {
  authorizedContext,
  categories,
  revoke,
} from "@tastekey/privacy-engine";
import { evaluatePool } from "@tastekey/evaluation";
import { api, download } from "@/lib/client";
import TasteGraph from "./taste-graph";
import { AudienceConsent } from "./delivery-controls";
import TravelQuotes from "./travel-quotes";
const STORAGE = "tastekey.profile.v1";
const names: Record<string, string> = {
  movie: "Film",
  tv_show: "Television",
  artist: "Music",
  book: "Books",
  brand: "Brands",
  design: "Design",
  destination: "Destinations",
  place: "Places",
};
const guidedChoices = {
  movie: ["Interstellar", "Spirited Away", "Jurassic Park", "Finding Nemo"],
  artist: ["Adele", "Beyoncé", "Coldplay", "Daft Punk"],
  book: [
    "The Hobbit",
    "The Little Prince",
    "Pride and Prejudice",
    "The Alchemist",
  ],
  place: ["Paris", "Marrakech", "Tokyo", "Barcelona"],
  design: [
    "Simple and clean",
    "Bright and colourful",
    "Natural materials",
    "Vintage style",
  ],
} satisfies Partial<Record<Category, string[]>>;
type GuidedCategory = keyof typeof guidedChoices;
export default function Personal({
  section,
  model,
}: {
  section: string;
  model: boolean;
}) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) {
        const p = ProfileSchema.parse(JSON.parse(saved));
        if (
          p.version !== 1 ||
          !Array.isArray(p.nodes) ||
          !p.consents ||
          !p.budgets ||
          !Array.isArray(p.history)
        )
          throw new Error();
        setProfile(p);
      }
    } catch {
      setStorageBlocked(true);
      setError(
        "Your saved profile could not be read. Storage writes are paused to preserve the original data. Clear this site’s browser storage to start over.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !storageBlocked)
      try {
        localStorage.setItem(STORAGE, JSON.stringify(profile));
      } catch {
        setError(
          "Browser storage is full or blocked. Export your profile to preserve changes.",
        );
      }
  }, [profile, ready, storageBlocked]);
  function update(p: Profile) {
    setProfile(p);
    setMessage("Profile updated on this browser.");
  }
  const common = { profile, update, error: setError, message: setMessage };
  if (!ready) return <div className="loading">Opening your local profile…</div>;
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
      {message && (
        <div className="sr-only" role="status">
          {message}
        </div>
      )}
      {section === "discover" ? (
        <Discover {...common} />
      ) : section === "taste-dna" ? (
        <DNA {...common} model={model} />
      ) : section === "relay" ? (
        <Relay {...common} />
      ) : section === "proof" ? (
        <Proof {...common} />
      ) : (
        <div className="empty-state">
          <h1>Page not found</h1>
          <Link href="/personal/discover">Go to Discover</Link>
        </div>
      )}
    </>
  );
}
type Props = {
  profile: Profile;
  update: (p: Profile) => void;
  error: (m: string) => void;
  message: (m: string) => void;
};
function Discover({ profile, update, error }: Props) {
  const [category, setCategory] = useState<Category>("movie");
  const [text, setText] = useState("");
  const [results, setResults] = useState<Entity[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [guided, setGuided] = useState(false);
  const [guidedCategory, setGuidedCategory] = useState<GuidedCategory | null>(
    null,
  );
  const count = profile.nodes.filter((n) => !n.parentId).length;
  async function search(query = text, kind = category) {
    error("");
    setBusy(true);
    setResults([]);
    try {
      const result = await api<QlooEvidence>("search", {
        query,
        category: kind,
      });
      setResults(result.entities);
      setSearched(true);
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function save(entity?: Entity) {
    update(
      addPreference(
        profile,
        entity?.name || text,
        entity?.category || category,
        entity,
      ),
    );
    setText("");
    setResults([]);
    setSearched(false);
  }
  return (
    <>
      <div className="page-heading discovery-hero simple-hero">
        <div>
          <h1>Find more of what you love.</h1>
          <p>
            Add something you like. Get ideas for films, products and places.
          </p>
        </div>
        <div className="simple-art" aria-hidden="true">
          <span className="mosaic-tile movie">
            <span className="mosaic-art" />
          </span>
          <span className="mosaic-tile place">
            <span className="mosaic-art" />
          </span>
          <span className="mosaic-tile artist">
            <span className="mosaic-art" />
          </span>
        </div>
      </div>
      <div className="simple-discovery">
        <section className="panel discovery-panel">
          <div className="section-title">
            <div>
              <h2>What do you like?</h2>
              <p>Start with one. You can add more later.</p>
            </div>
          </div>
          <div
            className="start-mode"
            role="group"
            aria-label="How would you like to start?"
          >
            <button
              className={!guided ? "active" : ""}
              aria-pressed={!guided}
              disabled={busy}
              onClick={() => {
                setGuided(false);
                setResults([]);
                setSearched(false);
                setText("");
              }}
            >
              I know what I like
            </button>
            <button
              className={guided ? "active" : ""}
              aria-pressed={guided}
              disabled={busy}
              onClick={() => {
                setGuided(true);
                setGuidedCategory(null);
                setResults([]);
                setSearched(false);
                setText("");
              }}
            >
              Not sure? Help me choose
            </button>
          </div>
          {guided ? (
            <div className="guided-start">
              <h3>
                {guidedCategory
                  ? "Which of these do you like?"
                  : "What would you like to start with?"}
              </h3>
              <p>
                {guidedCategory
                  ? "Tap one you already like. Nothing is saved until you add it."
                  : "Choose a topic. No typing needed."}
              </p>
              <div
                className="guided-options"
                role="group"
                aria-label={
                  guidedCategory ? "Things you might like" : "Choose a topic"
                }
              >
                {guidedCategory
                  ? guidedChoices[guidedCategory].map((choice) => (
                      <button
                        key={choice}
                        disabled={busy}
                        aria-pressed={text === choice}
                        onClick={() => {
                          setText(choice);
                          setResults([]);
                          setSearched(false);
                          if (guidedCategory !== "design")
                            void search(choice, guidedCategory);
                        }}
                      >
                        {choice}
                      </button>
                    ))
                  : (Object.keys(guidedChoices) as GuidedCategory[]).map(
                      (topic) => (
                        <button
                          key={topic}
                          onClick={() => {
                            setGuidedCategory(topic);
                            setCategory(topic);
                          }}
                        >
                          {names[topic]}
                        </button>
                      ),
                    )}
              </div>
              {guidedCategory && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setGuidedCategory(null);
                    setText("");
                    setResults([]);
                    setSearched(false);
                  }}
                >
                  None of these? Try another topic
                </button>
              )}
              {busy && <p role="status">Finding that choice…</p>}
              {guidedCategory === "design" && text && (
                <button className="primary" onClick={() => save()}>
                  <Plus size={16} />
                  Add this style
                </button>
              )}
              {guidedCategory && !busy && !text && (
                <p className="microcopy">
                  These are examples, not recommendations. You can also switch
                  to typing a name.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="category-tabs" aria-label="Preference category">
                {(
                  ["movie", "artist", "book", "place", "design"] as Category[]
                ).map((c) => (
                  <button
                    className={category === c ? "active" : ""}
                    aria-pressed={category === c}
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setResults([]);
                      document.getElementById("taste")?.focus();
                    }}
                  >
                    {names[c]}
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="taste">
                {category === "artist"
                  ? "An artist you love"
                  : category === "book"
                    ? "A book you love"
                    : category === "place"
                      ? "A place you love"
                      : category === "design"
                        ? "A design you love"
                        : `A ${names[category].toLowerCase()} you love`}
              </label>
              <div className="search-input">
                <Search size={19} />
                <input
                  id="taste"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setResults([]);
                  }}
                  placeholder={
                    category === "movie"
                      ? "Maybe Interstellar, or Spirited Away…"
                      : category === "artist"
                        ? "An artist you always come back to…"
                        : "Something that feels like you…"
                  }
                  maxLength={150}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !busy && text.trim().length >= 2) {
                      e.preventDefault();
                      if (category === "design") save();
                      else void search();
                    }
                  }}
                />
              </div>
              <div className="form-buttons">
                {category !== "design" && (
                  <button
                    className="primary"
                    disabled={busy || text.trim().length < 2}
                    onClick={() => void search()}
                  >
                    {busy ? "Searching…" : "Search"}
                    <Search size={15} />
                  </button>
                )}
                <button
                  className={category === "design" ? "primary" : "text-button"}
                  disabled={!text.trim()}
                  onClick={() => save()}
                >
                  <Plus size={16} />
                  {category === "design" ? "Add this" : "Add without searching"}
                </button>
              </div>
            </>
          )}
          <p className="microcopy">
            Saved on this device. You choose what to share.
          </p>
          {!!results.length && (
            <div className="search-results">
              <strong>Choose the one you mean</strong>
              {results.map((e) => (
                <button key={e.id} onClick={() => save(e)}>
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {e.category} · {e.description?.slice(0, 100)}
                    </small>
                  </span>
                  <Plus size={17} />
                </button>
              ))}
            </div>
          )}
          {searched && !results.length && (
            <p>
              {guided
                ? "No matches. Choose another option, or switch to typing a name."
                : "No matches. Try a different name, or add it as your own taste."}
            </p>
          )}
          {!guided && (
            <details className="simple-examples">
              <summary>Try an example</summary>
              <div className="starter-prompts">
                {["Interstellar", "Spirited Away", "Luxury architecture"].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setCategory(
                          s === "Luxury architecture" ? "design" : "movie",
                        );
                        setText(s);
                      }}
                    >
                      {s}
                      <Plus size={12} />
                    </button>
                  ),
                )}
              </div>
            </details>
          )}
          <div className="recent-tastes">
            {profile.nodes
              .filter((n) => !n.parentId)
              .slice(-4)
              .map((n) => (
                <span key={n.id} className="taste-chip">
                  <Check size={13} />
                  {n.label}
                </span>
              ))}
          </div>
          {count > 0 && (
            <div className="simple-next">
              <p>
                {count === 1
                  ? "Your first like is saved."
                  : `${count} likes saved.`}
              </p>
              <Link className="primary" href="/personal/relay">
                Get suggestions <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </section>
        {count > 0 && (
          <>
            <details className="simple-extra">
              <summary>Help us understand your choice (optional)</summary>
              <Verification profile={profile} update={update} />
            </details>
            <details
              className="simple-extra"
              onToggle={(e) => setShowMap(e.currentTarget.open)}
            >
              <summary>See your taste map</summary>
              {showMap && (
                <div className="graph-preview">
                  <TasteGraph profile={profile} compact />
                  <Link href="/personal/taste-dna" className="graph-link">
                    View and edit your likes <ArrowUpRight size={17} />
                  </Link>
                </div>
              )}
            </details>
          </>
        )}
      </div>
    </>
  );
}
function Verification({ profile, update }: Pick<Props, "profile" | "update">) {
  const q = nextQuestion(profile);
  return (
    <section className="panel verification">
      <div className="section-title">
        <h2>
          <Sparkles size={19} />
          Tell us a little more
        </h2>
      </div>
      {q ? (
        <>
          <p>
            What do you like about <strong>{q.parent.label}</strong>?
          </p>
          <div className="verification-options">
            {q.options.map((n) => (
              <button
                key={n.id}
                onClick={() => update(verify(profile, q.parent.id, n.id))}
              >
                {n.label}
                <Plus size={14} />
              </button>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => update(verify(profile, q.parent.id, null))}
          >
            None of these fit
          </button>
          <p className="microcopy">
            These are guesses. Only you can say what fits.
          </p>
          <details>
            <summary>Why are we asking?</summary>
            <p>
              Your answer helps us understand this choice. You can skip it or
              change your answer later.
            </p>
          </details>
        </>
      ) : (
        <>
          <p>
            {profile.nodes.length
              ? "You’re all set. Add another like whenever you want."
              : "Add your first taste, and we’ll ask a useful follow-up."}
          </p>
          <span className="tag">You can skip any question</span>
        </>
      )}
    </section>
  );
}
function DNA(props: Props & { model: boolean }) {
  const { profile, update, error, model } = props;
  const [selected, setSelected] = useState<string>("");
  const node = profile.nodes.find((n) => n.id === selected);
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function correct() {
    setBusy(true);
    try {
      setProposal(await api("correction", { text, modelConsent: true }));
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Your likes"
        description="See what you added. Change or remove anything."
        action={
          <button
            className="secondary"
            onClick={() => download("tastekey-profile.json", profile)}
          >
            <Download size={16} />
            Export profile
          </button>
        }
      />
      <div className="dna-layout">
        <TasteGraph
          profile={profile}
          onSelect={(n) => setSelected(n.id)}
          onPosition={(id, position) =>
            update({
              ...profile,
              nodes: profile.nodes.map((n) =>
                n.id === id ? { ...n, position } : n,
              ),
            })
          }
        />
        <section className="panel inspector">
          <h2>{node ? "Edit this like" : "Choose a like to edit"}</h2>
          {node ? (
            <>
              <div className="tag blue">{names[node.category]}</div>
              <h3>{node.label}</h3>
              <label className="field-label">
                Meaning
                <input
                  key={node.id}
                  defaultValue={node.label}
                  maxLength={200}
                  onBlur={(e) =>
                    e.target.value.trim() &&
                    e.target.value !== node.label &&
                    update(
                      editPreference(
                        profile,
                        node.id,
                        e.target.value,
                        node.status,
                      ),
                    )
                  }
                />
              </label>
              <label className="field-label">
                Status
                <select
                  value={node.status}
                  onChange={(e) =>
                    update(
                      editPreference(
                        profile,
                        node.id,
                        node.label,
                        e.target.value as Preference["status"],
                      ),
                    )
                  }
                >
                  {[
                    "stated",
                    "inferred",
                    "confirmed",
                    "rejected",
                    "superseded",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {
                        (
                          {
                            stated: "You added this",
                            inferred: "A guess",
                            confirmed: "You confirmed this",
                            rejected: "Does not fit",
                            superseded: "Replaced",
                          } as Record<string, string>
                        )[s]
                      }
                    </option>
                  ))}
                </select>
              </label>
              <p className="microcopy">
                Guesses stay separate from things you have told us.
              </p>
              <h4>Where this came from</h4>
              <div className="evidence-list">
                {node.evidence.slice(-5).map((e) => (
                  <div key={e.id}>
                    <span className="tag">{e.source}</span>
                    <p>{e.detail}</p>
                    <small>{new Date(e.at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
              <button
                className="danger"
                onClick={() => {
                  update(removePreference(profile, node.id));
                  setSelected("");
                }}
              >
                <Trash2 size={15} />
                Remove this like and its guesses
              </button>
            </>
          ) : (
            <>
              <p>
                Select a node in the graph or the accessible list below to see
                what it means and where it came from.
              </p>
              <Network className="empty-icon" size={60} />
            </>
          )}
        </section>
      </div>
      <details className="panel accessible-list">
        <summary>See all likes ({profile.nodes.length})</summary>
        {profile.nodes.map((n) => (
          <button key={n.id} onClick={() => setSelected(n.id)}>
            {n.label}
            <span className="tag">{n.status}</span>
          </button>
        ))}
      </details>
      <div className="lower-grid">
        <Verification profile={profile} update={update} />
        <section className="panel">
          <h2>Your budget</h2>
          <p>
            Liking something expensive does not mean you want to spend more.
          </p>
          <div className="form-grid">
            {(["shopping", "travel"] as const).map((c) => (
              <label key={c} className="field-label">
                {c === "travel"
                  ? "Accommodation per night"
                  : "Shopping per item"}{" "}
                (USD)
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={profile.budgets[c] ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      const budgets = { ...profile.budgets };
                      delete budgets[c];
                      update({ ...profile, budgets });
                    } else if (Number(e.target.value) >= 0)
                      update(setBudget(profile, c, Number(e.target.value)));
                  }}
                  placeholder="No limit stated"
                />
              </label>
            ))}
          </div>
        </section>
      </div>
      <section className="panel correction-panel">
        <div>
          <h2>Tell us what we got wrong</h2>
          <p>
            {model
              ? "Only this correction text is sent to the configured language model when you choose Interpret. Review the proposed change before applying."
              : "Language model not configured. Edit any preference above and set budgets in the structured fields. All other tastes stay intact."}
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1500}
          placeholder="I love luxury architecture, but choose affordable hotels. My hotel limit is $60 a night."
        />
        <button
          className="secondary"
          disabled={!model || busy || text.length < 3}
          onClick={correct}
        >
          {busy ? "Interpreting…" : "Interpret with language model"}
        </button>
        {proposal && (
          <div className="notice">
            <p>{proposal.explanation}</p>
            <p>
              Preference: {proposal.label || "No preference change"} · Budget:{" "}
              {proposal.budget === undefined
                ? "Not specified"
                : `${proposal.budget} USD (${proposal.budgetContext})`}
            </p>
            <button
              className="primary"
              onClick={() => {
                let p = profile;
                if (proposal.label && proposal.category)
                  p = addPreference(p, proposal.label, proposal.category);
                if (proposal.budgetContext && proposal.budget !== undefined)
                  p = setBudget(p, proposal.budgetContext, proposal.budget);
                update(p);
                setProposal(null);
              }}
            >
              Apply reviewed changes
            </button>
            <button className="text-button" onClick={() => setProposal(null)}>
              Discard
            </button>
          </div>
        )}
      </section>
    </>
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="standard-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
const sampleProducts = [
  {
    id: "p1",
    name: "Architectural desk light",
    price: 42,
    tags: ["design", "architecture", "visual"],
    kind: "Lighting",
  },
  {
    id: "p2",
    name: "Pocket film journal",
    price: 12,
    tags: ["movie", "stories", "film"],
    kind: "Stationery",
  },
  {
    id: "p3",
    name: "Everyday listening headphones",
    price: 58,
    tags: ["artist", "music", "atmosphere"],
    kind: "Audio",
  },
  {
    id: "p4",
    name: "Modern spaces print",
    price: 24,
    tags: ["luxury", "architecture", "design"],
    kind: "Print",
  },
  {
    id: "p5",
    name: "Travel sketchbook",
    price: 16,
    tags: ["place", "destination", "design"],
    kind: "Stationery",
  },
];
function Relay({ profile, update, error }: Props) {
  const [context, setContext] = useState<Context>("entertainment");
  const [ids, setIds] = useState<string[]>([]);
  const [shareBudget, setShareBudget] = useState(false);
  const [result, setResult] = useState<QlooEvidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("movie");
  const requestVersion = useRef(0);
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(timer);
      requestVersion.current++;
    };
  }, []);
  const grant = authorizedContext(profile, context);
  const eligible = profile.nodes.filter(
    (n) =>
      ["stated", "confirmed"].includes(n.status) &&
      categories[context].includes(n.category),
  );
  useEffect(() => {
    setIds(profile.consents[context]?.nodeIds || []);
    setShareBudget(profile.consents[context]?.budget || false);
    setResult(null);
    setKind(
      context === "entertainment"
        ? "movie"
        : context === "shopping"
          ? "brand"
          : "destination",
    );
  }, [context]);
  const signature = JSON.stringify({
    nodes: grant.nodes.map((n) => [n.id, n.label, n.entity?.id]),
    budget: grant.budget,
    allowed: grant.allowed,
    context,
    kind,
  });
  useEffect(() => {
    requestVersion.current++;
    setResult(null);
  }, [signature]);
  async function recommend() {
    const version = ++requestVersion.current;
    setBusy(true);
    setResult(null);
    try {
      const currentGrant = authorizedContext(profile, context);
      const entityIds = currentGrant.nodes.flatMap((n) =>
        n.entity ? [n.entity.id] : [],
      );
      if (!currentGrant.allowed)
        throw new Error("Approve the requested fields first.");
      if (!entityIds.length)
        throw new Error(
          "Add and authorize at least one reviewed Qloo reference in Discover.",
        );
      const data = await api<QlooEvidence>("recommend", {
        entities: entityIds,
        category: kind,
      });
      if (
        version === requestVersion.current &&
        Date.parse(profile.consents[context]!.expiresAt) > Date.now()
      ) {
        setResult(data);
        localStorage.setItem("tastekey.proof.pool", JSON.stringify(data));
      }
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ranked = sampleProducts
    .filter((p) => grant.budget === undefined || p.price <= grant.budget)
    .map((p) => ({
      ...p,
      score: grant.nodes.reduce(
        (v, n) =>
          v +
          p.tags.filter((t) =>
            `${n.label} ${n.category}`.toLowerCase().includes(t),
          ).length,
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.price - b.price);
  return (
    <>
      <PageTitle
        title="Suggestions for you"
        description="Choose what to watch, buy or visit. Pick the likes you want to use."
      />
      <div className="experience-tabs">
        {(
          [
            ["entertainment", "Entertainment", Film],
            ["shopping", "Shopping", ShoppingBag],
            ["travel", "Travel", Plane],
          ] as const
        ).map(([c, label, Icon]) => (
          <button
            key={c}
            className={context === c ? "active" : ""}
            onClick={() => setContext(c)}
          >
            <Icon size={21} />
            {label}
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      <div className="relay-layout">
        <section className="panel consent-panel">
          <ShieldCheck size={25} />
          <h2>Choose which likes to use</h2>
          <p>
            {context === "entertainment"
              ? "Use your film and music likes to find something to watch. Your budget stays private."
              : context === "shopping"
                ? "Use your likes to find brands. Product examples and prices are samples, not real offers."
                : "Find places you might enjoy. Your budget stays on this device. Live hotel prices are not available."}
          </p>
          <div className="consent-options">
            {eligible.length ? (
              eligible.map((n) => (
                <label key={n.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(n.id)}
                    onChange={(e) =>
                      setIds(
                        e.target.checked
                          ? [...ids, n.id]
                          : ids.filter((id) => id !== n.id),
                      )
                    }
                  />
                  <span>
                    {n.label}
                    <small>{names[n.category]}</small>
                  </span>
                </label>
              ))
            ) : (
              <p>
                Add a relevant preference in{" "}
                <Link href="/personal/discover">Discover</Link> first.
              </p>
            )}
            {context !== "entertainment" && (
              <label>
                <input
                  type="checkbox"
                  checked={shareBudget}
                  onChange={(e) => setShareBudget(e.target.checked)}
                />
                <span>
                  Apply my {context === "travel" ? "hotel" : "shopping"} budget
                  locally
                  <small>
                    {profile.budgets[context] === undefined
                      ? "No budget stated"
                      : `${profile.budgets[context]} USD`}
                  </small>
                </span>
              </label>
            )}
          </div>
          <button
            className="primary"
            onClick={() => {
              update({
                ...profile,
                consents: {
                  ...profile.consents,
                  [context]: {
                    context,
                    nodeIds: ids,
                    budget: shareBudget,
                    expiresAt: new Date(Date.now() + 86400000).toISOString(),
                  },
                },
              });
              setResult(null);
            }}
          >
            <Check size={16} />
            {grant.allowed
              ? "Update permission"
              : "Share these likes for 24 hours"}
          </button>
          {grant.allowed && (
            <button
              className="text-button"
              onClick={() => {
                update(revoke(profile, context));
                setResult(null);
              }}
            >
              Stop sharing
            </button>
          )}
          <div className="permission-summary">
            <strong>
              {grant.allowed
                ? `${grant.nodes.length} ${grant.nodes.length === 1 ? "like" : "likes"} selected`
                : "Nothing is shared yet"}
            </strong>
            <p>
              We send your selected film, artist or place to Qloo for
              suggestions. Your full list and budget stay on this device.
            </p>
          </div>
        </section>
        <div>
          <section className="panel recommendation-panel">
            <div className="section-title">
              <div>
                <h2>
                  {context === "entertainment"
                    ? "Your next great watch"
                    : context === "shopping"
                      ? "Cultural inspiration for your shelf"
                      : "A new direction to explore"}
                </h2>
                <p>Live Qloo cultural relationships, with source evidence.</p>
              </div>
              <span className="tag blue">Qloo cultural graph</span>
            </div>
            {context === "entertainment" && (
              <label className="field-label">
                Explore
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="movie">Movies</option>
                  <option value="tv_show">Television</option>
                </select>
              </label>
            )}
            <button
              className="primary"
              disabled={!grant.allowed || busy}
              onClick={recommend}
            >
              {busy ? "Finding cultural connections…" : "Get suggestions"}
              <Sparkles size={16} />
            </button>
            {!result && !busy && (
              <div className="empty-state small">
                <div className="empty-orbit">
                  <CompassIcon />
                </div>
                <h3>A connection worth discovering</h3>
                <p>
                  {grant.allowed
                    ? "Run a live search with your authorized references."
                    : "Approve the preferences on the left to begin."}
                </p>
              </div>
            )}
            {result && (
              <>
                <p className="microcopy">
                  Qloo candidates, locally reranked using authorized, confirmed
                  keywords in returned metadata. Ties keep Qloo order. The
                  source trace preserves the original response order.
                </p>
                <div className="result-grid">
                  {rankByVerifiedMetadata(result.entities, grant.nodes).map(
                    (e, i) => (
                      <article className="result-card" key={e.id}>
                        <span className="rank">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <span className="tag">{e.category}</span>
                          <h3>{e.name}</h3>
                          <p>
                            {e.description?.slice(0, 220) ||
                              "Returned by Qloo for the selected cultural references."}
                          </p>
                          {e.affinity !== undefined && (
                            <small>
                              Aggregate affinity: {e.affinity.toFixed(3)} · not
                              a personal probability
                            </small>
                          )}
                        </div>
                      </article>
                    ),
                  )}
                </div>
                <details className="evidence-details">
                  <summary>Inspect source & request</summary>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </details>
              </>
            )}
            {context === "travel" && (
              <p className="microcopy">
                Destination inspiration only. Hotel prices, transport costs,
                visas, availability and accessibility have not been verified. No
                bookable or budget-qualified trip is claimed.
              </p>
            )}
          </section>
          {context === "travel" && grant.allowed && (
            <TravelQuotes
              destinations={result?.entities || []}
              budget={grant.budget}
            />
          )}
          {context === "shopping" && grant.allowed && (
            <section className="panel sample-catalog">
              <h2>Shop by your own rules</h2>
              <p>
                <strong>Sample catalog</strong> · Fictional products and
                illustrative USD prices. No live inventory or merchant
                integration. Ranked locally by explicit preference keywords,
                then price.
              </p>
              <div className="catalog-grid">
                {ranked.map((p) => (
                  <article key={p.id}>
                    <ShoppingBag size={25} />
                    <small>{p.kind}</small>
                    <h3>{p.name}</h3>
                    <strong>${p.price}</strong>
                    <span>
                      {p.score
                        ? "Matches authorized interests"
                        : "Within the declared constraints"}
                    </span>
                  </article>
                ))}
                {!ranked.length && <p>No sample products meet your budget.</p>}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
function CompassIcon() {
  return <Sparkles size={35} />;
}
function Proof({ profile, update, error }: Props) {
  const [pool, setPool] = useState<QlooEvidence | null>(null);
  const [held, setHeld] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    try {
      setPool(
        JSON.parse(localStorage.getItem("tastekey.proof.pool") || "null"),
      );
      setRecords(
        JSON.parse(localStorage.getItem("tastekey.proof.records") || "[]"),
      );
    } catch {}
  }, []);
  function experiment() {
    if (!pool) return;
    const entities = pool.entities;
    const baseline = [...entities]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => e.id);
    const qloo = entities.map((e) => e.id);
    const keywords = profile.nodes
      .filter((n) => n.status === "confirmed")
      .flatMap((n) => n.label.toLowerCase().split(/\W+/))
      .filter((w) => w.length > 4);
    const adaptive = entities
      .map((e, i) => ({
        id: e.id,
        i,
        score: keywords.filter((w) =>
          `${e.name} ${e.description || ""} ${e.tags.join(" ")}`
            .toLowerCase()
            .includes(w),
        ).length,
      }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((e) => e.id);
    try {
      const result = evaluatePool(qloo, { baseline, qloo, adaptive }, held);
      const record = {
        at: new Date().toISOString(),
        sampleSize: 1,
        candidateCount: qloo.length,
        questionCount: profile.history.filter((e) =>
          e.detail.startsWith("Confirmed interpretation"),
        ).length,
        method:
          "Alphabetical baseline; Qloo order; Qloo reranked by confirmed keywords in returned metadata. One self-reported choice, not a blinded user study.",
        heldOut: held,
        rankings: { baseline, qloo, adaptive },
        result,
        evidenceId: pool.id,
      };
      const next = [record, ...records];
      localStorage.setItem("tastekey.proof.records", JSON.stringify(next));
      setRecords(next);
      setHeld([]);
    } catch (e) {
      error((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="Your privacy and data"
        description="See what you shared. Download or delete your saved likes."
        action={
          <button
            className="secondary"
            onClick={() => download("tastekey-evaluations.json", records)}
          >
            <Download size={16} />
            Export experiments
          </button>
        }
      />
      <div className="proof-grid">
        <section className="panel">
          <h2>Compare your ratings</h2>
          <p>
            Choose a preference from the last live candidate pool before viewing
            the rankings. All three methods use the same candidates.
          </p>
          {pool ? (
            <>
              <label className="field-label">
                Which result would you choose?
                <select
                  value={held[0] || ""}
                  onChange={(e) =>
                    setHeld(e.target.value ? [e.target.value] : [])
                  }
                >
                  <option value="">Select a held-out choice</option>
                  {pool.entities.map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary"
                disabled={!held.length}
                onClick={experiment}
              >
                Record comparison
              </button>
              <p className="microcopy">
                The simple baseline is alphabetical, not popularity. Adaptive
                ranking uses verified keywords; it may tie Qloo. One
                self-reported choice is not evidence of general improvement, and
                prior exposure to recommendations can bias the result.
              </p>
            </>
          ) : (
            <div className="empty-state small">
              <FlaskIcon />
              <p>
                No live candidate pool yet. Run recommendations in Relay first.
              </p>
              <Link href="/personal/relay">
                Open Relay
                <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
          {records.map((r, i) => (
            <details className="experiment" key={i} open={i === 0}>
              <summary>
                Experiment {records.length - i} ·{" "}
                {new Date(r.at).toLocaleString()}
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Hit@3</th>
                    <th>First relevant rank</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(r.result).map(
                    ([method, v]: [string, any]) => (
                      <tr key={method}>
                        <td>{method}</td>
                        <td>{v.hitAt3}</td>
                        <td>{v.firstRelevantRank}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <p className="microcopy">
                {r.candidateCount} common candidates. Sample size:{" "}
                {r.sampleSize}. {r.questionCount} answered verification
                questions. {r.method}
              </p>
            </details>
          ))}
        </section>
        <section className="panel privacy-controls">
          <ShieldCheck size={26} />
          <h2>Your data controls</h2>
          <p>
            Your personal profile lives in this browser. Studio has no access to
            it.
          </p>
          <h3>Active permissions</h3>
          {Object.entries(profile.consents).length ? (
            Object.entries(profile.consents).map(([c, g]) => (
              <div className="permission-row" key={c}>
                <span>
                  <strong>{c}</strong>
                  <small>
                    {g!.nodeIds.length} fields · until{" "}
                    {new Date(g!.expiresAt).toLocaleString()}
                  </small>
                </span>
                <button
                  className="text-button"
                  onClick={() => update(revoke(profile, c as Context))}
                >
                  Revoke
                </button>
              </div>
            ))
          ) : (
            <p>No active permission grants.</p>
          )}
          <button
            className="secondary"
            onClick={() => download("tastekey-profile.json", profile)}
          >
            <Download size={15} />
            Export my profile
          </button>
          <button className="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
            Delete my local profile
          </button>
          {confirmDelete && (
            <div className="notice">
              <p>
                Delete all preferences, budgets, grants, cached candidates, and
                experiments and saved travel quotes from this browser? Any
                category contributions from this session will also be withdrawn.
              </p>
              <button
                className="danger"
                onClick={async () => {
                  try {
                    await api("audience/withdraw", {});
                  } catch (e) {
                    error(
                      "Could not withdraw audience contributions. Try deletion again when connected.",
                    );
                    return;
                  }
                  localStorage.removeItem("tastekey.travel.quotes");
                  localStorage.removeItem(STORAGE);
                  localStorage.removeItem("tastekey.proof.pool");
                  localStorage.removeItem("tastekey.proof.records");
                  setRecords([]);
                  setPool(null);
                  update(emptyProfile());
                  setConfirmDelete(false);
                }}
              >
                Delete now
              </button>
              <button
                className="text-button"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
      <AudienceConsent profile={profile} />
      <section className="panel">
        <h2>What you have saved</h2>
        <div className="metrics-row">
          <div>
            <strong>
              {profile.nodes.filter((n) => n.status === "stated").length}
            </strong>
            <span>Directly stated tastes</span>
          </div>
          <div>
            <strong>
              {profile.nodes.filter((n) => n.status === "confirmed").length}
            </strong>
            <span>Verified interpretations</span>
          </div>
          <div>
            <strong>
              {profile.nodes.filter((n) => n.status === "inferred").length}
            </strong>
            <span>Unverified possibilities</span>
          </div>
          <div>
            <strong>{profile.history.length}</strong>
            <span>Recorded changes</span>
          </div>
        </div>
        <details>
          <summary>Inspect correction and verification history</summary>
          <div className="evidence-list">
            {profile.history
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id}>
                  <span className="tag">{e.source}</span>
                  <p>{e.detail}</p>
                  <small>{new Date(e.at).toLocaleString()}</small>
                </div>
              ))}
          </div>
        </details>
      </section>
    </>
  );
}
function FlaskIcon() {
  return <RotateCcw size={25} />;
}
