CREATE OR REPLACE FUNCTION private.is_active_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.active = true
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "students readable" ON public.students;
CREATE POLICY "students readable by active staff or admin"
ON public.students FOR SELECT TO authenticated
USING (private.is_active_staff(auth.uid()) OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "allocations admin insert" ON public.allocations;
CREATE POLICY "allocations admin insert"
ON public.allocations FOR INSERT TO authenticated
WITH CHECK (private.is_admin(auth.uid()));