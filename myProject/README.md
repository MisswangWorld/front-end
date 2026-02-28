# Janispace — Stake Front-End Assessment

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
cd myProject
npm install --legacy-peer-deps
```

### Commands

| Command | What it does |
|---|---|
| `npm start` | Start dev server at `http://localhost:4200` with live reload |
| `npm run build` | Production build (output to `dist/`) |
| `npm run watch` | Development build in watch mode |
| `npm test` | Run unit tests via Karma + Jasmine |
| `npm run lint` | Run ESLint across all TypeScript and HTML files |

## Design Assumptions

- **What**: `pricing.json` has no `currentPrice` field — only `open`, `close`, `ask`, `high`, `low`.
  **Decision**: Use `ask` as the current/display price throughout the UI.
  **Why**: `ask` is the price a buyer would pay right now, which is the most meaningful "live" price in a trading context.

- **What**: Some securities in `details.json` have `null` for `volume` and `marketCap`.
  **Decision**: Render `—` (em-dash) in the UI for null numeric fields rather than `0` or hiding the row.
  **Why**: `0` would imply no volume, which is factually wrong. `—` signals "data unavailable" without misleading the user.

- **What**: `details.json` and `pricing.json` use different `id` values for the same security.
  **Decision**: Join exclusively on `symbol`. The `id` fields are treated as internal database keys and never exposed to the component layer.
  **Why**: `symbol` is the stable, human-readable identifier used across both files and matches what a real securities API would use as the join key.

- **What**: Figma only defines the gain (green) price change state — loss and flat states are not designed.
  **Decision**: Loss renders in red with a `-` prefix; flat renders in muted grey (`ion-color-medium`) with `0.00%`.
  **Why**: Red for loss and grey for flat are universal conventions in trading UIs (Robinhood, CommSec, Stake itself). Omitting them would leave the UI broken for any non-gain position.

- **What**: The assessment asks for a holdings data design but doesn't provide the file.
  **Decision**: Created `holdings.mock.json` with 7 positions (mix of gains，losses, and flat) to seed `HoldingsService`.
  **Why**: Provides realistic data for the Invest page. Positions are intentionally mixed — some below `ask` (unrealised gain), some above (unrealised loss) — to exercise price change rendering in both directions.

- **What**: The "Change" column in the Holdings list is ambiguous — it could mean today's price movement or the position's unrealised gain.
  **Decision**: Render `unrealisedGainPercent` (ask vs averageCost) in the Holdings "Change" badge, not `priceChangePercent`.
  **Why**: The Holdings list is a portfolio view — the most meaningful number for an investor is how their position is performing relative to what they paid, not how the stock moved today. Unrealised gain answers "am I up or down on this trade?" which is what a holdings screen is for.

- **What**: The current `details.json` dataset only contains `stock` and `etf` types — no `otc` entries are present.
  **Decision**: `SecurityType` in `security-detail.model.ts` is still defined as `'stock' | 'etf' | 'otc'`, and `TypeBadgeComponent` renders all three variants.
  **Why**: The type union and the badge styles reflect the full domain, not the current dataset. If an `otc` security is added (or arrives from a real API), nothing breaks — no model change, no component update needed. Constraining the type to only what the mock data happens to contain would be over-fitting to test data.

## Component Architecture

### Why `combineLatest` instead of `forkJoin`

The service layer uses `combineLatest` to merge `details$` and `pricing$` (and positions + securities in `HoldingsService`). This is a deliberate forward-compatible choice:

- `forkJoin` requires every stream to **complete** before it emits — it only works for one-shot requests
- `combineLatest` works with streams that emit multiple times — it re-runs the join whenever any source updates

In the current mock, `loadPricing()` uses `of(data).pipe(delay(300))` — a one-shot stream. But in production, pricing would be a WebSocket or polling stream that emits continuously. Switching `loadPricing()` to a real-time source requires **zero changes** to `combineLatest`, `joinSecurities`, or any component — the UI automatically becomes live-updating.

### ViewModel isolation

Components never touch raw JSON shapes (`SecurityDetail`, `SecurityPricing`). They only consume:

- `SecurityViewModel` — all fields needed to render any security (Discover tab)
- `HoldingViewModel` — extends `SecurityViewModel` with position fields (Invest tab)

If the backend data format changes, the fix is in the service's join method only.

### `HoldingViewModel` shape — full extension vs. lean model

**The trade-off**: The current Holdings list design only displays `symbol`, `shares`, current price (`ask`), and `unrealisedGainPercent` — it does not visibly use `logo`, `fullName`, or `type`. A stricter YAGNI approach would define a lean model with only those four fields.

**Decision**: `HoldingViewModel` extends `SecurityViewModel` fully (inherits all ~11 fields), then adds position-specific fields on top.

**Why**:
1. **TypeScript structural typing** — any component that accepts `SecurityViewModel` as an `@Input()` (e.g. `InstrumentComponent`, `CardComponent`) can receive a `HoldingViewModel` directly, because it is a structural superset. A lean model would break this: you'd need an explicit cast or a separate input type.
2. **Zero-cost design flexibility** — if the Holdings row later shows a logo or full name (common in real trading apps), no model or service changes are needed. The data is already there.
3. **Consistency** — the entire app works in one ViewModel currency. Pages don't need to know which fields a component actually renders; they just pass the ViewModel through.

The downside is carrying ~7 fields the current Holdings list doesn't render. This is an acceptable cost given the reusability and type-safety benefits.


## API / Data Model Design

This section documents the API structure expected in a production environment. In this assessment, real HTTP calls are simulated using `of(data).pipe(delay(300))` inside the service layer — the frontend is written against this contract so a real `HttpClient.get()` could replace the mock with no component changes.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/securities` | All tradeable securities — static metadata (symbol, name, type, logo, volume, marketCap) |
| `GET` | `/api/securities/:symbol/price` | Live pricing for one security (open, close, ask, high, low) |
| `GET` | `/api/holdings` | Authenticated user's current portfolio positions |
| `POST` | `/api/orders` | Place a buy order `{ symbol, quantity, price }` |

### Why two separate endpoints for securities?

`/api/securities` (metadata) and `/api/securities/:symbol/price` (pricing) are intentionally split because they change at very different rates:

- **Metadata** (name, logo, type) is essentially static — cached aggressively, fetched once on app load.
- **Pricing** is volatile — in production this would be polled every few seconds or replaced by a WebSocket stream.

Keeping them separate avoids invalidating the metadata cache every time a price ticks.

### Join strategy

The provided JSON files have **different `id` values** for the same security. The client-side join happens in `SecurityService` on `symbol`:

```
SecurityDetail (details.json)  ──┐
                                  ├─ join on `symbol` ──▶ SecurityViewModel
SecurityPricing (pricing.json) ──┘
```

### Holdings data model

`GET /api/holdings` returns user positions. Each position references a security by `symbol` only — the frontend enriches it with metadata and live price via the join above:

```json
{ "symbol": "AAPL", "shares": 10, "averageCost": 1080.00 }
```

The holdings endpoint owns only position data. It does not duplicate security metadata, which is already available from `/api/securities`.

### Order response

`POST /api/orders` returns an order confirmation. This response drives the BUY animation success state in `OrderFormComponent`:

```json
{ "orderId": "abc123", "symbol": "AAPL", "shares": 2, "executedPrice": 1128.00, "status": "filled" }
```

## Trade-offs & Unfinished Items

<!-- Anything not completed within the time cap, and why -->
