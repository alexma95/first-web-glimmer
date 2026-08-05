-- 1. Drop every existing permissive policy on the app tables
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'campaigns_new','products_new','product_text_options',
        'enrollments','assignments','payment_info','payment_records','files'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2. Keep RLS on (deny-by-default: no policies = no access for anon/authenticated)
ALTER TABLE public.campaigns_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_text_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 3. Remove Data API privileges from public roles; server functions use service_role
REVOKE ALL ON public.campaigns_new FROM anon, authenticated;
REVOKE ALL ON public.products_new FROM anon, authenticated;
REVOKE ALL ON public.product_text_options FROM anon, authenticated;
REVOKE ALL ON public.enrollments FROM anon, authenticated;
REVOKE ALL ON public.assignments FROM anon, authenticated;
REVOKE ALL ON public.payment_info FROM anon, authenticated;
REVOKE ALL ON public.payment_records FROM anon, authenticated;
REVOKE ALL ON public.files FROM anon, authenticated;

GRANT ALL ON public.campaigns_new TO service_role;
GRANT ALL ON public.products_new TO service_role;
GRANT ALL ON public.product_text_options TO service_role;
GRANT ALL ON public.enrollments TO service_role;
GRANT ALL ON public.assignments TO service_role;
GRANT ALL ON public.payment_info TO service_role;
GRANT ALL ON public.payment_records TO service_role;
GRANT ALL ON public.files TO service_role;

-- 4. Internal helper routines must not be callable by anonymous clients
REVOKE ALL ON FUNCTION public.claim_text_option(uuid, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.clone_campaign(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.clone_campaign(uuid, boolean) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.clone_campaign(uuid, boolean, boolean) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.find_duplicate_text_options() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.claim_text_option(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clone_campaign(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.clone_campaign(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.clone_campaign(uuid, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_duplicate_text_options() TO service_role;