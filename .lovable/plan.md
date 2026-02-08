
# Social Trading Platform Implementation Plan

## Overview
This plan outlines the implementation of a Discord-like chatroom and Reddit-style research posts system that integrates with your existing stock research infrastructure. The platform will leverage Supabase Realtime for live messaging and your existing authentication system.

---

## Phase 1: Database Schema Design

### New Tables Required

**1. `chat_rooms`** - Discord-like room definitions
- `id` (uuid, primary key)
- `name` (text) - e.g., "Day Trading", "AAPL Discussion"
- `slug` (text, unique) - URL-friendly identifier
- `description` (text)
- `room_type` (enum: 'public', 'stock', 'private')
- `ticker` (text, nullable) - For stock-specific rooms
- `icon` (text) - Emoji or icon identifier
- `member_count` (integer, default 0)
- `created_by` (uuid, references auth.users)
- `created_at`, `updated_at`

**2. `chat_messages`** - Real-time messages
- `id` (uuid, primary key)
- `room_id` (uuid, references chat_rooms)
- `user_id` (uuid, references auth.users)
- `content` (text)
- `mentioned_users` (uuid[]) - For @mentions
- `detected_tickers` (text[]) - Auto-extracted $AAPL, #TSLA
- `reply_to` (uuid, nullable) - Thread support
- `attachment_url` (text, nullable)
- `attachment_type` (text, nullable)
- `is_edited` (boolean, default false)
- `created_at`, `updated_at`

**3. `message_reactions`** - Emoji reactions
- `id` (uuid, primary key)
- `message_id` (uuid, references chat_messages)
- `user_id` (uuid, references auth.users)
- `emoji` (text)
- `created_at`
- Unique constraint on (message_id, user_id, emoji)

**4. `research_posts`** - Reddit-style posts
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text)
- `content` (text) - Markdown supported
- `detected_tickers` (text[])
- `upvotes` (integer, default 0)
- `downvotes` (integer, default 0)
- `comment_count` (integer, default 0)
- `is_pinned` (boolean, default false)
- `created_at`, `updated_at`

**5. `post_votes`** - Track user votes
- `id` (uuid, primary key)
- `post_id` (uuid, references research_posts)
- `user_id` (uuid, references auth.users)
- `vote_type` (integer: 1 for upvote, -1 for downvote)
- `created_at`
- Unique constraint on (post_id, user_id)

**6. `post_comments`** - Comment threads
- `id` (uuid, primary key)
- `post_id` (uuid, references research_posts)
- `user_id` (uuid, references auth.users)
- `parent_id` (uuid, nullable) - For nested replies
- `content` (text)
- `detected_tickers` (text[])
- `upvotes` (integer, default 0)
- `created_at`, `updated_at`

**7. `room_members`** - Track room membership (for private rooms)
- `id` (uuid, primary key)
- `room_id` (uuid, references chat_rooms)
- `user_id` (uuid, references auth.users)
- `joined_at` (timestamp)
- `role` (text: 'member', 'moderator')

### RLS Policies
- Public rooms: Anyone can read, authenticated users can write
- Private rooms: Only members can read/write
- Posts/comments: Authenticated users can create, anyone can read
- Votes: One vote per user per post (enforced via unique constraint)

### Realtime Configuration
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE research_posts;
```

---

## Phase 2: Core Components Architecture

### Directory Structure
```text
src/components/community/
├── chat/
│   ├── ChatRoomList.tsx       - Room sidebar navigation
│   ├── ChatRoom.tsx           - Main chat view
│   ├── MessageList.tsx        - Virtualized message list
│   ├── MessageItem.tsx        - Individual message with reactions
│   ├── MessageInput.tsx       - Rich text input with mentions
│   ├── ReactionPicker.tsx     - Emoji reaction selector
│   └── RoomHeader.tsx         - Room info + stock link
├── posts/
│   ├── PostFeed.tsx           - Reddit-style feed
│   ├── PostCard.tsx           - Post preview with voting
│   ├── PostDetail.tsx         - Full post view
│   ├── PostEditor.tsx         - Create/edit post
│   ├── CommentThread.tsx      - Nested comments
│   └── VoteButtons.tsx        - Upvote/downvote controls
├── shared/
│   ├── TickerMention.tsx      - Auto-linked ticker badge
│   ├── UserMention.tsx        - @mention rendering
│   ├── StockSidebar.tsx       - Mini chart + quote
│   └── MemberList.tsx         - Online users
└── hooks/
    ├── useChatRoom.ts         - Room subscription
    ├── useRealtimeMessages.ts - Message streaming
    └── usePostVoting.ts       - Vote management
```

---

## Phase 3: Chat System Implementation

### 3.1 Realtime Message Service
Create a service similar to `portfolioRealtimeService.ts`:

```text
src/services/chatRealtimeService.ts
- Subscribe to room-specific channels
- Handle message INSERT/UPDATE/DELETE events
- Manage typing indicators via Presence API
- Broadcast new reactions in real-time
```

### 3.2 Ticker Auto-Detection
Utility function to parse messages:

```text
src/utils/tickerParser.ts
- Regex patterns: /\$([A-Z]{1,5})/g for $AAPL format
- Regex patterns: /#([A-Z]{1,5})/g for #AAPL format
- Validate against asset_universe table
- Return array of detected tickers
```

### 3.3 Virtual Scrolling for Chat
Leverage existing `react-window` pattern from `VirtualizedResultsTable.tsx`:
- Reverse scroll (newest at bottom)
- Infinite scroll for history
- Estimated 50-100 messages visible
- Lazy load older messages on scroll up

### 3.4 Message Input Features
- @mention autocomplete (query profiles table)
- $ticker autocomplete (query asset_universe)
- Emoji picker integration
- File upload to Supabase storage (pattern from `UploadZone.tsx`)

---

## Phase 4: Research Posts Implementation

### 4.1 Post Feed
- Sort options: Hot (score-decay), New, Top (day/week/month)
- Filter by ticker tags
- Infinite scroll pagination
- Skeleton loading states

### 4.2 Voting System
- Optimistic UI updates
- Database trigger to update post vote counts
- Rate limiting (max votes per minute)

### 4.3 Comment Threading
- Nested replies (max 3 levels deep for mobile)
- Collapse/expand threads
- Sort by best/newest

---

## Phase 5: Stock Integration

### 5.1 Auto-Linking Tickers
Enhance `TickerBadge.tsx` for inline rendering:
- Hover preview with mini chart
- Click navigates to `/stock/{ticker}`

### 5.2 Stock Sidebar Widget
For chat rooms with `room_type === 'stock'`:
- Mini sparkline chart
- Current price + change
- Quick link to full research page
- Uses existing `getCachedFullQuote` service

### 5.3 Stock-Specific Rooms
Auto-create rooms when users visit popular tickers:
- Check if room exists for ticker
- If not, create on-demand
- Link from stock detail page tab

---

## Phase 6: Mobile Optimization

### 6.1 Responsive Layout
- Collapsible room sidebar (drawer on mobile)
- Touch-friendly message actions (long-press for reactions)
- Swipe gestures for room navigation
- Bottom-anchored message input

### 6.2 Performance Optimizations
- Virtual scrolling for messages (react-window)
- Debounced typing indicators
- Lazy load user avatars
- Message batching (group rapid messages)

---

## Phase 7: New Pages & Routes

### Routes to Add
```text
/community              - Main hub (room list + feed)
/community/chat/:roomId - Specific chat room
/community/posts        - Research post feed
/community/posts/:id    - Single post detail
/community/new-post     - Create post form
```

### Navigation Integration
Add "Community" link to main sidebar/header navigation.

---

## Technical Details

### Database Functions
```sql
-- Auto-increment member count on room join
CREATE FUNCTION update_room_member_count()

-- Update post vote totals on vote change
CREATE FUNCTION update_post_vote_counts()

-- Update comment count on new comment
CREATE FUNCTION update_post_comment_count()
```

### Storage Bucket
Create `chat-attachments` bucket for file uploads in messages.

### Estimated New Files
- 15-20 new React components
- 3-5 custom hooks
- 2-3 service files
- 1 utility file (ticker parser)
- 1 types file for community features

---

## Implementation Order

1. **Database Setup** - Create tables, RLS policies, enable realtime
2. **Basic Chat UI** - Room list, message display, input
3. **Realtime Integration** - Live message streaming
4. **Post System** - CRUD for posts, voting
5. **Comments** - Threaded replies
6. **Stock Integration** - Ticker detection, sidebar, auto-linking
7. **File Uploads** - Attachments in chat
8. **Polish** - Reactions, mentions, mobile optimization

---

## Dependencies
All required packages are already installed:
- `react-window` for virtualization
- `@supabase/supabase-js` for realtime
- Existing UI components (Card, Button, Avatar, etc.)
- `framer-motion` for animations (already available)
