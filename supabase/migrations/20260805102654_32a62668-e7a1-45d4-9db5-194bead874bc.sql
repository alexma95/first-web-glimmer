REVOKE ALL ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;