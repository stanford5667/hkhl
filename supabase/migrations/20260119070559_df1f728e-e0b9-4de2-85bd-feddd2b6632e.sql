-- Update course-videos bucket to allow 5GB uploads
UPDATE storage.buckets 
SET file_size_limit = 5368709120 
WHERE id = 'course-videos';