"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  TravelQuoteSchema,
  type TravelQuote,
  type Entity,
} from "@tastekey/shared-types";
import { eligibleQuotes } from "../../../packages/evaluation/travel";
export default function TravelQuotes({
  destinations,
  budget,
}: {
  destinations: Entity[];
  budget?: number;
}) {
  const [quotes, setQuotes] = useState<TravelQuote[]>([]),
    [ready, setReady] = useState(false),
    [blocked, setBlocked] = useState(false),
    [destinationId, setDestination] = useState(""),
    [name, setName] = useState(""),
    [price, setPrice] = useState(""),
    [source, setSource] = useState(""),
    [stayDate, setDate] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tastekey.travel.quotes");
      if (raw)
        setQuotes(z.array(TravelQuoteSchema).max(100).parse(JSON.parse(raw)));
    } catch {
      setBlocked(true);
      setNotice(
        "Saved quotes could not be read. Export site data before clearing browser storage; new writes are paused.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !blocked)
      try {
        localStorage.setItem("tastekey.travel.quotes", JSON.stringify(quotes));
      } catch {
        setNotice("Browser storage is unavailable; quotes were not saved.");
      }
  }, [quotes, ready, blocked]);
  const candidates = eligibleQuotes(
    quotes,
    destinations.length
      ? destinations.map((d) => d.id)
      : quotes.map((q) => q.destinationId),
    budget,
  );
  return (
    <section className="panel">
      <h2>Compare accommodation quotes you checked</h2>
      <p>
        Bring a dated quote from an accommodation provider. Prices stay in this
        browser and are filtered by your authorized nightly USD limit
        {budget === undefined ? " (no limit applied)" : ` ($${budget})`}. Qloo
        supplies cultural destinations; it does not supply these prices or
        verify availability.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const destination = destinations.find((d) => d.id === destinationId);
          if (!destination) return;
          const parsed = TravelQuoteSchema.safeParse({
            id: crypto.randomUUID(),
            destinationId,
            destination: destination.name,
            name,
            nightlyUSD: Number(price),
            source,
            stayDate,
            checkedAt: new Date().toISOString(),
          });
          if (!parsed.success) {
            setNotice(
              "Enter a valid positive USD nightly quote, date, and public HTTPS source URL.",
            );
            return;
          }
          setQuotes((q) => [parsed.data, ...q].slice(0, 100));
          setName("");
          setPrice("");
          setSource("");
          setNotice(
            "Quote saved as your reported observation. Confirm its full terms and availability with the provider before booking.",
          );
        }}
      >
        <div className="form-grid">
          <label className="field-label">
            Quoted destination
            <select
              required
              value={destinationId}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Choose a Qloo destination</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Accommodation name
            <input
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field-label">
            Quoted nightly price (USD)
            <input
              required
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label className="field-label">
            Stay date
            <input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={stayDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <label className="field-label">
          Public quote source (HTTPS)
          <input
            required
            type="url"
            maxLength={2000}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Use a public listing URL without account or booking tokens"
          />
        </label>
        <button
          className="secondary"
          disabled={!destinations.length || blocked}
        >
          Save checked travel quote
        </button>
        {!destinations.length && (
          <p>Find live destination recommendations first to attach a quote.</p>
        )}
      </form>
      {notice && <p role="status">{notice}</p>}
      <h3>Quotes within the current constraints</h3>
      {candidates.length ? (
        candidates.map((q) => (
          <article className="outcome-record" key={q.id}>
            <h3>
              {q.name} · {q.destination}
            </h3>
            <p>
              ${q.nightlyUSD} per night · {q.stayDate}
            </p>
            <a href={q.source} target="_blank" rel="noopener noreferrer">
              Recheck provider listing
            </a>
            <p className="microcopy">
              Reported by you {new Date(q.checkedAt).toLocaleString()}. Not
              independently verified. Taxes, transport, visas, accessibility and
              availability need checking.
            </p>
          </article>
        ))
      ) : (
        <p>
          No saved quotes meet the current destination, date, freshness and
          budget constraints.
        </p>
      )}
      <p className="microcopy">
        Quotes expire from comparison after 48 hours or once their stay date has
        passed. No conversion rate, price or availability is invented.
      </p>
      {quotes.length > 0 && (
        <details>
          <summary>Manage saved quotes ({quotes.length})</summary>
          {quotes.map((q) => (
            <p key={q.id}>
              {q.name}: ${q.nightlyUSD} · {q.stayDate}{" "}
              <button
                className="text-button"
                onClick={() => setQuotes((v) => v.filter((x) => x.id !== q.id))}
              >
                Remove saved quote
              </button>
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
