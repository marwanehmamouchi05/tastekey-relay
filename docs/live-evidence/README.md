# Live Qloo integration evidence

`qloo-verification.json` was produced by actual calls through the official harness using the issued hackathon credential and `https://hackathon.api.qloo.com`.

- Exact reviewed signal: the Interstellar movie UUID returned by live search.
- Search: five candidates, preserved for ambiguity review.
- Movie Insights: 12 entities.
- Cross-category book Insights: 12 entities.
- Movie Insights with a Casablanca location signal: 12 entities.
- All three Insights responses contained explainability for their returned entities.

Only public cultural IDs, names, categories, affinity values, bounded explainability, request parameters and provenance are retained. Descriptions and all credentials are omitted from the public summary. Qloo-derived data remains subject to Qloo's terms; the source-code MIT license does not relicense the provider's data.

These are real integration results, not evidence of an individual's identity, calibrated liking probability, measured ranking improvement, customer demand or revenue. Separate UI workflows use explicitly synthetic business briefs to test the application. They are not real business outcome reports.

## October 27 completion evidence

- `studio-category-verification.json`: actual bookshop/book, cafe/place, retail/brand and travel/destination transport checks with an explicitly synthetic Casablanca business brief.
- `bedrock-verification.json`: real Nova Micro correction and grounded pilot-interpretation integration using synthetic inputs and real Qloo results. Pilot wording is model interpretation requiring owner review, not a new Qloo fact or proof of usefulness. Invalid interpretations retain baseline proposals.
- `deployment-verification.json` is a historical deployment checkpoint; its optional-model-unconfigured limit describes that earlier revision. The latest public/runtime status is in `../STATUS.md`.
