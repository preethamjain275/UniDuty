ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_type text NOT NULL DEFAULT 'teaching';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_staff_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_staff_type_check CHECK (staff_type IN ('teaching','non_teaching'));

CREATE TABLE IF NOT EXISTS public.emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  replacement_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'Emergency',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT emergency_requests_status_check CHECK (status IN ('open','resolved','cancelled'))
);

CREATE INDEX IF NOT EXISTS emergency_requests_exam_idx ON public.emergency_requests(exam_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_requests TO authenticated;
GRANT ALL ON public.emergency_requests TO service_role;

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emergency readable" ON public.emergency_requests;
CREATE POLICY "emergency readable" ON public.emergency_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "emergency raise own" ON public.emergency_requests;
CREATE POLICY "emergency raise own" ON public.emergency_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "emergency admin update" ON public.emergency_requests;
CREATE POLICY "emergency admin update" ON public.emergency_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "emergency admin delete" ON public.emergency_requests;
CREATE POLICY "emergency admin delete" ON public.emergency_requests
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emergency_requests_touch ON public.emergency_requests;
CREATE TRIGGER emergency_requests_touch
  BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();