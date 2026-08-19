ALTER TABLE public.emergency_requests ADD COLUMN IF NOT EXISTS admin_read_at timestamptz;

CREATE TABLE public.staff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  department text NOT NULL DEFAULT 'General',
  designation text NOT NULL DEFAULT 'Assistant Professor',
  staff_type text NOT NULL DEFAULT 'teaching',
  is_senior boolean NOT NULL DEFAULT false,
  max_duties integer NOT NULL DEFAULT 8,
  reason text NOT NULL DEFAULT 'New staff addition',
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes text,
  reviewed_at timestamptz,
  admin_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_requests TO authenticated;
GRANT ALL ON public.staff_requests TO service_role;

ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff requests readable by owner or admin" ON public.staff_requests
FOR SELECT TO authenticated
USING (auth.uid() = requested_by OR public.is_admin(auth.uid()));

CREATE POLICY "staff requests insert own" ON public.staff_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "staff requests admin update" ON public.staff_requests
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff requests admin delete" ON public.staff_requests
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER staff_requests_touch
BEFORE UPDATE ON public.staff_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();