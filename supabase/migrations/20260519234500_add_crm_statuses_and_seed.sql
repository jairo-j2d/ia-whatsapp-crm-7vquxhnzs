-- 1. Alter Enum Type
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Novo Lead';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Em Contato';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Proposta Enviada';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Fechado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Perdido';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Expirado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Novo';

-- 2. Seed Admin User
DO $$
DECLARE
  new_user_id uuid;
BEGIN
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
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'jairo@graficaj2d.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Jairo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
END $$;

-- 3. Mock Data for charts to show something right away
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999991') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at) VALUES 
      (gen_random_uuid(), 'Lead CRM 1', '11999999991', 'Novo Lead', 'Agente IA', 'Novo', NOW() - INTERVAL '2 days');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999992') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at) VALUES 
      (gen_random_uuid(), 'Lead CRM 2', '11999999992', 'Em Contato', 'Agente IA', 'Existente', NOW() - INTERVAL '1 days');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999993') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at) VALUES 
      (gen_random_uuid(), 'Lead CRM 3', '11999999993', 'Proposta Enviada', 'Outros', 'Novo', NOW());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999994') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at) VALUES 
      (gen_random_uuid(), 'Lead CRM 4', '11999999994', 'Fechado', 'Agente IA', 'Novo', NOW() - INTERVAL '3 days');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999995') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at) VALUES 
      (gen_random_uuid(), 'Lead CRM 5', '11999999995', 'Perdido', 'Agente IA', 'Existente', NOW() - INTERVAL '4 days');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999996') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at, transfer_expires_at) VALUES 
      (gen_random_uuid(), 'Lead IA 1', '11999999996', 'ativo', 'Agente IA', 'Novo', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public."LeadsWA" WHERE phone = '11999999997') THEN
    INSERT INTO public."LeadsWA" (id, nome, phone, status, lead_source, lead_type, created_at) VALUES 
      (gen_random_uuid(), 'Lead IA 2', '11999999997', 'Expirado', 'Agente IA', 'Novo', NOW() - INTERVAL '1 days');
  END IF;
END $$;
