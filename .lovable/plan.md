

# Simplifying the Landing Page

## Problem
The landing page currently has 5 dense sections stacked vertically, each with heavy content:
1. **Hero** with backtest sandbox (dropdowns, chart, 4 metrics)
2. **Trending Tickers** carousel
3. **Investment Themes** — 6 detailed cards with sentiment, tickers, summaries
4. **Academy** — 8 module cards with thumbnails, descriptions, lesson lists
5. **Features Grid** — 3 feature cards + CTA footer

This creates information overload and dilutes the core message.

## Proposed Changes

### 1. Consolidate to 3 sections (Hero, Social Proof strip, CTA)

- **Hero** stays as-is — it's the core product demo and strongest section
- **Replace** Trending Tickers, Investment Themes, and Academy with a single compact "What You Get" section: 3 short feature cards (Backtesting, AI Insights, Academy) in a single row — icon, one-liner, and a link. No thumbnails, no lesson lists, no theme cards.
- **Remove** the separate Features Grid (redundant with the consolidated row)
- **Add** a slim social-proof strip (e.g., "10,000+ stocks · 30+ years of data · 90+ lessons") between hero and features

### 2. Keep Academy and Themes as dedicated pages only
The detailed module cards and theme grid already exist on `/academy` and `/investment-heatmap`. The landing page should tease them, not replicate them.

### 3. Streamlined footer CTA
Keep the existing "Start Building Your Edge" CTA block and footer.

## Result
The page goes from ~700 lines and 5 scroll-heavy sections to roughly 3 focused sections: **Hero → Social Proof → CTA**, with a compact feature row bridging them. Faster load, clearer funnel.

## Technical Details

**File:** `src/components/landing/MarketingLandingPage.tsx`

- Remove the Trending Tickers section (lines 404-444)
- Remove the Investment Themes section (lines 446-537)
- Remove the Academy section (lines 539-648)
- Remove the Features Grid section (lines 650-700)
- Remove unused imports (module images, theme data, icons like Globe, GraduationCap, Video, BookOpen, Play, Clock)
- Remove enrichment maps, MODULE_GRADIENTS, fallback module data, and the `useQuery` for modules
- Add a compact social-proof stat strip below the hero
- Add a single-row "What You Get" section with 3 minimal cards linking to `/academy`, `/investment-heatmap`, and the backtest sandbox
- Keep the CTA footer and auth dialog

