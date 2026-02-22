-- =============================================
-- user_companies: allow company admins to update roles
-- Required for Settings → Users → edit role per company
-- =============================================

-- Admins can update user_companies for companies they admin
-- (role change when editing user in company settings)
CREATE POLICY "Admins can update company memberships" ON public.user_companies
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );
