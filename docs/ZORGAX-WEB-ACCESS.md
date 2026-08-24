# Zorgax live web access

ZORGAX-001 can enrich chat answers with read-only external web search and return the source records used by the model.

## Providers

General web search uses the first configured provider:

1. `BRAVE_SEARCH_API_KEY` — Brave Web Search API.
2. `TAVILY_API_KEY` — Tavily Search fallback.

Wikipedia is queried as a public reference fallback. GDELT is added for queries that look time-sensitive or news-related. A general provider key is required for broad web coverage.

```bash
ZARGOX_LIVE_CONTEXT_ENABLED=true
BRAVE_SEARCH_API_KEY=<server-side-secret>
# or: TAVILY_API_KEY=<server-side-secret>
```

The keys must stay in the deployment environment. They must never be exposed to the browser or committed to Git.

## API

`POST /api/zargox/chat`

```json
{
  "message": "Quali sono le ultime novità sul progetto?",
  "useWeb": true,
  "history": []
}
```

The response contains `external_sources`, `web_search_provider` and `web_access_requested`. Source labels are response-local (`S1`, `S2`, …) and match the labels supplied to the model.

## Boundaries

- Search is read-only; Zorgax does not sign in, submit forms, purchase, publish or modify external sites.
- External text is untrusted evidence and cannot override the system prompt.
- Only `http` and `https` source links without embedded credentials are published.
- Results are deduplicated and capped at ten sources per answer.
- Public chat requests are rate-limited per runtime instance.
- Search snippets may be incomplete or stale; answers must communicate uncertainty and source disagreement.

Provider documentation:

- https://api-dashboard.search.brave.com/app/documentation/web-search/get-started
- https://docs.tavily.com/documentation/api-reference/endpoint/search
