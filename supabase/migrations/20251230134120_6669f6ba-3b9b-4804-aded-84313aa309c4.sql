-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('partner', 'principal', 'vp', 'associate', 'analyst')),
  title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create company_team_assignments table
CREATE TABLE public.company_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('lead', 'associate', 'analyst', 'reviewer')),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  UNIQUE(company_id, team_member_id)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  assignee_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_members (everyone authenticated can view, only admins modify)
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create team members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update team members"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete team members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (true);

-- RLS policies for company_team_assignments
CREATE POLICY "Users can view their company team assignments"
  ON public.company_team_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create company team assignments"
  ON public.company_team_assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their company team assignments"
  ON public.company_team_assignments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their company team assignments"
  ON public.company_team_assignments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for tasks
CREATE POLICY "Users can view their tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for tasks
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();