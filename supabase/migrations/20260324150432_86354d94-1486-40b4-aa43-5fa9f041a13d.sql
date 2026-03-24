
UPDATE public.profiles SET phone = '+14122152095' WHERE user_id = '1f3b8989-f19d-4f80-8f04-4195499d04be' AND phone = '4122152095';

INSERT INTO public.user_roles (user_id, role) VALUES ('1f3b8989-f19d-4f80-8f04-4195499d04be', 'admin') ON CONFLICT (user_id, role) DO NOTHING;
