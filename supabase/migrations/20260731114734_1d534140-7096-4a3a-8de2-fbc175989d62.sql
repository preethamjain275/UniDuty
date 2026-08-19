-- ROLES
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'teacher');
CREATE TYPE public.exam_type AS ENUM ('internal', 'semester');
CREATE TYPE public.allocation_role AS ENUM ('primary', 'secondary', 'standby');
CREATE TYPE public.allocation_status AS ENUM ('pending', 'accepted', 'declined', 'replaced');
CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'completed', 'cancelled');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  employee_id text UNIQUE,
  email text,
  phone text,
  department text NOT NULL DEFAULT 'General',
  designation text NOT NULL DEFAULT 'Assistant Professor',
  is_senior boolean NOT NULL DEFAULT false,
  max_duties integer NOT NULL DEFAULT 8,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL UNIQUE,
  floor integer NOT NULL,
  block text NOT NULL,
  capacity integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms readable" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms admin write" ON public.rooms FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.rooms (room_number, floor, block, capacity)
SELECT b.block || '-' || (f.floor * 100 + r.n)::text, f.floor, b.block, 30
FROM (VALUES (1,'A'),(2,'B'),(3,'C'),(4,'D'),(5,'E'),(6,'F'),(7,'G'),(8,'H')) AS t(floor, block)
JOIN LATERAL (SELECT t.floor AS floor) f ON true
JOIN LATERAL (SELECT t.block AS block) b ON true
CROSS JOIN generate_series(1,7) AS r(n);

-- EXAMS
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exam_type public.exam_type NOT NULL,
  exam_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:30',
  duration_minutes integer NOT NULL DEFAULT 90,
  reporting_minutes integer NOT NULL DEFAULT 30,
  status public.exam_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams readable" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "exams admin write" ON public.exams FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.exam_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  students_allocated integer NOT NULL DEFAULT 30,
  UNIQUE (exam_id, room_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_rooms TO authenticated;
GRANT ALL ON public.exam_rooms TO service_role;
ALTER TABLE public.exam_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_rooms readable" ON public.exam_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam_rooms admin write" ON public.exam_rooms FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- LEAVES
CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status public.leave_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaves TO authenticated;
GRANT ALL ON public.leaves TO service_role;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaves readable" ON public.leaves FOR SELECT TO authenticated USING (auth.uid() = teacher_id OR public.is_admin(auth.uid()));
CREATE POLICY "leaves own insert" ON public.leaves FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id OR public.is_admin(auth.uid()));
CREATE POLICY "leaves update" ON public.leaves FOR UPDATE TO authenticated USING (auth.uid() = teacher_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = teacher_id OR public.is_admin(auth.uid()));
CREATE POLICY "leaves delete" ON public.leaves FOR DELETE TO authenticated USING (auth.uid() = teacher_id OR public.is_admin(auth.uid()));

-- ALLOCATIONS
CREATE TABLE public.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duty_role public.allocation_role NOT NULL DEFAULT 'primary',
  status public.allocation_status NOT NULL DEFAULT 'pending',
  published boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX allocations_one_duty_per_exam ON public.allocations (exam_id, teacher_id) WHERE status <> 'replaced';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocations readable" ON public.allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "allocations admin write" ON public.allocations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "allocations teacher respond" ON public.allocations FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- SETTINGS
CREATE TABLE public.settings (
  id integer PRIMARY KEY DEFAULT 1,
  internal_duration integer NOT NULL DEFAULT 90,
  semester_duration integer NOT NULL DEFAULT 180,
  reporting_minutes integer NOT NULL DEFAULT 30,
  attendance_window_minutes integer NOT NULL DEFAULT 15,
  max_duties integer NOT NULL DEFAULT 8,
  standby_percentage integer NOT NULL DEFAULT 10,
  two_invigilator_threshold integer NOT NULL DEFAULT 40,
  CONSTRAINT settings_single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.settings (id) VALUES (1);

-- PROFILE AUTO-CREATE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, employee_id, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'employee_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', 'General')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles) = 0 THEN 'super_admin'::public.app_role ELSE 'teacher'::public.app_role END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();