-- ============================================
-- Migration: Team invitations
-- ============================================
-- Tabla de invitaciones para promover un "profile-only member"
-- (organization_members con user_id = NULL) a un usuario con login.
--
-- Flujo:
--   1. Admin invita → se genera token, se envía email vía Resend.
--   2. Invitado abre /accept-invite/[token], setea contraseña.
--   3. Se crea auth.users, se vincula a organization_members.user_id.
--   4. Invitación queda como accepted_at.
--
-- Seguridad:
--   - Token se guarda como SHA-256 hex (no en claro).
--   - Solo service role puede consultar por token_hash (en accept flow).
--   - Admins pueden ver/revocar invitaciones de su propia organización.

CREATE TABLE public.invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invitations_org_id ON public.invitations(org_id);
CREATE INDEX idx_invitations_member_id ON public.invitations(member_id);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- Una invitación activa (no aceptada, no revocada, no expirada) por miembro
CREATE UNIQUE INDEX idx_invitations_one_active_per_member
  ON public.invitations(member_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admin de la org puede ver sus invitaciones
CREATE POLICY "admins read their org invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
        AND om.active = true
    )
  );

-- Admin puede crear invitaciones en su org
CREATE POLICY "admins insert invitations in their org"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
        AND om.active = true
    )
  );

-- Admin puede revocar (update revoked_at) en su org
CREATE POLICY "admins update invitations in their org"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
        AND om.active = true
    )
  );
