

# Premium Chat Rooms Implementation Plan

## Overview
Enable chat admins to mark certain chat rooms as "premium" while giving non-premium users a teaser experience—they can see blurred/partial content but need to upgrade for full access.

---

## Design: The "Peek Behind the Curtain" Experience

### What Users Will See

```text
┌─────────────────────────────────────┐
│  ✨ Trade Ideas Pro       [Settings]│
├─────────────────────────────────────┤
│                                     │
│   ░░░░░ Blurred older message ░░░░░ │
│   ░░░░░ Blurred older message ░░░░░ │
│                                     │
│  ┌─────────────────────────────────┐│
│  │      🔒 Premium Room            ││
│  │                                 ││
│  │  45 traders discussing now     ││
│  │                                 ││
│  │  [Unlock Full Access]          ││
│  └─────────────────────────────────┘│
│                                     │
│   Visible teaser message #1         │
│   Visible teaser message #2         │
│   Visible teaser message #3         │
│                                     │
├─────────────────────────────────────┤
│  🔒 Upgrade to join the chat...     │
└─────────────────────────────────────┘
```

**Free Users in Premium Rooms:**
- Room appears in the list with a ✨ crown badge
- Can enter and see the last 3-5 messages (partially blurred)
- A frosted glass overlay covers older messages with social proof
- Can't type messages (input shows upgrade prompt with lock icon)

**Pro Users:** Full access, same experience as public rooms

**Admins:** Settings gear in room header to toggle premium status

---

## Phase 1: Database Schema

### Add `is_premium` Column

```sql
ALTER TABLE chat_rooms ADD COLUMN is_premium boolean DEFAULT false;
```

This simple boolean flag on the existing `chat_rooms` table is all that's needed.

---

## Phase 2: Update Types & Hooks

### 2.1 Update `src/types/community.ts`

Add `is_premium` field to the `ChatRoom` interface.

### 2.2 Update `src/hooks/useChatRooms.ts`

Add new function `setRoomPremium(roomId, isPremium)` for admins to toggle premium status via a simple update query.

---

## Phase 3: New Components

### 3.1 Create `PremiumRoomGate.tsx`

A reusable overlay component that displays:
- Frosted glass background (`bg-background/80 backdrop-blur-sm`)
- Crown icon with gradient styling (matching existing `DynamicScreener.tsx` pattern)
- Social proof: "X traders discussing now" using `room.member_count`
- "Unlock Full Access" button that calls `showUpgradeModal('premiumChat')`
- Fade gradient at the top of visible content

### 3.2 Create `RoomSettings.tsx`

A dropdown or popover for admins (using `useAdmin` hook) with:
- Toggle switch: "Make this room Premium"
- Only visible when `isAdmin === true`
- Calls `setRoomPremium()` on toggle

---

## Phase 4: Update Existing Components

### 4.1 `ChatRoomList.tsx`

- Add Crown icon (from lucide-react) next to premium room names
- Add subtle gold/amber accent styling to premium room items
- Show "PRO" badge similar to existing `Badge` component usage

### 4.2 `ChatRoomView.tsx`

Core gating logic:
```typescript
const { isPro, showUpgradeModal } = useUsage();
const { isAdmin } = useAdmin();

// Full access if: not premium, OR user is pro, OR user is admin
const canAccess = !room.is_premium || isPro || isAdmin;

// Teaser: show last 5 messages when gated
const displayMessages = canAccess 
  ? messages 
  : messages.slice(-5);
```

- Wrap `MessageList` with conditional `PremiumRoomGate`
- Pass `blurred` prop and limited messages when gated
- Add settings button in header for admins

### 4.3 `MessageList.tsx`

- Add optional `blurred` prop
- When `blurred=true`: apply `blur-sm` class to all messages except the newest 3
- Add gradient fade overlay at top of blurred section

### 4.4 `MessageInput.tsx`

- Add `lockedMessage` prop for premium room gating
- When locked: show lock icon, disabled state, and "Upgrade to join the conversation" text
- Click triggers `showUpgradeModal('premiumChat')`

### 4.5 `RoomHeader.tsx`

- Show Crown icon next to room name when `room.is_premium`
- Add Settings button (gear icon) for admins that opens `RoomSettings`

---

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/community/chat/PremiumRoomGate.tsx` |
| Create | `src/components/community/chat/RoomSettings.tsx` |
| Modify | `src/types/community.ts` |
| Modify | `src/hooks/useChatRooms.ts` |
| Modify | `src/components/community/chat/ChatRoomList.tsx` |
| Modify | `src/components/community/chat/ChatRoomView.tsx` |
| Modify | `src/components/community/chat/MessageList.tsx` |
| Modify | `src/components/community/chat/MessageInput.tsx` |
| Modify | `src/components/community/chat/RoomHeader.tsx` |
| Database | Add `is_premium` column to `chat_rooms` |

---

## Technical Details

### Existing Patterns Being Followed

1. **Blur Pattern** from `DynamicScreener.tsx` (line 740):
   ```jsx
   <div className="blur-sm pointer-events-none">
     {/* blurred content */}
   </div>
   <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] ...">
     {/* overlay with CTA */}
   </div>
   ```

2. **Premium Badge Styling** from `PremiumBadge.tsx`:
   ```jsx
   className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 
              border-amber-500/30 text-amber-500"
   ```

3. **Usage Context** hook from `UsageContext.tsx`:
   ```typescript
   const { isPro, showUpgradeModal } = useUsage();
   ```

4. **Admin Check** from `useAdmin.ts`:
   ```typescript
   const { isAdmin } = useAdmin();
   ```

### Implementation Order

1. Run database migration (add `is_premium` column)
2. Update types and hooks
3. Create `PremiumRoomGate` component
4. Create `RoomSettings` component
5. Update `ChatRoomView` with gate logic
6. Update `MessageInput` with disabled/locked state
7. Update `MessageList` with blur support
8. Update `ChatRoomList` with premium badges
9. Update `RoomHeader` with premium indicator and settings button

