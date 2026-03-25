

## Add Admin-Only Livestream to Chat Rooms

**What it does**: Admins can start a livestream in any chat room. When live, a video player appears at the top of the chat room showing the admin's camera/screen. Users watch the stream while chatting alongside it. Only admins can go live; all room members can watch.

---

### Architecture

The livestream will be embedded directly in the browser using WebRTC via the `MediaStream` API. No external service is needed for small-scale use -- the admin's video/screen is captured and broadcast. However, true peer-to-peer WebRTC requires a signaling server and doesn't scale well beyond a handful of viewers.

**Recommended approach**: Use an **embedded stream URL** model where the admin pastes a YouTube Live / Twitch / custom RTMP URL, and the room displays an embedded video player. This is far more reliable and scalable than building WebRTC infrastructure.

The livestream state (active/inactive, stream URL, who started it) will be stored on the `chat_rooms` table so all users see it in real-time.

---

### Implementation Steps

**1. Database migration** -- Add livestream columns to `chat_rooms`:
- `is_live` (boolean, default false)
- `live_stream_url` (text, nullable) -- YouTube/Twitch embed URL
- `live_started_by` (uuid, nullable, references auth.users)
- `live_started_at` (timestamptz, nullable)

**2. Update types** -- Add the new fields to `ChatRoom` interface in `src/types/community.ts`.

**3. Create `LivestreamPlayer` component** (`src/components/community/chat/LivestreamPlayer.tsx`):
- Renders an iframe embed (YouTube/Twitch) or HTML5 video player
- Shows "LIVE" badge, viewer count, and admin name
- Admin sees a "Stop Stream" button; users see the player only

**4. Create `StartLivestreamDialog` component** (`src/components/community/chat/StartLivestreamDialog.tsx`):
- Admin-only dialog triggered from the room header
- Input field for stream URL (YouTube Live, Twitch, or direct video URL)
- "Go Live" button that updates the `chat_rooms` row

**5. Update `RoomHeader.tsx`**:
- Add a "Go Live" button (admin-only) that opens the dialog
- Show a "LIVE" indicator when the room has an active stream

**6. Update `ChatRoomView.tsx`**:
- When `room.is_live` is true, render `LivestreamPlayer` above the message list
- Use Supabase Realtime to detect when the livestream state changes (already have realtime on chat_rooms or can subscribe to changes)

**7. Update `useChatRooms` hook**:
- Add `startLivestream(roomId, streamUrl)` and `stopLivestream(roomId)` functions

**8. Enable realtime on chat_rooms** so all clients see the live/offline transition instantly.

---

### Technical Details

- Stream URL parsing: auto-detect YouTube (`youtube.com/live/...`) and Twitch (`twitch.tv/...`) URLs and convert to embed format
- RLS: Only admins can update `is_live`, `live_stream_url` columns (existing admin check via `is_admin()`)
- The player will be a resizable panel above the chat messages, collapsible by users
- Premium gating: inherits the room's existing premium gate -- no separate gate needed

