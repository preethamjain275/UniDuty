CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP VIEW IF EXISTS public.staff_directory;

-- profiles
DROP POLICY "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR private.is_admin(auth.uid()));
DROP POLICY "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR private.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR private.is_admin(auth.uid()));
DROP POLICY "admins delete profiles" ON public.profiles;
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()));
DROP POLICY "profiles readable by self or admin" ON public.profiles;
CREATE POLICY "profiles readable by self or admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR private.is_admin(auth.uid()));

-- rooms / exams / exam_rooms / settings / students
DROP POLICY "rooms admin write" ON public.rooms;
CREATE POLICY "rooms admin write" ON public.rooms FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "exams admin write" ON public.exams;
CREATE POLICY "exams admin write" ON public.exams FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "exam_rooms admin write" ON public.exam_rooms;
CREATE POLICY "exam_rooms admin write" ON public.exam_rooms FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "settings admin write" ON public.settings;
CREATE POLICY "settings admin write" ON public.settings FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "students admin write" ON public.students;
CREATE POLICY "students admin write" ON public.students FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

-- leaves
DROP POLICY "leaves readable" ON public.leaves;
CREATE POLICY "leaves readable" ON public.leaves FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR private.is_admin(auth.uid()));
DROP POLICY "leaves own insert" ON public.leaves;
CREATE POLICY "leaves own insert" ON public.leaves FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id OR private.is_admin(auth.uid()));
DROP POLICY "leaves update" ON public.leaves;
CREATE POLICY "leaves update" ON public.leaves FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id OR private.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = teacher_id OR private.is_admin(auth.uid()));
DROP POLICY "leaves delete" ON public.leaves;
CREATE POLICY "leaves delete" ON public.leaves FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id OR private.is_admin(auth.uid()));

-- allocations
DROP POLICY "allocations admin write" ON public.allocations;
CREATE POLICY "allocations admin write" ON public.allocations FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "allocations readable by owner or admin" ON public.allocations;
CREATE POLICY "allocations readable by owner or admin" ON public.allocations FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR private.is_admin(auth.uid()));

-- emergency_requests
DROP POLICY "emergency raise own" ON public.emergency_requests;
CREATE POLICY "emergency raise own" ON public.emergency_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by OR private.is_admin(auth.uid()));
DROP POLICY "emergency admin update" ON public.emergency_requests;
CREATE POLICY "emergency admin update" ON public.emergency_requests FOR UPDATE TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "emergency admin delete" ON public.emergency_requests;
CREATE POLICY "emergency admin delete" ON public.emergency_requests FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()));
DROP POLICY "emergency readable by involved or admin" ON public.emergency_requests;
CREATE POLICY "emergency readable by involved or admin" ON public.emergency_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by OR auth.uid() = original_teacher_id
         OR auth.uid() = replacement_teacher_id OR private.is_admin(auth.uid()));

-- staff_requests
DROP POLICY "staff requests readable by owner or admin" ON public.staff_requests;
CREATE POLICY "staff requests readable by owner or admin" ON public.staff_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by OR private.is_admin(auth.uid()));
DROP POLICY "staff requests admin update" ON public.staff_requests;
CREATE POLICY "staff requests admin update" ON public.staff_requests FOR UPDATE TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY "staff requests admin delete" ON public.staff_requests;
CREATE POLICY "staff requests admin delete" ON public.staff_requests FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()));

-- user_roles
DROP POLICY "roles readable by self or admin" ON public.user_roles;
CREATE POLICY "roles readable by self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);