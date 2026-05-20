DO $$
BEGIN
  -- Seed LeadsWA
  INSERT INTO public."LeadsWA" (
    id, nome, phone, status, lead_type, lead_source, sale_value, responsible_name, created_at, status_updated_at
  ) VALUES 
    ('10000000-0000-0000-0000-000000000001'::uuid, 'João Silva', '+5511999999991', 'em_atendimento', 'Novo', 'Agente IA', 0, 'Robô', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes'),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'Maria Oliveira', '+5511999999992', 'Transferido', 'Existente', 'Agente IA', 0, 'Jairo', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'Carlos Santos', '+5511999999993', 'Fechado', 'Novo', 'Agente IA', 1500, 'Robô', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Documents
  IF NOT EXISTS (SELECT 1 FROM public."documents" WHERE content LIKE 'Nossos serviços%') THEN
    INSERT INTO public."documents" (content, metadata) VALUES 
      ('Nossos serviços de impressão incluem banners, cartões de visita e panfletos com alta qualidade e entrega em 24h.', '{"title": "Catálogo de Serviços", "category": "Vendas"}'::jsonb),
      ('O horário de funcionamento da gráfica é de segunda a sexta, das 08:00 às 18:00.', '{"title": "Horário de Funcionamento", "category": "Atendimento"}'::jsonb);
  END IF;

  -- Seed n8n_chat_histories
  IF NOT EXISTS (SELECT 1 FROM public."n8n_chat_histories" WHERE session_id = '+5511999999991') THEN
    INSERT INTO public."n8n_chat_histories" (session_id, message) VALUES 
      ('+5511999999991', '{"type": "human", "text": "Olá, gostaria de saber o valor de mil cartões de visita."}'::jsonb),
      ('+5511999999991', '{"type": "ai", "text": "Olá João! O valor para 1000 cartões de visita padrão é R$ 120,00."}'::jsonb);
  END IF;
END $$;
