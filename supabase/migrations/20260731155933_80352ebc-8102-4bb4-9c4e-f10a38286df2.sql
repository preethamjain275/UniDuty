-- 1. Students master list
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no integer NOT NULL UNIQUE,
  register_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  department text NOT NULL DEFAULT 'General',
  semester integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students readable" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "students admin write" ON public.students FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 2. Reset facility: 5 floors x 8 halls, 30 seats
DELETE FROM public.allocations;
DELETE FROM public.exam_rooms;
DELETE FROM public.exams;
DELETE FROM public.rooms;

INSERT INTO public.rooms (id, room_number, floor, block, capacity, active)
SELECT
  ('a0000000-0000-4000-8000-0000000' || lpad((f*10+r)::text, 5, '0'))::uuid,
  chr(64+f) || '-' || (f*100 + r)::text,
  f, chr(64+f), 30, true
FROM generate_series(1,5) f, generate_series(1,8) r;

-- 3. Students: 1200 serial numbers
INSERT INTO public.students (serial_no, register_no, full_name, department, semester)
SELECT
  n,
  '24CS' || lpad(n::text, 4, '0'),
  (ARRAY['Aarav','Diya','Vihaan','Ananya','Arjun','Ishita','Rohan','Meera','Kabir','Sanya','Aditya','Nithya','Karthik','Priya','Vikram','Lakshmi','Rahul','Divya','Surya','Anjali'])[1 + (n % 20)]
    || ' ' ||
  (ARRAY['Kumar','Sharma','Raj','Iyer','Nair','Menon','Reddy','Patel','Gupta','Krishnan'])[1 + (n % 10)],
  (ARRAY['Computer Science','Electronics','Mechanical','Civil','Information Technology'])[1 + (n % 5)],
  1 + (n % 8)
FROM generate_series(1,1200) n
ON CONFLICT (serial_no) DO NOTHING;

-- 4. Faculty pool of 90 (top up existing)
INSERT INTO public.profiles (id, full_name, employee_id, email, department, designation, is_senior, max_duties, active)
SELECT
  ('b0000000-0000-4000-8000-0000000' || lpad(n::text, 5, '0'))::uuid,
  'Prof. ' ||
  (ARRAY['Anand','Bhavani','Chandra','Deepa','Elango','Farida','Ganesh','Hema','Iniya','Jagan','Kavitha','Latha','Mahesh','Nandini','Omkar','Padma','Quadir','Ravi','Sunita','Tharun','Uma','Vasanth','Wahida','Yamini'])[1 + (n % 24)]
   || ' ' ||
  (ARRAY['Krishnan','Subramanian','Venkatesh','Balaji','Rajan','Natarajan','Sundaram','Muthu'])[1 + (n % 8)],
  'EMP' || lpad((1000+n)::text, 4, '0'),
  'faculty' || n || '@campus.edu',
  (ARRAY['Computer Science','Electronics','Mechanical','Civil','Information Technology','Mathematics'])[1 + (n % 6)],
  CASE WHEN n % 4 = 0 THEN 'Associate Professor' ELSE 'Assistant Professor' END,
  (n % 4 = 0),
  12,
  true
FROM generate_series(1,90) n
ON CONFLICT (id) DO NOTHING;

-- 5. Eight consecutive exam days
INSERT INTO public.exams (id, name, exam_type, exam_date, start_time, duration_minutes, reporting_minutes, status)
SELECT
  ('e0000000-0000-4000-8000-0000000000' || lpad(d::text, 2, '0'))::uuid,
  'Day ' || d || ' — ' || (ARRAY['Mathematics','Physics','Chemistry','Data Structures','Digital Electronics','Thermodynamics','Environmental Science','Communication Skills'])[d],
  CASE WHEN d % 2 = 1 THEN 'semester'::exam_type ELSE 'internal'::exam_type END,
  CURRENT_DATE + (d - 1),
  CASE WHEN d % 2 = 1 THEN TIME '09:30' ELSE TIME '14:00' END,
  CASE WHEN d % 2 = 1 THEN 180 ELSE 90 END,
  30,
  'published'::exam_status
FROM generate_series(1,8) d;

-- 6. Every hall used every day, 30 students each
INSERT INTO public.exam_rooms (exam_id, room_id, students_allocated)
SELECT e.id, r.id, 30 FROM public.exams e CROSS JOIN public.rooms r;

-- 7. Duty roster: 1 invigilator + 1 checking staff per hall, 1 replacement per floor
WITH t AS (
  SELECT id, row_number() OVER (ORDER BY employee_id) - 1 AS idx
  FROM public.profiles WHERE active = true LIMIT 90
), e AS (
  SELECT id, row_number() OVER (ORDER BY exam_date) - 1 AS d FROM public.exams
), r AS (
  SELECT id, floor, row_number() OVER (ORDER BY floor, room_number) - 1 AS ri FROM public.rooms
), room_duties AS (
  SELECT e.id AS exam_id, r.id AS room_id,
         ((2*r.ri + k + e.d*7) % 90) AS tidx,
         CASE WHEN k = 0 THEN 'primary'::allocation_role ELSE 'secondary'::allocation_role END AS duty_role
  FROM e CROSS JOIN r CROSS JOIN generate_series(0,1) k
), standby_duties AS (
  SELECT e.id AS exam_id, NULL::uuid AS room_id,
         ((80 + f + e.d*7) % 90) AS tidx,
         'standby'::allocation_role AS duty_role
  FROM e CROSS JOIN generate_series(1,5) f
)
INSERT INTO public.allocations (exam_id, room_id, teacher_id, duty_role, status, published)
SELECT x.exam_id, x.room_id, t.id, x.duty_role, 'accepted'::allocation_status, true
FROM (SELECT * FROM room_duties UNION ALL SELECT * FROM standby_duties) x
JOIN t ON t.idx = x.tidx;

-- 8. Two staff per hall of 30
UPDATE public.settings SET two_invigilator_threshold = 29, standby_percentage = 13, max_duties = 12 WHERE id = 1;