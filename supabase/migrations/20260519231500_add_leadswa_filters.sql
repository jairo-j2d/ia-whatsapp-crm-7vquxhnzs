-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $do_block$
BEGIN
  -- Add columns if not exists
  ALTER TABLE public."LeadsWA" ADD COLUMN IF NOT EXISTS lead_type text;
  ALTER TABLE public."LeadsWA" ADD COLUMN IF NOT EXISTS responsible_name text;
  ALTER TABLE public."LeadsWA" ADD COLUMN IF NOT EXISTS lead_source text DEFAULT 'Agente IA';

  -- Update existing rows
  UPDATE public."LeadsWA" SET lead_source = 'Agente IA' WHERE lead_source IS NULL;
  UPDATE public."LeadsWA" SET lead_type = 'Novo' WHERE lead_type IS NULL;
END $do_block$;

-- Ensure RLS and Policy
ALTER TABLE public."LeadsWA" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leadswa_all" ON public."LeadsWA";
CREATE POLICY "leadswa_all" ON public."LeadsWA" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $do_block$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jairo@graficaj2d.com.br') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'jairo@graficaj2d.com.br',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Jairo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- Add mock leads with the new fields to test filtering
  INSERT INTO public."LeadsWA" (id, nome, phone, status, created_at, status_updated_at, lead_type, responsible_name, lead_source)
  VALUES
    (gen_random_uuid(), 'Carlos Agente', '5511988880001', 'em_atendimento', NOW() - INTERVAL '2 hours', NOW(), 'Novo', 'Jairo', 'Agente IA'),
    (gen_random_uuid(), 'Maria Vendas', '5511988880002', 'Transferido', NOW() - INTERVAL '3 days', NOW(), 'Existente', 'Ana', 'Outros'),
    (gen_random_uuid(), 'Pedro Web', '5511988880003', 'ativo', NOW() - INTERVAL '15 days', NOW(), 'Novo', 'Jairo', 'Outros'),
    (gen_random_uuid(), 'Lucas AI', '5511988880004', 'finalizado', NOW() - INTERVAL '1 month', NOW(), 'Existente', 'Carlos', 'Agente IA'),
    (gen_random_uuid(), 'Ana Teste', '5511988880005', 'inativo', NOW() - INTERVAL '40 days', NOW(), 'Novo', 'Ana', 'Agente IA')
  ON CONFLICT (phone) DO UPDATE SET
    lead_type = EXCLUDED.lead_type,
    responsible_name = EXCLUDED.responsible_name,
    lead_source = EXCLUDED.lead_source,
    created_at = EXCLUDED.created_at;

END $do_block$;
