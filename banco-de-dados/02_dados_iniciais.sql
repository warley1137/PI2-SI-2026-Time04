USE pronto_socorro;

INSERT INTO profissional (nome, cpf, funcao, login, senha_hash) VALUES
  ('Ana Silva',       '52601815906', 'RECEPCIONISTA', 'ana.recepcao', 'PENDENTE'),
  ('Bruno Souza',     '08301661305', 'ENFERMEIRO',    'bruno.enf',    'PENDENTE'),
  ('Dra. Carla Lima', '18609139034', 'MEDICO',        'carla.med',    'PENDENTE');

INSERT INTO enfermeiro (id_profissional, coren) VALUES
  (2, 'COREN-SP 123456');

INSERT INTO medico (id_profissional, crm, especialidade) VALUES
  (3, 'CRM-SP 654321', 'Clínica Médica');

INSERT INTO paciente (nome, cpf, rg, data_nascimento, sexo, nome_mae, nome_pai, telefone,
                      cep, logradouro, numero, bairro, cidade, uf) VALUES
  ('João Pereira Santos',    '99603082430', '12.345.678-9', '1985-03-12', 'M', 'Maria Pereira', 'José Santos',     '19991110001', '13087000', 'Rua das Flores',       '100',  'Centro',             'Campinas', 'SP'),
  ('Mariana Costa Oliveira', '62819482112', '23.456.789-0', '1999-07-25', 'F', 'Lúcia Costa',   'Paulo Oliveira',  '19991110002', '13083000', 'Av. Brasil',           '2500', 'Jardim Guanabara',   'Campinas', 'SP'),
  ('Pedro Henrique Alves',   '99351819019', '34.567.890-1', '1952-11-03', 'M', 'Rosa Alves',    'Antônio Alves',   '19991110003', '13010000', 'Rua Barão de Jaguara', '45',   'Centro',             'Campinas', 'SP'),
  ('Beatriz Ramos Ferreira', '93786579741', '45.678.901-2', '2015-02-18', 'F', 'Juliana Ramos', 'Carlos Ferreira', '19991110004', '13087500', 'Rua Guatemala',        '310',  'Jardim Nova Europa', 'Campinas', 'SP'),
  ('Ricardo Gomes Barbosa',  '54323194897', '56.789.012-3', '1978-09-30', 'M', 'Sandra Gomes',  'Roberto Barbosa', '19991110005', '13084000', 'Rua Sacramento',       '77',   'Cambuí',             'Campinas', 'SP'),
  ('Fernanda Lopes Dias',    '75749118606', '67.890.123-4', '1990-12-05', 'F', 'Clara Lopes',   'Marcos Dias',     '19991110006', '13086000', 'Rua Coronel Quirino',  '1200', 'Cambuí',             'Campinas', 'SP');

INSERT INTO atendimento (numero_atendimento, id_paciente, id_recepcionista, dt_chegada, status,
                         dt_cancelamento, motivo_cancelamento) VALUES
  ('AT0001', 1, 1, NOW() - INTERVAL 30 DAY,     'FINALIZADO',         NULL, NULL),
  ('AT0002', 2, 1, NOW() - INTERVAL 50 MINUTE,  'AGUARDANDO_MEDICO',  NULL, NULL),
  ('AT0003', 3, 1, NOW() - INTERVAL 20 MINUTE,  'AGUARDANDO_MEDICO',  NULL, NULL),
  ('AT0004', 4, 1, NOW() - INTERVAL 90 MINUTE,  'AGUARDANDO_MEDICO',  NULL, NULL),
  ('AT0005', 5, 1, NOW() - INTERVAL 5 MINUTE,   'AGUARDANDO_TRIAGEM', NULL, NULL),
  ('AT0006', 6, 1, NOW() - INTERVAL 30 MINUTE,  'CANCELADO',          NOW() - INTERVAL 25 MINUTE,
   'Paciente desistiu antes da triagem'),
  ('AT0007', 1, 1, NOW() - INTERVAL 180 MINUTE, 'FINALIZADO',         NULL, NULL);

INSERT INTO triagem (id_atendimento, id_enfermeiro, pressao_sistolica, pressao_diastolica, temperatura,
                     frequencia_cardiaca, queixas, classificacao, dt_triagem) VALUES
  (1, 2, 120,  80, 37.8,  90, 'Dor de garganta, febre',                                  'Verde',   NOW() - INTERVAL 30 DAY + INTERVAL 10 MINUTE),
  (2, 2, 110,  70, 36.8,  88, 'Náusea, vômito (3 vezes desde a manhã), dor abdominal',   'Amarelo', NOW() - INTERVAL 40 MINUTE),
  (3, 2, 170, 100, 36.5, 112, 'Dor no peito irradiando para o braço, suor, falta de ar', 'Laranja', NOW() - INTERVAL 15 MINUTE),
  (4, 2, 100,  65, 37.4, 100, 'Tosse, febre',                                            'Verde',   NOW() - INTERVAL 80 MINUTE),
  (7, 2, 130,  85, 38.2,  95, 'Febre, dor muscular, dor de cabeça',                      'Verde',   NOW() - INTERVAL 170 MINUTE);

INSERT INTO prontuario (id_atendimento, id_medico, dt_inicio, dt_fim, diagnostico, observacao) VALUES
  (1, 3, NOW() - INTERVAL 30 DAY + INTERVAL 40 MINUTE, NOW() - INTERVAL 30 DAY + INTERVAL 55 MINUTE,
   'Amigdalite', 'Antibiótico por 7 dias. Retornar se piorar.'),
  (7, 3, NOW() - INTERVAL 100 MINUTE, NOW() - INTERVAL 80 MINUTE,
   'Síndrome gripal', 'Repouso e hidratação. Alta.');

INSERT INTO prescricao (id_prontuario, medicamento, dosagem, via_administracao, frequencia,
                        dt_prescricao, dt_administracao) VALUES
  (1, 'Amoxicilina 500 mg',           '1 cápsula',    'ORAL',        '8/8h por 7 dias',          NOW() - INTERVAL 30 DAY + INTERVAL 45 MINUTE, NULL),
  (2, 'Dipirona 500 mg/ml injetável', '2 ml',         'INTRAVENOSA', 'Dose única',               NOW() - INTERVAL 95 MINUTE, NOW() - INTERVAL 90 MINUTE),
  (2, 'Paracetamol 750 mg',           '1 comprimido', 'ORAL',        '6/6h por 3 dias se febre', NOW() - INTERVAL 85 MINUTE, NULL);
