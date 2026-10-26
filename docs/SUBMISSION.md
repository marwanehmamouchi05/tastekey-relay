# TasteKey Relay — One Intelligence, Two Worlds

**Draft. Publish only after the live and deployment checks in STATUS.md pass.**

## Problem

Personalization restarts on each website, while people have little control over which preferences travel with them. Businesses face a related gap: turning cultural interests into practical, testable decisions.

## What we built

TasteKey Personal captures a few explicit preferences, asks adaptive clarification questions, displays an editable taste graph, and applies selected fields to controlled entertainment, shopping and travel experiences. Practical budgets are separate from aesthetics. People can revoke consent or delete their browser-local profile.

TasteKey Studio saves private business profiles and supports cultural investigations, evidence-linked proposals, scenario inputs, action plans and owner-reported outcomes. Subsequent investigations incorporate rejected strategies and reported results. Individual Personal profiles are never available to Studio.

## Qloo contribution

The server-side adapter uses the event-supported official Qloo CLI to resolve reviewed entity choices and retrieve cultural relationships, with bounded calls and visible provenance. The product does not treat aggregate affinity as an individual's identity or probability of liking something.

**Verified integration:** The issued hackathon endpoint successfully resolved Interstellar and returned movie recommendations, cross-category book affinities, location-based movie results for Casablanca, and explainability. Actual evidence is stored in docs/live-evidence/qloo-verification.json. Synthetic unit fixtures remain separate. No recommendation-quality or business-outcome improvement is claimed.

## Technical implementation

TypeScript, Next.js, Tailwind CSS and React Flow; reusable domain/privacy/evaluation modules; SQLite tenant isolation through private sessions; a structured investigation workflow; optional configurable language-model adapters; Vitest and Playwright coverage.

## Limitations

Default strategy planning and hypothesis templates are deterministic. Optional AI language features need a configured provider. Shopping products/prices are illustrative samples. Destination suggestions are not bookable trips with verified costs or availability. Customer aggregates are not collected, and customer intelligence reports insufficient data. Proof observations are exploratory; no measured user-study improvement is claimed. Demo session authentication needs further development for production business use.

## Submission fields to complete

- Public live URL: pending
- Public source URL: record after repository publication
- Actual Qloo workflows and redacted evidence: initial live evidence recorded in docs/live-evidence/qloo-verification.json
- Measured experiments and sample sizes: none collected yet
- Screenshots: capture verified flows without secrets

Proposed story: discover a film preference, verify what matters, correct a hotel budget while preserving design taste, grant a context, then help a cinema owner investigate a cultural opportunity, compare a scenario, create a plan and record its real result.
