-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_type TEXT CHECK (assignee_type IN ('user', 'contact', 'team_member'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_contact ON tasks(assignee_contact_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Enable RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Subtasks policies
CREATE POLICY "Users can view their subtasks" ON subtasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create subtasks" ON subtasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their subtasks" ON subtasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their subtasks" ON subtasks FOR DELETE USING (auth.uid() = user_id);

-- Task comments policies
CREATE POLICY "Users can view their task comments" ON task_comments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create task comments" ON task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their task comments" ON task_comments FOR DELETE USING (auth.uid() = user_id);