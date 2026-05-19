ALTER TABLE public."LeadsWA" ADD COLUMN IF NOT EXISTS sale_value NUMERIC(10,2);
ALTER TABLE public."LeadsWA" ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE public."LeadsWA" ADD COLUMN IF NOT EXISTS lead_quality_feedback TEXT;

DO $$
BEGIN
  INSERT INTO public."LeadsWA" (id, nome, phone, status, sale_value, lost_reason, lead_quality_feedback, lead_source, created_at, status_updated_at)
  VALUES 
    (gen_random_uuid(), 'Carlos Cliente', '5511999990001', 'Fechado', 2500.00, NULL, 'Excelente lead, fechou rápido.', 'Agente IA', NOW() - INTERVAL '3 days', NOW()),
    (gen_random_uuid(), 'Maria Perdida', '5511999990002', 'Perdido', NULL, 'Preço Alto', 'Achou o serviço muito caro, mas atendimento foi bom.', 'Agente IA', NOW() - INTERVAL '4 days', NOW()),
    (gen_random_uuid(), 'João Desistiu', '5511999990003', 'Perdido', NULL, 'Sem Resposta', 'Parou de responder no WhatsApp.', 'Agente IA', NOW() - INTERVAL '5 days', NOW()),
    (gen_random_uuid(), 'Ana Compradora', '5511999990004', 'Fechado', 4200.50, NULL, 'Muito bem qualificada pela IA.', 'Agente IA', NOW() - INTERVAL '2 days', NOW())
  ON CONFLICT (phone) DO NOTHING;
END $$;
