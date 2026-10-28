import Link from "next/link";

export default function JudgeTour() {
  return (
    <div className="simple-discovery">
      <div className="page-heading">
        <div>
          <h1>Try TasteKey in a few minutes.</h1>
          <p>
            One film. New things to enjoy. A useful idea for a small business.
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>Start with something you love</h2>
        <p>No account needed. Your likes stay in this browser.</p>
        <ol>
          <li>
            In Start, search for Interstellar and choose the matching film. Or
            choose “Not sure? Help me choose”.
          </li>
          <li>
            Open the optional follow-up question and choose what you like about
            it. You can reject every guess.
          </li>
          <li>
            In Suggestions, select the likes to use, share them for 24 hours and
            get real Qloo suggestions. Stop sharing to clear them.
          </li>
        </ol>
        <Link className="primary" href="/personal/discover">
          Try Personal
        </Link>
        <details className="simple-extra">
          <summary>Try a correction too</summary>
          <p>
            In Your likes, add “Luxury architecture” as a design taste and set a
            hotel limit separately. Optional AI can interpret “I love luxury
            architecture. My hotel budget is $60 a night. Keep my movie tastes.”
            Review the changes before applying them.
          </p>
          <p>
            Travel results are destination ideas, not hotel offers. No booking
            or price feed is connected.
          </p>
        </details>
      </section>
      <section className="panel">
        <h2>Turn cultural connections into a business idea</h2>
        <p>
          Studio opens a private demo workspace. Your work is separate from
          other visitors.
        </p>
        <ol>
          <li>
            Create a cinema in Casablanca. Set a goal such as “Plan one weekday
            screening” and a 500 MAD pilot budget. Label the business as a test.
          </li>
          <li>
            Search for Interstellar as a cultural reference, choose the result
            and save. In Find ideas, choose “Find ideas with Qloo”.
          </li>
          <li>
            Inspect the evidence, accept one idea and save an action plan. In
            More tools → Compare options, try Rabat and a smaller budget.
          </li>
        </ol>
        <Link className="primary" href="/studio/onboarding">
          Try Studio
        </Link>
        <p className="microcopy">
          Qloo supplies cultural connections. Suggested pilots still need the
          owner to check demand, costs, rights and capacity. No sales increase
          is claimed.
        </p>
      </section>
      <section className="panel">
        <h2>What makes it Qloo-powered?</h2>
        <p>
          Reviewed cultural references become Qloo entity IDs. Qloo returns
          related films, brands or places. TasteKey uses those results to
          suggest choices and business pilots, with evidence you can inspect.
          Basic planning remains available when cultural evidence is
          unavailable.
        </p>
        <p>
          Teams, audience contributions and publishing a business widget require
          verified sign-in. They are optional for this walkthrough.
        </p>
        <a
          className="text-button"
          href="https://github.com/marwanehmamouchi05/tastekey-relay/blob/main/docs/RESULTS.md"
          target="_blank"
          rel="noreferrer"
        >
          Read the evaluation and its limits
        </a>
      </section>
    </div>
  );
}
