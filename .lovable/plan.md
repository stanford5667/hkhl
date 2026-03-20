

# Implementation Plan: Lifecycle Messaging, Chat Media, Free Trials, and BNPL

## Summary

Five feature additions: (1) automated in-app welcome/churn DMs, (2) churn re-engagement messages, (3) chat media attachments (images, GIFs, files), (4) Stripe free trial support, and (5) Buy Now Pay Later at checkout.

---

## 1. Chat Media Attachments (Images, GIFs, Files)

The database already has `attachment_url` and `attachment_type` columns on `chat_messages`, but no upload UI or rendering exists.

**Work:**
- Create a `chat-attachments` storage bucket (public, with RLS for authenticated uploads)
- Update `MessageInput.tsx`: add an attachment button (paperclip icon) that opens a file picker for images/GIFs/files, plus a GIF search button using the GIPHY API (free tier)
- On file select: upload to `chat-attachments` bucket, get public URL, include `attachment_url` and `attachment_type` in the message insert
- Update `sendMessage` in `useRealtimeMessages.ts` to accept optional `attachment_url` and `attachment_type` params
- Update `MessageItem` in `MessageList.tsx` to render attachments: inline images/GIFs with lightbox, file links with download icon
- Update `sendThreadReply` in `useMessageThreads.ts` similarly
- Support types: `image/*`, `video/gif`, `application/pdf`, common docs up to 10MB

**New secret needed:** `GIPHY_API_KEY` for GIF search (or use GIPHY's public beta key for MVP).

---

## 2. Automated Welcome DMs

When a user joins a chat room (or signs up), auto-send a personalized in-app DM from the admin/system account.

**Work:**
- Create a database trigger on `room_members` INSERT that inserts a welcome message into `chat_messages` from a system user ID
- The message content uses the new member's name: "Welcome to [room], [name]! 👋"
- Create a `system_messages` config table or use a hardcoded system user UUID for the sender
- For signup welcome: add a trigger on `profiles` INSERT that auto-joins the user to the "General" public room and sends a welcome DM

---

## 3. Churn Re-engagement Messages

When a subscription cancels or expires, trigger an automated message.

**Work:**
- Add logic to the `stripe-webhook` edge function: on `customer.subscription.deleted` or `customer.subscription.updated` (status = canceled), look up the user and insert a re-engagement message into a "direct messages" mechanism or send via the existing Loops email integration
- Create a simple `direct_messages` table (or reuse chat_messages with a special DM room per user) for in-app notifications
- Add a notification bell or inbox UI component that shows these system messages

---

## 4. Stripe Free Trial Support

Add a 7-day free trial option to the checkout flow.

**Work:**
- Update `create-checkout` edge function: add `subscription_data.trial_period_days: 7` to the Stripe session when a `trial=true` param is passed
- Update `check-subscription` to recognize `trialing` status as active
- Update pricing UI (`MembershipStep`, `FeatureComparisonPanel`) to show "Start 7-day free trial" CTA
- Update `stripe-webhook` to handle `customer.subscription.trial_will_end` event for reminder emails

---

## 5. Buy Now Pay Later (BNPL)

Enable Klarna/Afterpay in the Stripe checkout.

**Work:**
- Update `create-checkout` edge function: add `payment_method_types: ['card', 'klarna', 'afterpay_clearpay']` to the session config (or use `payment_method_options` with Stripe's automatic payment methods)
- Stripe handles the rest — no frontend changes needed beyond an optional "Pay in installments" badge on the pricing page
- Note: BNPL only works for certain currencies/amounts; Stripe auto-hides unsupported methods

---

## Technical Sequence

1. **Storage bucket migration** — create `chat-attachments` bucket + RLS policies
2. **Chat media UI** — update MessageInput, MessageList, useRealtimeMessages, useMessageThreads
3. **GIF picker** — add GIPHY integration (request API key from user)
4. **Welcome DM triggers** — database triggers on room_members and profiles
5. **Churn messages** — update stripe-webhook + add notification/inbox UI
6. **Free trial** — update create-checkout, check-subscription, pricing UI
7. **BNPL** — update create-checkout with payment method types

---

## Estimated Scope

- 2 database migrations (storage bucket, welcome triggers, DM infrastructure)
- 3 edge function updates (create-checkout, check-subscription, stripe-webhook)
- 4-5 component updates (MessageInput, MessageList, pricing UI, notification inbox)
- 1 new secret (GIPHY API key — optional, can use public beta key)

