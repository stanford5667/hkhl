

## Create a Public SMS Opt-In Consent Page

**Problem**: Twilio requires a publicly accessible URL showing proof of SMS opt-in consent. Your platform is behind authentication, so Twilio reviewers can't see the consent flow. They also don't accept screenshots.

**Solution**: Create a simple, public (no auth required) page at `/sms-consent` that displays your opt-in flow and consent language. You submit this URL (`https://assetlabs.ai/sms-consent`) to Twilio's verification form.

---

### What the page will show

A clean, informational page that demonstrates:
- What the SMS service is (admin chat alerts)
- The exact consent language users see before opting in
- How users opt in (checkbox + save flow)
- How to opt out (reply STOP)
- Message frequency and "Msg & data rates may apply"
- A mock/visual representation of the opt-in UI (the checkbox + disclaimer)

This is a static informational page -- no login required, no interactive functionality.

---

### Technical Details

1. **New file**: `src/pages/SmsConsent.tsx` -- public page with consent disclosure
2. **Route**: Add `/sms-consent` to the router as an unprotected route
3. **Content**: Standard compliance language covering opt-in mechanism, message frequency, opt-out instructions, and data rates disclaimer

