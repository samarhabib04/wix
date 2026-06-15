-- fraud_logs: allow admins to list and dismiss (set reviewed_at) from the admin dashboard.
-- Without an UPDATE policy, PostgREST returns 0 rows and the UI shows "No fraud log found with that ID".

ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fraud_logs_select_admin" ON public.fraud_logs;
DROP POLICY IF EXISTS "fraud_logs_update_admin" ON public.fraud_logs;

CREATE POLICY "fraud_logs_select_admin"
ON public.fraud_logs
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() = true);

CREATE POLICY "fraud_logs_update_admin"
ON public.fraud_logs
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() = true)
WITH CHECK (public.is_current_user_admin() = true);
