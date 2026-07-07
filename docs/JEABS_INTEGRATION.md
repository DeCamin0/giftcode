# JEABSlist Integration

**Status:** Gift codes — **implemented**. Player stats — **`/getinfo`** (partial: needs `JEABS_API_TOKEN`).

**Site:** [https://kingshot.jeab.dev/](https://kingshot.jeab.dev/) (JEABSlist)

---

## Gift codes — ACTIVE (dual source)

```
GET https://kingshot.jeab.dev/api/codes
→ [{ "Code": "PICNIC2026", "IsActive": true, "DiscoveredAt": "..." }, ...]
```

- No auth required
- Bot merges with `kingshot.net/api/gift-codes`
- Deduplication by exact code string (`gift_codes.code` UNIQUE in MariaDB)
- Discord notification sent **once** per code
- Disable with `JEAB_GIFT_CODES_ENABLED=false` in `.env`

---

## What is JEABSlist?

Community-built Kingshot tracker (not official Century Games). It provides:

- Player search and profiles
- Kingdom stats (grade, MMR, Mystic)
- KvK fight highlights and comparisons
- Gift code listing and redemption tracking
- Alliance / leaderboard analytics

Rough scale (homepage, June 2026): ~400k players tracked, tens of thousands of redemptions logged.

---

## Why consider it?

| Feature | Current bot sources | JEABSlist could add |
|---|---|---|
| Gift codes | `kingshot.net` + `jeab.dev/api/codes` | ✅ Done |
| Player basic info | `kingshot-giftcode.centurygame.com/api/player` | Same basics + richer stats |
| KvK / MMR / Mystic | Not available | Yes |
| Kingdom compare | Not available | Yes |
| Alliance data | Not available | Possibly |

---

## API investigation (June 2026)

### Public JSON (easy) — kingshot.net

```
GET https://kingshot.net/api/gift-codes
→ JSON, no auth — already used by this bot
```

### Century Games redeem API — already used

```
POST https://kingshot-giftcode.centurygame.com/api/player
POST https://kingshot-giftcode.centurygame.com/api/gift_code
→ MD5 signed requests — used for /register lookup, /redeem, /redeemall
```

### JEABSlist API — protected

Probed endpoints:

| URL | Result |
|---|---|
| `GET /api/players/{fid}` | **401** — `A valid session token is required` |
| `GET /api/kingdoms/{kid}` | **401** — same |
| `GET /api/gift-codes` | Returns SPA HTML, not JSON |
| `GET /api/player/{fid}` | Returns SPA HTML (client-side routing) |

**Conclusion:** JEABS has a backend API, but it requires a **browser session token**. It is not a simple open REST API like kingshot.net.

---

## `/getinfo` command — ACTIVE

```
/getinfo player_id: 265681775
/getinfo                    # uses your registered ID
```

**Data sources:**

1. **Game API** (`centurygame.com/api/player`) — always used when available (name, kingdom, town level, avatar)
2. **JEABS** (`/api/players/{fid}`) — power, mystic, kills, MMR, alliance — **only if** `JEABS_API_TOKEN` is set in `.env`

**How to get the JEABS token (admin, ~2 min):**

1. Open [kingshot.jeab.dev](https://kingshot.jeab.dev) in Chrome
2. F12 → **Network** → search a player (any ID)
3. Click a request to `/api/players/...`
4. Copy header **`X-API-Token`** (or get it from `GET /api/session` response after Turnstile)
5. Paste in `.env`: `JEABS_API_TOKEN=your_token_here`
6. Restart bot — token expires periodically; refresh when `/getinfo` shows auth error

Without token: `/getinfo` still works with basic game API data + link to full JEABS profile.

---

## ~~Proposed future command~~ (replaced by `/getinfo`)

## Implementation plan (when approved)

### Phase 1 — Research

1. Open jeab.dev in browser DevTools → Network tab
2. Find how session token is issued (cookie, header, localStorage)
3. Document required headers (`Authorization`, `X-Session-Token`, etc.)
4. Confirm stable endpoints for player + kingdom JSON shape
5. Add rate limits (respect their service — community project)

### Phase 2 — Service module

```
src/services/jeabsPlayer.js   # fetch + parse JEABS player data
src/commands/playerinfo.js    # slash command
```

**`.env` (future):**

```env
JEABS_ENABLED=false
JEABS_API_BASE=https://kingshot.jeab.dev
JEABS_SESSION_TOKEN=          # if static token works (unlikely)
# or cookie-based auth from automated session bootstrap (complex)
```

### Phase 3 — Discord output

- Embed with stats + thumbnail (if avatar URL available)
- Bilingual EN / ES descriptions (match existing bot style)
- Error handling: 401 → "JEABS auth expired, contact admin"

### Phase 4 — Optional

- Use JEABS gift codes as **secondary** source alongside kingshot.net
- Compare codes from both sources before notifying Discord

---

## Risks and constraints

| Risk | Mitigation |
|---|---|
| Session token expires | Refresh logic or manual token in `.env` |
| API changes without notice | Feature flag `JEABS_ENABLED=false` |
| Rate limiting / blocking | Cache results, delay between requests |
| Not official | Mark as community data in embed footer |
| Overlap with centurygame API | Use JEABS only for stats, not for redeem |

---

## What we will NOT use JEABS for

- **Redeem** — keep using `kingshot-giftcode.centurygame.com` (already working)
- **Mail collection in-game** — impossible from any API
- **Replacing** kingshot.net code poller — unless proven more reliable

---

## Comparison summary

| Source | Auth | Best for |
|---|---|---|
| kingshot.net | None | Active gift codes (current) |
| centurygame.com | MD5 sign | Register, redeem (current) |
| jeab.dev | Session token | Rich player/kingdom/KvK stats (future) |

---

## Decision log

| Date | Decision |
|---|---|
| 2026-06-21 | User asked about jeab.dev — investigated API |
| 2026-06-21 | Integration deferred — document only, no code |
| TBD | Implement `/playerinfo` after session auth is reverse-engineered |

---

## References

- JEABSlist: https://kingshot.jeab.dev/
- Current bot gift codes API: https://kingshot.net/api/gift-codes
- Current bot redeem API: https://kingshot-giftcode.centurygame.com/api
