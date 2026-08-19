
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ============ DEMO FACULTY ============
INSERT INTO public.profiles (id, full_name, employee_id, email, phone, department, designation, is_senior, max_duties, active) VALUES
('a0000000-0000-4000-8000-000000000001','Dr. Anitha Raghavan','DEMO-01','anitha.r@campus.edu','+91 98400 10001','Computer Science','Professor',true,8,true),
('a0000000-0000-4000-8000-000000000002','Dr. Bharath Kumar','DEMO-02','bharath.k@campus.edu','+91 98400 10002','Computer Science','Associate Professor',true,8,true),
('a0000000-0000-4000-8000-000000000003','Ms. Chitra Devi','DEMO-03','chitra.d@campus.edu','+91 98400 10003','Computer Science','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000004','Mr. Dinesh Prabhu','DEMO-04','dinesh.p@campus.edu','+91 98400 10004','Information Technology','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000005','Dr. Elakkiya S','DEMO-05','elakkiya.s@campus.edu','+91 98400 10005','Information Technology','Professor',true,7,true),
('a0000000-0000-4000-8000-000000000006','Mr. Farhan Ali','DEMO-06','farhan.a@campus.edu','+91 98400 10006','Information Technology','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000007','Dr. Gayathri Menon','DEMO-07','gayathri.m@campus.edu','+91 98400 10007','Electronics','Professor',true,6,true),
('a0000000-0000-4000-8000-000000000008','Mr. Hari Shankar','DEMO-08','hari.s@campus.edu','+91 98400 10008','Electronics','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000009','Ms. Ishwarya N','DEMO-09','ishwarya.n@campus.edu','+91 98400 10009','Electronics','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000010','Dr. Jayanth Rao','DEMO-10','jayanth.r@campus.edu','+91 98400 10010','Mechanical','Associate Professor',true,7,true),
('a0000000-0000-4000-8000-000000000011','Mr. Karthik Vel','DEMO-11','karthik.v@campus.edu','+91 98400 10011','Mechanical','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000012','Ms. Lavanya Iyer','DEMO-12','lavanya.i@campus.edu','+91 98400 10012','Mechanical','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000013','Dr. Manoj Pillai','DEMO-13','manoj.p@campus.edu','+91 98400 10013','Civil','Professor',true,6,true),
('a0000000-0000-4000-8000-000000000014','Ms. Nithya Balan','DEMO-14','nithya.b@campus.edu','+91 98400 10014','Civil','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000015','Mr. Omkar Joshi','DEMO-15','omkar.j@campus.edu','+91 98400 10015','Civil','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000016','Dr. Priya Sundaram','DEMO-16','priya.s@campus.edu','+91 98400 10016','Mathematics','Professor',true,7,true),
('a0000000-0000-4000-8000-000000000017','Mr. Qadir Hussain','DEMO-17','qadir.h@campus.edu','+91 98400 10017','Mathematics','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000018','Ms. Ramya Krishnan','DEMO-18','ramya.k@campus.edu','+91 98400 10018','Mathematics','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000019','Dr. Suresh Natarajan','DEMO-19','suresh.n@campus.edu','+91 98400 10019','Physics','Associate Professor',true,7,true),
('a0000000-0000-4000-8000-000000000020','Ms. Tara Fernandes','DEMO-20','tara.f@campus.edu','+91 98400 10020','Physics','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000021','Mr. Uday Shetty','DEMO-21','uday.s@campus.edu','+91 98400 10021','Chemistry','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000022','Dr. Vidhya Lakshmi','DEMO-22','vidhya.l@campus.edu','+91 98400 10022','Chemistry','Professor',true,6,true),
('a0000000-0000-4000-8000-000000000023','Mr. Wasim Akram','DEMO-23','wasim.a@campus.edu','+91 98400 10023','English','Assistant Professor',false,8,true),
('a0000000-0000-4000-8000-000000000024','Ms. Yamini Ravi','DEMO-24','yamini.r@campus.edu','+91 98400 10024','English','Assistant Professor',false,8,true)
ON CONFLICT (id) DO NOTHING;

-- ============ DEMO EXAMS ============
INSERT INTO public.exams (id, name, exam_type, exam_date, start_time, duration_minutes, reporting_minutes, status) VALUES
('e0000000-0000-4000-8000-000000000001','CIA-I Internal Assessment — Semester 3','internal', CURRENT_DATE, '09:30', 90, 30, 'published'),
('e0000000-0000-4000-8000-000000000002','End Semester Theory — Semester 5','semester', CURRENT_DATE + 3, '09:30', 180, 30, 'draft'),
('e0000000-0000-4000-8000-000000000003','CIA-II Internal Assessment — Semester 1','internal', CURRENT_DATE + 7, '14:00', 90, 30, 'draft'),
('e0000000-0000-4000-8000-000000000004','End Semester Theory — Semester 7','semester', CURRENT_DATE + 12, '09:30', 180, 30, 'draft'),
('e0000000-0000-4000-8000-000000000005','Model Examination — Semester 8','semester', CURRENT_DATE - 6, '09:30', 180, 30, 'completed')
ON CONFLICT (id) DO NOTHING;

-- ============ HALLS PER EXAM ============
INSERT INTO public.exam_rooms (exam_id, room_id, students_allocated)
SELECT 'e0000000-0000-4000-8000-000000000001', id, 30 FROM public.rooms WHERE floor = 1 ORDER BY room_number LIMIT 6;
INSERT INTO public.exam_rooms (exam_id, room_id, students_allocated)
SELECT 'e0000000-0000-4000-8000-000000000002', id, 45 FROM public.rooms WHERE floor = 2 ORDER BY room_number LIMIT 8;
INSERT INTO public.exam_rooms (exam_id, room_id, students_allocated)
SELECT 'e0000000-0000-4000-8000-000000000003', id, 28 FROM public.rooms WHERE floor = 3 ORDER BY room_number LIMIT 5;
INSERT INTO public.exam_rooms (exam_id, room_id, students_allocated)
SELECT 'e0000000-0000-4000-8000-000000000004', id, 42 FROM public.rooms WHERE floor = 4 ORDER BY room_number LIMIT 6;
INSERT INTO public.exam_rooms (exam_id, room_id, students_allocated)
SELECT 'e0000000-0000-4000-8000-000000000005', id, 35 FROM public.rooms WHERE floor = 5 ORDER BY room_number LIMIT 4;

-- ============ PUBLISHED DUTY ROSTER FOR TODAY'S EXAM ============
WITH slots AS (
  SELECT er.room_id, row_number() OVER (ORDER BY r.room_number) AS rn
  FROM public.exam_rooms er JOIN public.rooms r ON r.id = er.room_id
  WHERE er.exam_id = 'e0000000-0000-4000-8000-000000000001'
), t AS (
  SELECT id, row_number() OVER (ORDER BY full_name) AS rn
  FROM public.profiles WHERE employee_id LIKE 'DEMO-%'
)
INSERT INTO public.allocations (exam_id, room_id, teacher_id, duty_role, status, published)
SELECT 'e0000000-0000-4000-8000-000000000001', s.room_id, t.id, 'primary',
  (ARRAY['accepted','accepted','pending']::public.allocation_status[])[1 + (s.rn % 3)], true
FROM slots s JOIN t ON t.rn = s.rn;

INSERT INTO public.allocations (exam_id, room_id, teacher_id, duty_role, status, published)
SELECT 'e0000000-0000-4000-8000-000000000001', NULL, id, 'standby', 'accepted', true
FROM public.profiles WHERE employee_id IN ('DEMO-22','DEMO-23');

-- completed exam history (spreads workload data)
WITH slots AS (
  SELECT er.room_id, row_number() OVER (ORDER BY r.room_number) AS rn
  FROM public.exam_rooms er JOIN public.rooms r ON r.id = er.room_id
  WHERE er.exam_id = 'e0000000-0000-4000-8000-000000000005'
), t AS (
  SELECT id, row_number() OVER (ORDER BY full_name DESC) AS rn
  FROM public.profiles WHERE employee_id LIKE 'DEMO-%'
)
INSERT INTO public.allocations (exam_id, room_id, teacher_id, duty_role, status, published)
SELECT 'e0000000-0000-4000-8000-000000000005', s.room_id, t.id, 'primary', 'accepted', true
FROM slots s JOIN t ON t.rn = s.rn;

-- ============ LEAVES ============
INSERT INTO public.leaves (teacher_id, start_date, end_date, reason, status) VALUES
('a0000000-0000-4000-8000-000000000009', CURRENT_DATE, CURRENT_DATE + 4, 'Medical leave', 'approved'),
('a0000000-0000-4000-8000-000000000017', CURRENT_DATE + 6, CURRENT_DATE + 8, 'Conference — attending as reviewer', 'approved');
