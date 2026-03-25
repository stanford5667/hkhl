
## Stripe Affiliate Code Invalid — Root Cause + Fix Plan

### What I found
1. **Affiliate codes exist in your database but are not created in Stripe**  
   - `STANFORD` is `approved` but both `stripe_coupon_id` and `stripe_promo_code_id` are `null`.
   - Same for all recent affiliates.

2. **Checkout requests are often sent without `affiliate_code`**  
   - Recent `create-checkout` log shows: `"hasAffiliate": false`.
   - Several checkout entry points do not pass affiliate code at all (`PremiumFeatureBlock`, `PremiumBadge`, `UpgradeModal`, `BillingIntervalSheet`, `Auth` redirect flow).

3. **Admin approval flow does not provision Stripe promo codes**  
   - `AdminAffiliatesTab.updateStatus()` sets status to approved but never invokes promo creation.

4. **Promo creation errors are currently easy to miss**  
   - In affiliate signup flow, `create-affiliate-promo` errors are swallowed in `console.error` only.

---

## Implementation Plan

1. **Backfill existing approved affiliates**
   - Add a secure backend utility endpoint to create missing Stripe coupon/promo IDs for all approved affiliates with null Stripe IDs.
   - Run once from admin UI (or protected admin action) to repair existing codes like `STANFORD`.

2. **Auto-provision promo codes on approval**
   - Update admin affiliate approval flow to call `create-affiliate-promo` immediately after status becomes `approved`.
   - Keep this idempotent (safe to call repeatedly).

3. **Pass affiliate code in every checkout path**
   - Standardize checkout calls behind one helper/hook that always includes `affiliate_code` from `getAffiliateRef()` when available.
   - Replace direct `create-checkout` invocations in all premium/upgrade/auth entry points.

4. **Improve failure visibility**
   - Show admin/user-facing toast when promo provisioning fails (instead of silent console-only failure).
   - Add structured logs for: code lookup, promo create/reuse, and fallback behavior.

5. **Harden referral normalization**
   - Normalize referral code to uppercase at capture/read boundaries so URL casing cannot break attribution consistency.

---

## Technical Details (files to update)

- `src/components/admin/AdminAffiliatesTab.tsx`  
  Add promo provisioning call on approve.
- `src/pages/Affiliate.tsx`  
  Keep apply flow idempotent; surface promo creation errors.
- `src/components/premium/PremiumFeatureBlock.tsx`  
- `src/components/ui/PremiumBadge.tsx`  
- `src/components/premium/UpgradeModal.tsx`  
- `src/components/academy/BillingIntervalSheet.tsx`  
- `src/pages/Auth.tsx`  
  Route all checkout calls through shared helper with affiliate pass-through.
- `src/hooks/useAffiliateTracking.tsx`  
  Normalize stored/referral code casing consistently.
- `supabase/functions/create-affiliate-promo/index.ts`  
  Keep idempotent and return explicit status.
- `supabase/functions/create-checkout/index.ts`  
  Keep existing auto-create fallback; add clearer logs/errors for missing/invalid affiliate context.

---

## Verification Checklist
1. Approve a new affiliate in admin → Stripe promo IDs are stored.
2. Existing affiliate (`STANFORD`) is backfilled → code becomes valid at Stripe checkout.
3. Checkout from every entry point sends `affiliate_code` when referral exists.
4. Manual promo entry and auto-applied referral discount both work end-to-end.
