-- Create activities table for event tracking
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.activities IS 'Tracks user activities across the application';

-- Create indexes for performance
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_organization_id ON public.activities(organization_id);
CREATE INDEX idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_activities_type ON public.activities(activity_type);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activities"
ON public.activities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view org activities"
ON public.activities
FOR SELECT
USING (
  organization_id IS NOT NULL 
  AND is_org_member(organization_id)
);

CREATE POLICY "Users can insert their own activities"
ON public.activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger function for company activities
CREATE OR REPLACE FUNCTION public.log_company_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (
      user_id,
      organization_id,
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.organization_id,
      'company_created',
      'company',
      NEW.id,
      NEW.name,
      'Created company ' || NEW.name,
      jsonb_build_object(
        'company_type', NEW.company_type,
        'industry', NEW.industry,
        'pipeline_stage', NEW.pipeline_stage
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log stage changes
    IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
      INSERT INTO public.activities (
        user_id,
        organization_id,
        activity_type,
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata
      ) VALUES (
        NEW.user_id,
        NEW.organization_id,
        'stage_changed',
        'company',
        NEW.id,
        NEW.name,
        'Moved ' || NEW.name || ' from ' || COALESCE(OLD.pipeline_stage, 'none') || ' to ' || COALESCE(NEW.pipeline_stage, 'none'),
        jsonb_build_object(
          'old_stage', OLD.pipeline_stage,
          'new_stage', NEW.pipeline_stage
        )
      );
    END IF;
    
    -- Log company type changes
    IF OLD.company_type IS DISTINCT FROM NEW.company_type THEN
      INSERT INTO public.activities (
        user_id,
        organization_id,
        activity_type,
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata
      ) VALUES (
        NEW.user_id,
        NEW.organization_id,
        'company_type_changed',
        'company',
        NEW.id,
        NEW.name,
        'Changed ' || NEW.name || ' type from ' || COALESCE(OLD.company_type::text, 'none') || ' to ' || COALESCE(NEW.company_type::text, 'none'),
        jsonb_build_object(
          'old_type', OLD.company_type,
          'new_type', NEW.company_type
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for task activities
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (
      user_id,
      organization_id,
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.organization_id,
      'task_created',
      'task',
      NEW.id,
      NEW.title,
      'Created task: ' || NEW.title,
      jsonb_build_object(
        'priority', NEW.priority,
        'status', NEW.status,
        'due_date', NEW.due_date,
        'company_id', NEW.company_id
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log task completion
    IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status = 'done' OR NEW.status = 'completed') THEN
      INSERT INTO public.activities (
        user_id,
        organization_id,
        activity_type,
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata
      ) VALUES (
        NEW.user_id,
        NEW.organization_id,
        'task_completed',
        'task',
        NEW.id,
        NEW.title,
        'Completed task: ' || NEW.title,
        jsonb_build_object(
          'completed_at', NEW.completed_at,
          'company_id', NEW.company_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for contact activities
CREATE OR REPLACE FUNCTION public.log_contact_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (
      user_id,
      organization_id,
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.organization_id,
      'contact_created',
      'contact',
      NEW.id,
      NEW.first_name || ' ' || NEW.last_name,
      'Added contact: ' || NEW.first_name || ' ' || NEW.last_name,
      jsonb_build_object(
        'email', NEW.email,
        'category', NEW.category,
        'company_id', NEW.company_id,
        'title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for document activities
CREATE OR REPLACE FUNCTION public.log_document_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (
      user_id,
      organization_id,
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.organization_id,
      'document_uploaded',
      'document',
      NEW.id,
      NEW.name,
      'Uploaded document: ' || NEW.name,
      jsonb_build_object(
        'file_type', NEW.file_type,
        'file_size', NEW.file_size,
        'folder', NEW.folder,
        'company_id', NEW.company_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_log_company_activity
  AFTER INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.log_company_activity();

CREATE TRIGGER trigger_log_task_activity
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_activity();

CREATE TRIGGER trigger_log_contact_activity
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contact_activity();

CREATE TRIGGER trigger_log_document_activity
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_document_activity();