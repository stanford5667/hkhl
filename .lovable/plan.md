
# Stock Discovery (Tinder/TikTok for Stocks)

Add a swipeable stock discovery experience where users swipe right to like, left to pass, up to save, and tap to view full research.

---

## What gets added

- A new **"Swipe Stocks"** page at `/stock-swipe` with a card-stack UI powered by framer-motion gestures
- Filter by sector and asset type (Stocks/ETFs)
- Live stats bar tracking likes, passes, and saves
- Keyboard shortcuts (arrow keys + Ctrl+Z undo)
- Right-swipes automatically add stocks to watchlist
- End-of-deck summary with link to watchlist
- Navigation links in sidebar, mobile nav, and Discovery Hub

---

## Key adaptation needed

The uploaded code references a `watchlist_items` table that doesn't exist. The project uses `user_watchlist` instead, which has a different schema (`item_id`, `item_name`, `item_type`, `user_id`). The hook will be updated to write to `user_watchlist` correctly.

---

## Implementation steps

1. **Copy uploaded files** into `src/components/stock-discovery/` and `src/hooks/` and `src/pages/`

2. **Fix `useStockDiscoveryFeed.ts`** -- Update the watchlist upsert from:
   ```
   supabase.from("watchlist_items").upsert({ ticker, source: "discovery_swipe" })
   ```
   to use `user_watchlist` with the correct columns (`item_id`, `item_name`, `item_type`, `user_id`) and proper auth check

3. **Remove `as any` casts** on the `asset_universe` query since the table exists in the typed schema

4. **Add route** in `App.tsx`:
   - Lazy import `StockDiscovery`
   - Add `<Route path="/stock-swipe" element={<StockDiscovery />} />`

5. **Add to sidebar** (`Sidebar.tsx`):
   - Import `Flame` icon
   - Add nav item `{ label: "Swipe Stocks", subtitle: "Discover & Like", href: "/stock-swipe", icon: Flame }` after Research

6. **Add to mobile nav** (`MobileNav.tsx`):
   - Add `{ label: "Swipe Stocks", href: "/stock-swipe", icon: Flame }` to nav items

7. **Add entry point in Discovery Hub** (`DiscoveryHub.tsx`):
   - Add a prominent card/button linking to `/stock-swipe` with "Try Swipe Discovery"

---

## Technical details

### Files created
| File | Purpose |
|------|---------|
| `src/components/stock-discovery/StockSwipeCard.tsx` | Draggable card with gesture detection, sector gradients, LIKE/NOPE/SAVE overlays |
| `src/components/stock-discovery/SwipeActionButtons.tsx` | Undo, Pass, Save, Like, Research action buttons |
| `src/components/stock-discovery/SwipeStatsBar.tsx` | Animated counters for swipe stats |
| `src/components/stock-discovery/DiscoveryFilterBar.tsx` | Sector and asset type filter pills |
| `src/components/stock-discovery/EndOfDeck.tsx` | End state with reset and watchlist link |
| `src/components/stock-discovery/index.ts` | Barrel exports |
| `src/hooks/useStockDiscoveryFeed.ts` | Data fetching from `asset_universe`, shuffle, swipe state, watchlist persistence |
| `src/pages/StockDiscovery.tsx` | Page component with keyboard shortcuts |

### Files modified
| File | Change |
|------|--------|
| `src/App.tsx` | Add lazy import + route |
| `src/components/layout/Sidebar.tsx` | Add nav item |
| `src/components/layout/MobileNav.tsx` | Add nav item |
| `src/pages/DiscoveryHub.tsx` | Add link to swipe discovery |

### Watchlist integration fix
The `user_watchlist` table requires: `item_id` (ticker string), `item_name` (stock name), `item_type` ("stock"), and `user_id` (from auth). The hook will get the current user session and insert accordingly, silently skipping if not authenticated.

### No new dependencies required
All dependencies (framer-motion, tanstack/react-query, supabase-js, lucide-react) are already installed.
