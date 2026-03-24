
UPDATE public.profiles SET membership_tier = 'pro' WHERE user_id = '1f3b8989-f19d-4f80-8f04-4195499d04be';

DELETE FROM public.subscriptions WHERE user_id = '1f3b8989-f19d-4f80-8f04-4195499d04be';

INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
VALUES ('1f3b8989-f19d-4f80-8f04-4195499d04be', 'research_education', 'active', now(), '2099-12-31'::timestamptz);
