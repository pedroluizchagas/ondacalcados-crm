-- Seed initial data for Onda Calcados HR System
-- This script creates initial stores and positions

-- Insert stores (matching the schema: id, name, cnpj, city)
INSERT INTO public.stores (name, cnpj, city) VALUES
  ('Loja Centro', '12.345.678/0001-01', 'Sao Paulo'),
  ('Loja Shopping Norte', '12.345.678/0002-02', 'Sao Paulo'),
  ('Loja Zona Sul', '12.345.678/0003-03', 'Sao Paulo')
ON CONFLICT DO NOTHING;

-- Insert positions (matching the schema: name, cbo, base_salary, description)
INSERT INTO public.positions (name, cbo, base_salary, description) VALUES
  ('Vendedor', '5211-10', 1800.00, 'Responsavel por atendimento e vendas'),
  ('Caixa', '4211-25', 1600.00, 'Responsavel por operacoes de caixa'),
  ('Gerente de Loja', '1421-05', 4500.00, 'Responsavel pela gestao da loja'),
  ('Estoquista', '4141-05', 1500.00, 'Responsavel pelo controle de estoque'),
  ('Auxiliar Administrativo', '4110-10', 1700.00, 'Suporte administrativo geral')
ON CONFLICT DO NOTHING;
