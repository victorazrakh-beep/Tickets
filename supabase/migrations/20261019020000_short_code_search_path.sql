-- new_short_code() runs inside functions pinned to search_path=public; on Supabase,
-- gen_random_bytes lives in the "extensions" schema, so pin the path here too.
alter function public.new_short_code() set search_path = public, extensions;
