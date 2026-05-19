-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $do_block$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert seed user (idempotent)
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

  -- Add some mock leads if table is empty
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA") THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, created_at, status_updated_at)
    VALUES
      (gen_random_uuid(), 'João Silva', '5511999999991', 'em_atendimento', NOW() - INTERVAL '1 day', NOW()),
      (gen_random_uuid(), 'Maria Souza', '5511999999992', 'Transferido', NOW() - INTERVAL '2 days', NOW()),
      (gen_random_uuid(), 'Carlos Santos', '5511999999993', 'ativo', NOW() - INTERVAL '3 hours', NOW()),
      (gen_random_uuid(), 'Ana Lima', '5511999999994', 'finalizado', NOW() - INTERVAL '5 days', NOW()),
      (gen_random_uuid(), 'Pedro Alves', '5511999999995', 'inativo', NOW() - INTERVAL '10 days', NOW());
  END IF;

  -- Add some mock memories if table is empty
  IF NOT EXISTS (SELECT 1 FROM public."memória") THEN
    INSERT INTO public."memória" (session_id, message)
    VALUES
      ('5511999999991', '{"type": "human", "text": "Olá, gostaria de saber mais sobre a gráfica."}'::jsonb),
      ('5511999999991', '{"type": "ai", "text": "Claro! Como posso ajudar hoje?"}'::jsonb),
      ('5511999999992', '{"type": "human", "text": "Quero falar com um atendente."}'::jsonb),
      ('5511999999992', '{"type": "ai", "text": "Transferindo para um humano agora..."}'::jsonb);
  END IF;

  -- Add some mock documents if table is empty
  IF NOT EXISTS (SELECT 1 FROM public.documents) THEN
    INSERT INTO public.documents (content, metadata)
    VALUES
      ('Política de devolução: 30 dias para devolução grátis.', '{"title": "Devoluções", "category": "Suporte"}'::jsonb),
      ('Horário de atendimento: Segunda a Sexta, 9h às 18h.', '{"title": "Horários", "category": "Geral"}'::jsonb),
      ('Tabela de preços para cartões de visita: 1000 un por R$ 50,00.', '{"title": "Preços Cartões", "category": "Vendas"}'::jsonb);
  END IF;
END $do_block$;

-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "familiares_all" ON public.familiares;
DROP POLICY IF EXISTS "memoria_all" ON public."memória";
DROP POLICY IF EXISTS "documents_all" ON public.documents;
DROP POLICY IF EXISTS "leadswa_all" ON public."LeadsWA";

-- Create RLS Policies for authenticated users
CREATE POLICY "familiares_all" ON public.familiares FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "memoria_all" ON public."memória" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "documents_all" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "leadswa_all" ON public."LeadsWA" FOR ALL TO authenticated USING (true) WITH CHECK (true);

