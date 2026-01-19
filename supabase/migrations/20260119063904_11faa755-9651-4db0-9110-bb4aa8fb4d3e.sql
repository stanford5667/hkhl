-- Education Platform Schema
-- Migration: Add education/academy features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  instructor_id UUID REFERENCES auth.users(id),
  category TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  price DECIMAL(10,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  duration_hours INTEGER,
  student_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course modules (sections)
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course lessons
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_provider TEXT CHECK (video_provider IN ('youtube', 'vimeo', 'mux', 'custom')),
  video_duration INTEGER,
  content TEXT,
  order_index INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress DECIMAL(5,2) DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  certificate_issued BOOLEAN DEFAULT false,
  UNIQUE(user_id, course_id)
);

-- Lesson progress tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  last_position INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL,
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER,
  max_attempts INTEGER DEFAULT 3,
  show_correct_answers BOOLEAN DEFAULT true,
  randomize_questions BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score DECIMAL(5,2),
  max_score INTEGER,
  passed BOOLEAN,
  answers JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_taken INTEGER
);

-- Study materials
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[],
  download_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course reviews/ratings
CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_course ON study_materials(course_id);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Courses: Anyone can view published courses, only instructors can edit their own
CREATE POLICY "Published courses are viewable by everyone"
  ON courses FOR SELECT
  USING (is_published = true OR instructor_id = auth.uid());

CREATE POLICY "Instructors can insert their own courses"
  ON courses FOR INSERT
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can update their own courses"
  ON courses FOR UPDATE
  USING (instructor_id = auth.uid());

-- Course Modules: Viewable if course is viewable
CREATE POLICY "Modules viewable with course"
  ON course_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM courses WHERE courses.id = course_modules.course_id 
    AND (courses.is_published = true OR courses.instructor_id = auth.uid())
  ));

-- Course Lessons: Viewable if course is viewable
CREATE POLICY "Lessons viewable with course"
  ON course_lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_lessons.module_id
    AND (c.is_published = true OR c.instructor_id = auth.uid())
  ));

-- Quizzes: Viewable if course is viewable
CREATE POLICY "Quizzes viewable with course"
  ON quizzes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM courses WHERE courses.id = quizzes.course_id 
    AND (courses.is_published = true OR courses.instructor_id = auth.uid())
  ));

-- Quiz Questions: Viewable if quiz is viewable
CREATE POLICY "Questions viewable with quiz"
  ON quiz_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quizzes q
    JOIN courses c ON c.id = q.course_id
    WHERE q.id = quiz_questions.quiz_id
    AND (c.is_published = true OR c.instructor_id = auth.uid())
  ));

-- Study Materials: Viewable if course is viewable or no course attached
CREATE POLICY "Materials viewable"
  ON study_materials FOR SELECT
  USING (
    course_id IS NULL OR EXISTS (
      SELECT 1 FROM courses WHERE courses.id = study_materials.course_id 
      AND (courses.is_published = true OR courses.instructor_id = auth.uid())
    )
  );

-- Course Enrollments: Users can view and manage their own enrollments
CREATE POLICY "Users can view their own enrollments"
  ON course_enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves"
  ON course_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollments"
  ON course_enrollments FOR UPDATE
  USING (user_id = auth.uid());

-- Lesson Progress: Users can manage their own progress
CREATE POLICY "Users can view their own progress"
  ON lesson_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own progress"
  ON lesson_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON lesson_progress FOR UPDATE
  USING (user_id = auth.uid());

-- Quiz Attempts: Users can view and create their own attempts
CREATE POLICY "Users can view their own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Course Reviews: Anyone can view, users manage their own
CREATE POLICY "Anyone can view reviews"
  ON course_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON course_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON course_reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Functions for updating course ratings
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM course_reviews
      WHERE course_id = NEW.course_id
    )
  WHERE id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_course_rating_trigger ON course_reviews;
CREATE TRIGGER update_course_rating_trigger
AFTER INSERT OR UPDATE ON course_reviews
FOR EACH ROW
EXECUTE FUNCTION update_course_rating();

-- Function to update course progress
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  progress_percentage DECIMAL(5,2);
  v_course_id UUID;
BEGIN
  -- Get the course_id for this lesson
  SELECT cm.course_id INTO v_course_id
  FROM course_lessons cl
  INNER JOIN course_modules cm ON cl.module_id = cm.id
  WHERE cl.id = NEW.lesson_id;
  
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get total lessons for the course
  SELECT COUNT(DISTINCT cl.id) INTO total_lessons
  FROM course_lessons cl
  INNER JOIN course_modules cm ON cl.module_id = cm.id
  WHERE cm.course_id = v_course_id;
  
  -- Get completed lessons for user
  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress lp
  INNER JOIN course_lessons cl ON lp.lesson_id = cl.id
  INNER JOIN course_modules cm ON cl.module_id = cm.id
  WHERE lp.user_id = NEW.user_id
    AND lp.completed = true
    AND cm.course_id = v_course_id;
  
  -- Calculate progress
  IF total_lessons > 0 THEN
    progress_percentage := (completed_lessons::DECIMAL / total_lessons * 100);
  ELSE
    progress_percentage := 0;
  END IF;
  
  -- Update enrollment progress
  UPDATE course_enrollments
  SET 
    progress = progress_percentage,
    completed_at = CASE 
      WHEN progress_percentage >= 100 THEN NOW()
      ELSE NULL
    END
  WHERE user_id = NEW.user_id
    AND course_id = v_course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_course_progress_trigger ON lesson_progress;
CREATE TRIGGER update_course_progress_trigger
AFTER INSERT OR UPDATE ON lesson_progress
FOR EACH ROW
EXECUTE FUNCTION update_course_progress();