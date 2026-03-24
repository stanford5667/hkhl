

## Add SMS Opt-In Consent to Notification Settings

**Goal**: Add a visible opt-in consent disclaimer near the SMS toggle in the `RoomNotificationSettings` popover to satisfy Twilio's toll-free verification requirements.

---

### Changes

**File: `src/components/community/chat/RoomNotificationSettings.tsx`**

Add a small consent notice that appears when SMS is being enabled (alongside the phone number input) and a persistent consent line when SMS is active:

1. When `showPhoneInput` is true (user is entering their phone), show a consent checkbox or text below the input:
   - "By enabling SMS, you agree to receive text message alerts for admin posts in this room. Msg & data rates may apply. Reply STOP to unsubscribe."

2. When SMS is already active (`sms && phone && !showPhoneInput`), show a compact note:
   - "SMS alerts active. Reply STOP to opt out."

3. Add a small "Terms" link text pointing to the site's terms/privacy page if one exists.

4. Require the user to check a consent checkbox before the "Save" button becomes enabled when entering their phone number -- this provides the explicit web form opt-in that Twilio requires.

---

### Technical Details

- Add a `consentChecked` boolean state, defaulting to `false`
- Disable the Save button unless `consentChecked && phone.trim() && !savingPhone`
- Render a checkbox + label with the consent language below the phone input
- Show abbreviated opt-out info when SMS is already enabled
- No database or backend changes needed -- this is purely a UI compliance addition

