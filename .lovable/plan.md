

## Robust Elite Questionnaire Overhaul

### What We're Building

A comprehensive 6-step questionnaire under the Portfolio tab that merges the best of the existing IPS questionnaire (personality/behavioral questions) with the current elite financial questions, plus new sections for existing portfolio analysis and investor DNA.

### New Step Structure (6 steps, up from 3)

```text
Step 1: Financial Profile        (existing — keep as-is)
Step 2: Goals & Time Horizon     (pulled from IPS questionnaire)
Step 3: Risk & Personality       (merge current risk step + IPS behavioral scenarios)
Step 4: Existing Portfolios      (NEW — other brokerage accounts, 401k, IRA details)
Step 5: Preferences & Values     (IPS ethical/ESG + crypto + international prefs)
Step 6: Execution & Review       (existing execution step + summary before submit)
```

### New Questions Added

**Step 2 — Goals & Time Horizon** (from IPS questionnaire):
- Primary investment purpose (retirement, wealth building, financial independence, etc.)
- Time horizon (when do you need the money)
- Goal priority (critical vs. aspirational)

**Step 3 — Risk & Personality** (merge + new):
- Keep: drawdown tolerance slider, market fears, target return/risk profile
- Add from IPS: "$100K drops to $80K — what do you do?" scenario
- Add from IPS: "Which would you regret more — missing gains or losing money?"
- Add: Investment experience level (beginner/intermediate/advanced)

**Step 4 — Existing Portfolios** (brand new):
- Do you have other investment accounts? (401k, IRA, taxable brokerage, etc.)
- Estimated total value across all accounts
- Current asset mix (mostly stocks, mostly bonds, mixed, unsure)
- Any concentrated positions? (>20% in a single stock)
- Current use of options in other accounts

**Step 5 — Preferences & Values** (from IPS):
- Ethical exclusions (tobacco, weapons, fossil fuels, gambling)
- International investment comfort
- Volatility preference (steady vs. growth)
- Cryptocurrency stance

### Technical Changes

1. **Database migration**: Add new columns to `elite_client_profiles`:
   - `investment_purpose`, `time_horizon`, `goal_priority` (text)
   - `loss_reaction`, `regret_preference`, `experience_level` (text)
   - `other_accounts` (text[]), `other_accounts_value` (numeric), `current_asset_mix` (text), `has_concentrated_positions` (boolean), `other_options_experience` (text)
   - `ethical_exclusions` (text[]), `international_preference` (text), `volatility_preference` (text), `crypto_stance` (text)

2. **New step components** (in `src/components/elite-assessment/steps/`):
   - `StepGoals.tsx` — goals & time horizon
   - `StepExistingPortfolios.tsx` — other accounts & current holdings
   - `StepPreferences.tsx` — ethical/ESG/crypto/international

3. **Updated files**:
   - `EliteOnboardingPage.tsx` — expand `EliteFormData` interface, update STEPS array to 6 steps, update `canAdvance()` logic, add new fields to upsert
   - `StepRiskProfile.tsx` — add behavioral scenario questions (loss reaction, regret preference, experience level)
   - `StepExecution.tsx` — add a summary/review section at the bottom showing key selections before submit

4. **Shared Explainer component**: Extract to a shared file since it's duplicated in every step.

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/components/elite-assessment/steps/StepGoals.tsx` |
| Create | `src/components/elite-assessment/steps/StepExistingPortfolios.tsx` |
| Create | `src/components/elite-assessment/steps/StepPreferences.tsx` |
| Create | `src/components/elite-assessment/shared/Explainer.tsx` |
| Modify | `src/components/elite-assessment/EliteOnboardingPage.tsx` |
| Modify | `src/components/elite-assessment/steps/StepRiskProfile.tsx` |
| Modify | `src/components/elite-assessment/steps/StepExecution.tsx` |
| Modify | `src/components/elite-assessment/steps/StepFinancials.tsx` |
| Migration | Add new columns to `elite_client_profiles` |

