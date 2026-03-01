# Stake Front-End Assessment

## Quick Start

**Prerequisites:** Node.js 18+, npm 9+

```bash
cd myProject
npm install --legacy-peer-deps
npm start          # http://localhost:4200
```

| Command | Description |
|---------|-------------|
| `npm start` | Dev server with live reload |
| `npm run build` | Production build → `dist/` |
| `npm test` | Unit tests (Karma + Jasmine) |
| `npm run lint` | ESLint across TS + HTML |

---

## Project Structure

```
src/app/
├── pages/          # Smart components — inject services, manage streams
│   ├── invest/     # Holdings dashboard
│   └── discover/   # Browse & search
├── components/     # Dumb components — inputs/outputs only, no services
│   ├── card/
│   ├── instrument/
│   ├── type-badge/
│   └── order-form/
├── services/       # Business logic and data access
├── models/         # Pure TypeScript types — no logic
└── tabs/           # Tab bar layout
```

---

## Where to Start

Start in [src/app/pages/invest/invest.page.ts](src/app/pages/invest/invest.page.ts) — it's the main tab and the simplest full data-flow example. From there, follow the chain:

```
security.service.ts          ← joins details.json + pricing.json → SecurityViewModel
holdings.service.ts          ← manages portfolio positions       → HoldingViewModel
    ↓
invest.page.ts / discover.page.ts   ← smart pages: subscribe, pass data down
    ↓
card / instrument / order-form      ← dumb components: @Input only, no services
```

Key files by concern:

| Concern | File |
|---------|------|
| Data loading & join | `services/security.service.ts` |
| Portfolio state | `services/holdings.service.ts` |
| Browse + search | `pages/discover/discover.page.ts` |
| Buy flow animation | `components/order-form/order-form.component.ts` |
| Shared types | `models/security-view.model.ts`, `models/async-state.model.ts` |

---

## Design Assumptions

### Data

| Assumption | Decision | Reason |
|------------|----------|--------|
| `pricing.json` has no `currentPrice` | Use `ask` as display price | `ask` = what a buyer pays right now |
| `details.json` and `pricing.json` have different `id` values | Join on `symbol` | `symbol` is the stable cross-file identifier |
| Some securities have no match in the other file | Drop unpaired records silently | `SecurityViewModel` requires non-null price fields |
| Some securities have `null` volume / marketCap | Render `—` | `0` would imply zero, which is factually wrong |
| Dataset has no `otc` entries | Still define `otc` in model and `TypeBadgeComponent` | Forward-compatible — no code change needed when OTC data arrives |

### UI

| Assumption | Decision | Reason |
|------------|----------|--------|
| Figma only shows the gain state | Loss = red; flat = muted grey | Universal trading UI convention |
| Holdings "Change" column is ambiguous | Show `unrealisedGainPercent` (ask vs averageCost) | Portfolio screens show position performance, not daily movement |
| "Trending stocks" has no spec | Top 10 by `volume` descending | Volume is the only meaningful ranking signal in the dataset |

### Features

| Assumption | Decision | Reason |
|------------|----------|--------|
| No `holdings` file provided | Created `holdings.mock.json` with 7 positions (gains, losses, flat) | Exercises all rendering states |
| `POST /api/recently-searched` not simulated | In-memory `trackSearch()` in `SecurityService` | UI behaviour fully exercised; only cross-reload persistence is missing |

---

## API Contract

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/securities` | Static metadata (symbol, name, type, logo, volume, marketCap) |
| `GET` | `/api/securities/:symbol/price` | Live pricing (open, close, ask, high, low) |
| `GET` | `/api/holdings` | User's portfolio positions |
| `GET` | `/api/recently-searched` | Last searched securities — `{ symbol }[]` |
| `POST` | `/api/orders` | Place a buy order |

In dev, `environment.apiBaseUrl` points to `/assets/data` (local JSON). Switching to a real backend is one line in `environment.prod.ts` — no component or service changes required.

---

## Extension Points

Each of these is a single, contained change — no ripple across components.

| What to extend | How | File |
|----------------|-----|------|
| Switch mock JSON → real backend | Change `apiBaseUrl` value | `environments/environment.prod.ts` |
| Redesign a card or instrument row | Edit template/styles only | `components/card/`, `components/instrument/` |
| Change backend response format | Update the join/map in `loadSecurities()` — ViewModel stays stable, components untouched | `services/security.service.ts` |
| Add a new security type (e.g. crypto) | Add a case to the `type` union and `TypeBadgeComponent` switch | `models/security-view.model.ts`, `components/type-badge/` |
| Switch to server-side search | Replace `searchSecurities()` body with `http.get('/api/securities?q=...')` — page pipeline unchanged | `services/security.service.ts` |
| Add live pricing via WebSocket | Replace `loadPricing()` with `webSocket(url)` — `combineLatest` already re-joins on new emissions | `services/security.service.ts` |
| Change how HTTP errors are worded | Edit `toHttpErrorMessage()` — all pages update automatically | `utils/http-error.util.ts` |
| Rebrand colours / dark mode | Override CSS custom properties in one media query block | `theme/variables.scss` |

---

## Trade-offs

| Decision | Upside | Downside | File |
|----------|--------|----------|------|
| `combineLatest` over `forkJoin` | Join re-runs if either source re-emits — ready for live pricing WebSocket | Slightly more complex than one-shot `forkJoin` | `services/security.service.ts` |
| `HoldingViewModel` extends `SecurityViewModel` fully | Structural subtype — no casts; extra fields ready if Holdings row design expands | Carries 7 fields the current layout doesn't render | `models/holding-view.model.ts` |
| `switchMap` + `getHoldingsPage(limit)` in service | Page only owns the limit; switching to a real paginated endpoint changes one method body | "Show more" briefly shows a loading state on each click | `services/holdings.service.ts`, `pages/invest/invest.page.ts` |
| `retry({ count: 2, delay: 1000 })` on all GETs | Tolerates transient failures silently; three consecutive failures surface a clean error | Adds up to 2 s of extra latency before the error is shown | `services/security.service.ts`, `services/holdings.service.ts` |
| `catchError` per stream | Template always receives a typed state, never `null` | Stream terminates on error — no automatic recovery without a page refresh | `services/security.service.ts`, `services/holdings.service.ts` |
| `timer()` + `takeUntilDestroyed()` for POST simulation | Auto-cancels if user navigates away mid-flight; no `ngOnDestroy` or timer handles needed | `subscribe()` inside a component method is imperative — can't use `async` pipe for one-shot side effects | `components/order-form/order-form.component.ts` |
| `shareReplay(1)` default `refCount: false` | Late subscribers immediately get the cached value | Stream stays alive even with zero subscribers — won't self-clean on logout | `services/security.service.ts` |
| `OnPush` + `markForCheck()` | Eliminates unnecessary dirty-checks | Every imperative mutation (pointer events, RxJS `.subscribe()` callbacks) must call `markForCheck()` manually | all components |
| Silent drop for unpaired securities | Components always receive well-formed ViewModels | Data mismatches are invisible at runtime — hard to diagnose | `services/security.service.ts` |
| `provideAnimations()` (deprecated since Angular 20.2) | No rewrite of existing sheet/chevron animations | Must migrate to `animate.enter` / `animate.leave` before Angular v23 | `main.ts` |
| No optimistic updates on buy | No rollback logic needed | Holdings list only updates after the POST resolves | `pages/invest/invest.page.ts`, `pages/discover/discover.page.ts` |
| Client-side search with `MIN_SEARCH_LENGTH = 2` | Short queries return the full cached list instantly; page pipeline is already server-side ready | Won't scale past ~1 000 securities | `services/security.service.ts`, `pages/discover/discover.page.ts` |
| No unit tests | Faster to ship | Regressions in service logic (blended cost, join, search) have no safety net | — |

---

## Future Work

| Item | What to add | Where |
|------|-------------|-------|
| **Auth interceptor** | `HttpInterceptorFn` that attaches the Bearer token and redirects to login on 401 | New `auth.interceptor.ts` + `provideHttpClient(withInterceptors([authInterceptor]))` in `main.ts` |
| **`shareReplay` refCount** | `shareReplay({ bufferSize: 1, refCount: true })` so cached streams self-clean when the user logs out | `security.service.ts`, `holdings.service.ts` |
| **Live pricing (WebSocket)** | Replace `loadPricing()` with `webSocket<SecurityPricing[]>(url)` — `combineLatest` already re-joins on every emission | `security.service.ts:loadPricing()` |
| **Optimistic buy** | Call `addHolding()` immediately, then POST; on failure call `removeHolding()` to roll back | `invest.page.ts` / `discover.page.ts:handleBuyConfirmed()` |
| **Server-side search** | Replace `searchSecurities()` body with `http.get('/api/securities?q=...')` — page pipeline (`debounceTime` + `distinctUntilChanged` + `switchMap`) needs no changes | `security.service.ts:searchSecurities()` |
