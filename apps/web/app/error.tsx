"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>This view could not load.</h1>
      <p>Your saved profile and business records are still stored.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
