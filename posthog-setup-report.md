<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Dark Corner USA. Since this is a static React SPA (not a traditional server-side Node.js app), the integration uses the PostHog JavaScript snippet loaded via `index.html`, with `window.posthog` called throughout `app.jsx`. The build pipeline (`build.js`) substitutes `POSTHOG_API_KEY` and `POSTHOG_HOST` env vars into the built `dist/index.html` at build time, keeping secrets out of source control. The GitHub Actions deploy workflow was updated to pass these secrets during CI builds.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `story_opened` | Fired when a user navigates to a story page. Top of the reading funnel. | `app.jsx` |
| `story_completed` | Fired when the user scrolls to the bottom of a story (reading progress ≥ 90%). | `app.jsx` |
| `story_bookmarked` | Fired when the user saves a story via the Save/★ button. | `app.jsx` |
| `story_bookmark_removed` | Fired when the user removes a saved bookmark for a story. | `app.jsx` |
| `story_shared` | Fired when the user taps the Share button on a story. Includes `share_method` (native or clipboard). | `app.jsx` |
| `library_searched` | Fired when the user performs a search in the library (non-empty query, 1s debounce). Includes `query` and `results_count`. | `app.jsx` |
| `advertising_cta_clicked` | Fired when the user clicks the "Reserve Your Spot" CTA on the Advertising page. Primary ad-lead conversion event. | `app.jsx` |
| `contact_link_clicked` | Fired when the user clicks a phone or email link on the Contact or Advertising page. Includes `link_type` and `page`. | `app.jsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1568320)
- [Stories opened (daily unique readers)](/insights/ji6vPBAc) — unique visitors opening stories per day
- [Story completion funnel](/insights/BjiBkPAn) — drop-off between opening and finishing a story
- [Bookmarks saved over time](/insights/A7NaooHa) — engagement signal: saves vs. removals
- [Advertising lead funnel](/insights/yJZCnQIA) — reader → "Reserve Your Spot" conversion
- [Top stories by opens](/insights/RcANrmpt) — which stories get the most reads (broken down by title)

### Important: add GitHub secrets

For the CI deploy to inject the PostHog token, add these two secrets to your GitHub repository (`Settings → Secrets and variables → Actions`):

- `POSTHOG_API_KEY` — your PostHog project token
- `POSTHOG_HOST` — `https://us.i.posthog.com`

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
