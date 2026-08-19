DO $$
DECLARE shift_days integer;
BEGIN
  SELECT (CURRENT_DATE - MIN(exam_date)) INTO shift_days FROM public.exams;
  IF shift_days IS NOT NULL AND shift_days <> 0 THEN
    UPDATE public.exams SET exam_date = exam_date + shift_days;
  END IF;
END $$;