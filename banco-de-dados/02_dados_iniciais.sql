USE pronto_socorro;

INSERT INTO funcao (nome) VALUES
  ('Recepcionista'),
  ('Enfermeiro'),
  ('Médico');

INSERT INTO servico (nome, descricao) VALUES
  ('Recepção',           'Cadastro do paciente e abertura do atendimento'),
  ('Triagem',            'Sinais vitais, queixas e classificação de Manchester'),
  ('Atendimento Médico', 'Consulta, medicações e confirmação do atendimento');

INSERT INTO funcao_servico (id_funcao, id_servico) VALUES
  (1, 1),
  (2, 2),
  (3, 2),
  (3, 3);

INSERT INTO profissional (nome, cpf, registro_conselho, login, senha_hash, id_funcao) VALUES
  ('Ana Silva',         '52601815906', NULL,              'ana.recepcao', 'PENDENTE', 1),
  ('Bruno Souza',       '08301661305', 'COREN-SP 123456', 'bruno.enf',    'PENDENTE', 2),
  ('Dra. Carla Lima',   '18609139034', 'CRM-SP 654321',   'carla.med',    'PENDENTE', 3);

INSERT INTO classificacao_risco (cor, descricao, prioridade, tempo_max_espera_min) VALUES
  ('Vermelho', 'Emergência',    1,   0),
  ('Laranja',  'Muito urgente', 2,  10),
  ('Amarelo',  'Urgente',       3,  60),
  ('Verde',    'Pouco urgente', 4, 120),
  ('Azul',     'Não urgente',   5, 240);

INSERT INTO queixa (descricao) VALUES
  ('Dor de cabeça'), ('Náusea'), ('Enjoo'), ('Vômito'), ('Dor muscular'),
  ('Suor excessivo'), ('Febre'), ('Tontura'), ('Falta de ar'), ('Dor no peito'),
  ('Dor abdominal'), ('Tosse'), ('Diarreia'), ('Corte / ferimento');

INSERT INTO medicamento (nome, apresentacao) VALUES
  ('Dipirona',       '500 mg/ml injetável'),
  ('Dipirona',       '500 mg comprimido'),
  ('Paracetamol',    '750 mg comprimido'),
  ('Ibuprofeno',     '600 mg comprimido'),
  ('Ondansetrona',   '8 mg injetável'),
  ('Metoclopramida', '10 mg injetável'),
  ('Omeprazol',      '40 mg injetável'),
  ('Soro fisiológico 0,9%', '500 ml'),
  ('Salbutamol',     '100 mcg aerossol');

INSERT INTO paciente (nome, cpf, rg, data_nascimento, sexo, nome_mae, nome_pai, telefone,
                      cep, logradouro, numero, bairro, cidade, uf) VALUES
  ('João Pereira Santos',    '99603082430', '12.345.678-9', '1985-03-12', 'M', 'Maria Pereira', 'José Santos',     '19991110001', '13087000', 'Rua das Flores',        '100',  'Centro',             'Campinas', 'SP'),
  ('Mariana Costa Oliveira', '62819482112', '23.456.789-0', '1999-07-25', 'F', 'Lúcia Costa',   'Paulo Oliveira',  '19991110002', '13083000', 'Av. Brasil',            '2500', 'Jardim Guanabara',   'Campinas', 'SP'),
  ('Pedro Henrique Alves',   '99351819019', '34.567.890-1', '1952-11-03', 'M', 'Rosa Alves',    'Antônio Alves',   '19991110003', '13010000', 'Rua Barão de Jaguara',  '45',   'Centro',             'Campinas', 'SP'),
  ('Beatriz Ramos Ferreira', '93786579741', '45.678.901-2', '2015-02-18', 'F', 'Juliana Ramos', 'Carlos Ferreira', '19991110004', '13087500', 'Rua Guatemala',         '310',  'Jardim Nova Europa', 'Campinas', 'SP'),
  ('Ricardo Gomes Barbosa',  '54323194897', '56.789.012-3', '1978-09-30', 'M', 'Sandra Gomes',  'Roberto Barbosa', '19991110005', '13084000', 'Rua Sacramento',        '77',   'Cambuí',             'Campinas', 'SP'),
  ('Fernanda Lopes Dias',    '75749118606', '67.890.123-4', '1990-12-05', 'F', 'Clara Lopes',   'Marcos Dias',     '19991110006', '13086000', 'Rua Coronel Quirino',   '1200', 'Cambuí',             'Campinas', 'SP');

INSERT INTO atendimento (numero_atendimento, id_paciente, dt_chegada, status,
                         dt_confirmacao, dt_cancelamento, motivo_cancelamento) VALUES
  ('AT0001', 1, NOW() - INTERVAL 180 MINUTE, 'FINALIZADO',         NOW() - INTERVAL 80 MINUTE, NULL, NULL),
  ('AT0002', 2, NOW() - INTERVAL 50 MINUTE,  'AGUARDANDO_MEDICO',  NULL, NULL, NULL),
  ('AT0003', 3, NOW() - INTERVAL 20 MINUTE,  'AGUARDANDO_MEDICO',  NULL, NULL, NULL),
  ('AT0004', 4, NOW() - INTERVAL 90 MINUTE,  'AGUARDANDO_MEDICO',  NULL, NULL, NULL),
  ('AT0005', 5, NOW() - INTERVAL 5 MINUTE,   'AGUARDANDO_TRIAGEM', NULL, NULL, NULL),
  ('AT0006', 6, NOW() - INTERVAL 30 MINUTE,  'CANCELADO',          NULL, NOW() - INTERVAL 25 MINUTE,
   'Paciente desistiu antes da triagem');

INSERT INTO triagem (id_atendimento, pressao_sistolica, pressao_diastolica, temperatura,
                     frequencia_cardiaca, id_classificacao, outras_queixas, dt_triagem) VALUES
  (1, 130,  85, 38.2,  95, 4, NULL,                                    NOW() - INTERVAL 170 MINUTE),
  (2, 110,  70, 36.8,  88, 3, 'Vomitou 3 vezes desde a manhã',         NOW() - INTERVAL 40 MINUTE),
  (3, 170, 100, 36.5, 112, 2, 'Dor irradiando para o braço esquerdo',  NOW() - INTERVAL 15 MINUTE),
  (4, 100,  65, 37.4, 100, 4, NULL,                                    NOW() - INTERVAL 80 MINUTE);

INSERT INTO triagem_queixa (id_triagem, id_queixa) VALUES
  (1, 7), (1, 5), (1, 1),
  (2, 2), (2, 4), (2, 11),
  (3, 10), (3, 6), (3, 9),
  (4, 12), (4, 7);

INSERT INTO etapa_atendimento (id_atendimento, id_servico, id_profissional, dt_inicio, dt_fim, observacao) VALUES
  (1, 1, 1, NOW() - INTERVAL 180 MINUTE, NOW() - INTERVAL 177 MINUTE, NULL),
  (2, 1, 1, NOW() - INTERVAL 50 MINUTE,  NOW() - INTERVAL 47 MINUTE,  NULL),
  (3, 1, 1, NOW() - INTERVAL 20 MINUTE,  NOW() - INTERVAL 17 MINUTE,  NULL),
  (4, 1, 1, NOW() - INTERVAL 90 MINUTE,  NOW() - INTERVAL 87 MINUTE,  NULL),
  (5, 1, 1, NOW() - INTERVAL 5 MINUTE,   NOW() - INTERVAL 2 MINUTE,   NULL),
  (6, 1, 1, NOW() - INTERVAL 30 MINUTE,  NOW() - INTERVAL 27 MINUTE,  NULL),
  (1, 2, 2, NOW() - INTERVAL 175 MINUTE, NOW() - INTERVAL 170 MINUTE, NULL),
  (2, 2, 2, NOW() - INTERVAL 45 MINUTE,  NOW() - INTERVAL 40 MINUTE,  NULL),
  (3, 2, 2, NOW() - INTERVAL 18 MINUTE,  NOW() - INTERVAL 15 MINUTE,  NULL),
  (4, 2, 2, NOW() - INTERVAL 85 MINUTE,  NOW() - INTERVAL 80 MINUTE,  NULL),
  (1, 3, 3, NOW() - INTERVAL 100 MINUTE, NOW() - INTERVAL 80 MINUTE,  'Quadro viral. Repouso e hidratação.');

INSERT INTO prescricao (id_atendimento, id_medicamento, dosagem, via_administracao, frequencia,
                        dt_prescricao, dt_administracao) VALUES
  (1, 1, '2 ml',         'INTRAVENOSA', 'Dose única',              NOW() - INTERVAL 95 MINUTE, NOW() - INTERVAL 90 MINUTE),
  (1, 3, '1 comprimido', 'ORAL',        '6/6h por 3 dias se febre', NOW() - INTERVAL 85 MINUTE, NULL);
