-- Supabase requires a second factor for password updates while a verified factor exists.
DO $$
BEGIN
	IF to_regclass('auth.mfa_factors') IS NOT NULL THEN
		DELETE FROM auth.mfa_factors
		WHERE factor_type = 'totp'
			AND user_id IN (SELECT auth_user_id FROM commerce_admin.staff_user);
	END IF;
END $$;
