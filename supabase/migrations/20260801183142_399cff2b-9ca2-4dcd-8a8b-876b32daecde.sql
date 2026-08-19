-- profiles: restrict full row to self or admin, expose safe directory view
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by self or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE OR REPLACE VIEW public.staff_directory
WITH (security_invoker = false) AS
  SELECT id, full_name, department, designation, staff_type, is_senior, max_duties, active
  FROM public.profiles;
GRANT SELECT ON public.staff_directory TO authenticated;
GRANT ALL ON public.staff_directory TO service_role;

-- allocations: own duties or admin
DROP POLICY IF EXISTS "allocations readable" ON public.allocations;
CREATE POLICY "allocations readable by owner or admin" ON public.allocations
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR public.is_admin(auth.uid()));

-- emergency_requests: involved parties or admin
DROP POLICY IF EXISTS "emergency readable" ON public.emergency_requests;
CREATE POLICY "emergency readable by involved or admin" ON public.emergency_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requested_by
    OR auth.uid() = original_teacher_id
    OR auth.uid() = replacement_teacher_id
    OR public.is_admin(auth.uid())
  );

-- user_roles: own roles or admin
DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "roles readable by self or admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- staff_requests: hide admin review_notes from non-admins via column privileges
REVOKE SELECT ON public.staff_requests FROM authenticated;
GRANT SELECT (id, full_name, email, department, designation, staff_type, is_senior,
              max_duties, reason, status, requested_by, reviewed_by, reviewed_at,
              admin_read_at, created_at, updated_at)
  ON public.staff_requests TO authenticated;
GRANT ALL ON public.staff_requests TO service_role;

-- SECURITY DEFINER trigger helpers must not be directly callable
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;