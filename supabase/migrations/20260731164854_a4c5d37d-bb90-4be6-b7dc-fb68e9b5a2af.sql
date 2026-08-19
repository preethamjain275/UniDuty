DELETE FROM public.students WHERE register_no ILIKE '25CS%';
WITH ranked AS (SELECT id, row_number() OVER (ORDER BY serial_no) rn FROM public.students)
UPDATE public.students s SET serial_no = r.rn + 100000 FROM ranked r WHERE s.id = r.id;
WITH ranked AS (SELECT id, row_number() OVER (ORDER BY serial_no) rn FROM public.students)
UPDATE public.students s SET serial_no = r.rn FROM ranked r WHERE s.id = r.id;
DELETE FROM public.students WHERE serial_no > 1180;