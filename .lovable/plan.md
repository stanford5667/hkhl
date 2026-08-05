# Plan: Add a Course Demo to the Research Page

## Goal
Add a dedicated Academy product-preview card to the main Research page, matching the style and structure of the existing Backtester product preview.

## What we'll build

1. **New component: `src/components/research/AcademyProductPreview.tsx`**
   - Same shell as `BacktesterProductPreview`: rounded-xl card, cyan border, ambient glow, bottom progress-bar accent, no header badge.
   - Two-column layout on desktop: copy on the left, interactive demo on the right. Visual stacks on top on mobile.
   - Copy side:
     - Headline: "Learn the strategy behind the signals"
     - Subheadline: "92 self-paced lessons take you from market fundamentals to automated quant execution — no coding required."
     - Primary CTA: "Explore the Academy" → links to `/academy`
     - Small meta line: "Beginner to advanced · video + templates"
   - Visual side: embed the existing `AcademyDemo` from `src/components/demos/AcademyDemo.tsx` (progress ring, sample lesson, resume button, AI insight).

2. **Wire it into `src/pages/Research.tsx`**
   - Import and render `<AcademyProductPreview />` directly below `<BacktesterProductPreview />` and above `<HubOverviewGrid />`.

3. **Polish**
   - Preserve the dark/cyan design tokens and hover effects used by the Backtester card.
   - Ensure mobile stacking does not break the demo or hide the CTA.
   - Keep CTAs honest and avoid "free"/"guarantee" claims unless already true.

## Out of scope
- No new routes or backend changes.
- No changes to the Backtester preview or the demo carousel below it.
- No new video assets; reuse the existing `AcademyDemo` sample.

## Verification
- TypeScript check passes.
- Screenshot check at 390px and 1280px: card renders, CTA is visible, demo visual loads.
- Clicking the CTA navigates to `/academy`.
