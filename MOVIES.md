# Adding movies & shows

Everything the Movies page shows comes from a single file: `public/movies.json`.
Edit that file (or use the helper script) and the site picks it up on the next
page load — it is fetched fresh every time, so episode counts always match.

## Helper script (easiest)

```bash
# add a movie
node scripts/add-movie.mjs movie \
  --title "Shrek" \
  --poster "https://example.com/shrek.jpg" \
  --link "https://example.com/embed/shrek"

# add an episode (creates the show automatically the first time)
node scripts/add-movie.mjs episode \
  --show "South Park" \
  --poster "https://example.com/sp.jpg" \
  --name "S27E01" \
  --link "https://example.com/embed/sp-2701"
```

## By hand

```json
{
  "updated": "2026-09-03T00:00:00Z",
  "movies": [
    { "id": "shrek", "type": "movie", "title": "Shrek", "poster": "URL", "link": "URL" }
  ],
  "shows": [
    {
      "id": "south-park",
      "type": "show",
      "title": "South Park",
      "poster": "URL",
      "episodes": [{ "name": "S27E01", "link": "URL" }]
    }
  ]
}
```

Rules:
- `id` must be unique and lowercase-dashed.
- Episode counts are derived from the `episodes` array — just append entries.
- `poster` can be any image URL (CDN, GitHub raw, etc.).
- Rows like "Marvel & Heroes" are matched by title keywords in `src/lib/movies.ts` (`COLLECTIONS`).
