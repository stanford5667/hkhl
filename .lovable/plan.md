

# Bulk Video Upload for Academy Admin

## What We're Building

A "Bulk Upload Videos" button on each module that opens a dialog where admins can drag-and-drop multiple video files. Videos upload sequentially to the `course-videos` bucket, each showing individual progress. On completion, lessons are auto-created from filenames (e.g., `01-Introduction.mp4` becomes lesson "Introduction" at order index 1).

## New File

**`src/components/admin/BulkVideoUpload.tsx`** -- A self-contained dialog component:

- Props: `moduleId`, `existingLessonCount`, `onComplete` callback
- Multi-file drag-and-drop zone accepting `video/*` (max 5GB each)
- File queue state: `Array<{ file, name, status, progress, parsedTitle, parsedOrder }>`
- Filename parser: strips extension, splits on `-` or `_`, detects leading number for `order_index`, title-cases the rest
- Preview table showing each file with parsed title, order, size, and editable title field
- "Upload & Create Lessons" button that processes files sequentially:
  1. Upload each file to `course-videos/lessons/{timestamp}-{sanitized_name}`
  2. Simulate progress per file (same pattern as existing single upload)
  3. On success, insert into `course_lessons` with `module_id`, parsed title, `video_url`, `video_provider: 'custom'`, and `order_index` (based on parsed number + existing lesson count offset)
- Status indicators per file: pending / uploading / done / error
- Summary toast on completion ("5 of 6 videos uploaded successfully")

## Modified File

**`src/components/admin/AdminCoursesTab.tsx`**:

- Import `BulkVideoUpload` component
- Add a "Bulk Upload" button next to the existing "Add Lesson" button in each module's action bar (around line 939-946)
- Pass `moduleId`, existing lesson count, and a refresh callback (`fetchLessons`)

## No Database Changes

Uses existing `course_lessons` table and `course-videos` storage bucket. Lessons are inserted with `video_provider: 'custom'` (matching the existing DB constraint).

## Filename Parsing Logic

```text
"01-Introduction.mp4"       → order: 1,  title: "Introduction"
"02_Market_Analysis.mp4"    → order: 2,  title: "Market Analysis"
"Getting Started.mp4"       → order: 0,  title: "Getting Started"
"03 - Risk Management.webm" → order: 3,  title: "Risk Management"
```

