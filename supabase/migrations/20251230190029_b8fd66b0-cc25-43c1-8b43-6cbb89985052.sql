-- Add recurring task fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurrence_pattern text,
ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_occurrence_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_name text;

-- Create index for recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON public.tasks(recurrence_pattern) WHERE recurrence_pattern IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_templates ON public.tasks(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;