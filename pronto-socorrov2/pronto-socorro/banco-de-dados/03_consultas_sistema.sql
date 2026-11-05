-- =========================================================
-- COMANDOS DO SISTEMA (usados pelo back-end; ? = parâmetro)
-- Não executar este arquivo inteiro.
-- =========================================================

USE pronto_socorro;

-- =========================================================
-- LOGIN
-- =========================================================

SELECT id_profissional, nome, funcao, senha_hash
FROM profissional
WHERE login = ? AND ativo = TRUE;

-- =========================================================
-- PROFISSIONAIS (administração)
-- =========================================================

-- Listar profissionais com CRM / COREN
SELECT pf.id_profissional, pf.nome, pf.funcao, pf.login, pf.ativo,
       m.crm, m.especialidade, e.coren
FROM profissional pf
LEFT JOIN medico m     ON m.id_profissional = pf.id_profissional
LEFT JOIN enfermeiro e ON e.id_profissional = pf.id_profissional
ORDER BY pf.funcao, pf.nome;

-- Cadastrar recepcionista
INSERT INTO profissional (nome, cpf, funcao, login, senha_hash)
VALUES (?, ?, 'RECEPCIONISTA', ?, ?);

-- Cadastrar enfermeiro (transação)
START TRANSACTION;
INSERT INTO profissional (nome, cpf, funcao, login, senha_hash)
VALUES (?, ?, 'ENFERMEIRO', ?, ?);
INSERT INTO enfermeiro (id_profissional, coren)
VALUES (LAST_INSERT_ID(), ?);
COMMIT;

-- Cadastrar médico (transação)
START TRANSACTION;
INSERT INTO profissional (nome, cpf, funcao, login, senha_hash)
VALUES (?, ?, 'MEDICO', ?, ?);
INSERT INTO medico (id_profissional, crm, especialidade)
VALUES (LAST_INSERT_ID(), ?, ?);
COMMIT;

-- Trocar senha
UPDATE profissional SET senha_hash = ? WHERE id_profissional = ?;

-- Desativar / reativar
UPDATE profissional SET ativo = ? WHERE id_profissional = ?;

-- =========================================================
-- RECEPÇÃO - PACIENTE
-- =========================================================

SELECT id_paciente, nome, cpf, data_nascimento, nome_mae
FROM paciente
WHERE cpf = ?;

SELECT id_paciente, nome, cpf, data_nascimento, nome_mae
FROM paciente
WHERE nome LIKE CONCAT('%', ?, '%')
ORDER BY nome;

SELECT * FROM paciente WHERE id_paciente = ?;

INSERT INTO paciente (nome, cpf, rg, data_nascimento, sexo, nome_mae, nome_pai,
                      telefone, cep, logradouro, numero, complemento, bairro, cidade, uf)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

UPDATE paciente
SET nome = ?, cpf = ?, rg = ?, data_nascimento = ?, sexo = ?, nome_mae = ?, nome_pai = ?,
    telefone = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?,
    cidade = ?, uf = ?
WHERE id_paciente = ?;

-- =========================================================
-- RECEPÇÃO - ATENDIMENTO
-- =========================================================

-- Verificar se o paciente já tem atendimento em andamento
SELECT id_atendimento, numero_atendimento, status
FROM atendimento
WHERE id_paciente = ? AND status NOT IN ('FINALIZADO', 'CANCELADO');

-- Abrir atendimento (id_paciente, id_recepcionista logado, observacao)
START TRANSACTION;
INSERT INTO atendimento (id_paciente, id_recepcionista, observacao)
VALUES (?, ?, ?);
UPDATE atendimento
SET numero_atendimento = CONCAT('AT', LPAD(LAST_INSERT_ID(), GREATEST(4, LENGTH(LAST_INSERT_ID())), '0'))
WHERE id_atendimento = LAST_INSERT_ID();
COMMIT;

-- Listar atendimentos
SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada,
       p.nome AS paciente, p.cpf, t.classificacao
FROM atendimento a
JOIN paciente p     ON p.id_paciente    = a.id_paciente
LEFT JOIN triagem t ON t.id_atendimento = a.id_atendimento
ORDER BY a.dt_chegada DESC;

-- Filtrar por status
SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada,
       p.nome AS paciente, t.classificacao
FROM atendimento a
JOIN paciente p     ON p.id_paciente    = a.id_paciente
LEFT JOIN triagem t ON t.id_atendimento = a.id_atendimento
WHERE a.status = ?
ORDER BY a.dt_chegada DESC;

-- Buscar pelo número (AT0001)
SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada, a.observacao,
       p.nome AS paciente, p.cpf, t.classificacao
FROM atendimento a
JOIN paciente p     ON p.id_paciente    = a.id_paciente
LEFT JOIN triagem t ON t.id_atendimento = a.id_atendimento
WHERE a.numero_atendimento = ?;

-- Atendimentos do dia
SELECT a.numero_atendimento, a.status, a.dt_chegada, p.nome AS paciente, t.classificacao
FROM atendimento a
JOIN paciente p     ON p.id_paciente    = a.id_paciente
LEFT JOIN triagem t ON t.id_atendimento = a.id_atendimento
WHERE DATE(a.dt_chegada) = CURDATE()
ORDER BY a.dt_chegada;

-- Alterar (só antes da confirmação do médico)
UPDATE atendimento
SET observacao = ?
WHERE id_atendimento = ? AND status NOT IN ('FINALIZADO', 'CANCELADO');

-- Cancelar (só antes da confirmação do médico; fecha o prontuário se já foi aberto)
START TRANSACTION;
UPDATE atendimento
SET status = 'CANCELADO', dt_cancelamento = NOW(), motivo_cancelamento = ?
WHERE id_atendimento = ? AND status NOT IN ('FINALIZADO', 'CANCELADO');
UPDATE prontuario
SET dt_fim = NOW(), observacao = CONCAT('Atendimento cancelado: ', ?)
WHERE id_atendimento = ? AND dt_fim IS NULL;
COMMIT;

-- =========================================================
-- TRIAGEM
-- =========================================================

-- Fila da triagem
SELECT a.id_atendimento, a.numero_atendimento, p.nome AS paciente,
       p.data_nascimento, a.dt_chegada
FROM atendimento a
JOIN paciente p ON p.id_paciente = a.id_paciente
WHERE a.status = 'AGUARDANDO_TRIAGEM'
ORDER BY a.dt_chegada;

-- Gravar triagem (id_enfermeiro = enfermeiro logado; só se aguardando triagem)
START TRANSACTION;
INSERT INTO triagem (id_atendimento, id_enfermeiro, pressao_sistolica, pressao_diastolica,
                     temperatura, frequencia_cardiaca, queixas, classificacao)
SELECT id_atendimento, ?, ?, ?, ?, ?, ?, ?
FROM atendimento
WHERE id_atendimento = ? AND status = 'AGUARDANDO_TRIAGEM';
UPDATE atendimento
SET status = 'AGUARDANDO_MEDICO'
WHERE id_atendimento = ? AND status = 'AGUARDANDO_TRIAGEM';
COMMIT;

-- Ver triagem de um atendimento
SELECT t.pressao_sistolica, t.pressao_diastolica, t.temperatura, t.frequencia_cardiaca,
       t.queixas, t.classificacao, t.dt_triagem, pf.nome AS enfermeiro, e.coren
FROM triagem t
JOIN enfermeiro e    ON e.id_profissional  = t.id_enfermeiro
JOIN profissional pf ON pf.id_profissional = e.id_profissional
WHERE t.id_atendimento = ?;

-- Reclassificar (paciente piorou na fila)
UPDATE triagem
SET classificacao = ?
WHERE id_atendimento = ?
  AND id_atendimento IN (SELECT id_atendimento FROM atendimento WHERE status = 'AGUARDANDO_MEDICO');

-- =========================================================
-- MÉDICO
-- =========================================================

-- Painel (ordem de Manchester)
SELECT id_atendimento, numero_atendimento, paciente, data_nascimento, idade,
       classificacao, queixas, minutos_espera, tempo_max_espera_min, status
FROM vw_painel_atendimento
ORDER BY prioridade, dt_triagem;

-- Acima do tempo máximo da cor
SELECT numero_atendimento, paciente, classificacao, minutos_espera, tempo_max_espera_min
FROM vw_painel_atendimento
WHERE minutos_espera > tempo_max_espera_min
ORDER BY prioridade, dt_triagem;

-- Chamar paciente: abre o prontuário (id_atendimento, id_atendimento, id_medico logado)
START TRANSACTION;
UPDATE atendimento
SET status = 'EM_ATENDIMENTO'
WHERE id_atendimento = ? AND status = 'AGUARDANDO_MEDICO';
INSERT INTO prontuario (id_atendimento, id_medico)
VALUES (?, ?);
COMMIT;

-- Dados do atendimento (paciente + triagem + prontuário)
SELECT a.id_atendimento, a.numero_atendimento, a.status,
       p.id_paciente, p.nome AS paciente, p.data_nascimento, p.sexo,
       t.pressao_sistolica, t.pressao_diastolica, t.temperatura,
       t.frequencia_cardiaca, t.queixas, t.classificacao, pr.id_prontuario
FROM atendimento a
JOIN paciente p         ON p.id_paciente     = a.id_paciente
JOIN triagem t          ON t.id_atendimento  = a.id_atendimento
LEFT JOIN prontuario pr ON pr.id_atendimento = a.id_atendimento
WHERE a.id_atendimento = ?;

-- Lançar medicação (só com o atendimento em andamento)
INSERT INTO prescricao (id_prontuario, medicamento, dosagem, via_administracao, frequencia)
SELECT pr.id_prontuario, ?, ?, ?, ?
FROM prontuario pr
JOIN atendimento a ON a.id_atendimento = pr.id_atendimento
WHERE pr.id_prontuario = ? AND a.status = 'EM_ATENDIMENTO';

-- Listar medicações do atendimento
SELECT pc.id_prescricao, pc.medicamento, pc.dosagem, pc.via_administracao, pc.frequencia,
       pc.dt_prescricao, pc.dt_administracao
FROM prescricao pc
JOIN prontuario pr ON pr.id_prontuario = pc.id_prontuario
WHERE pr.id_atendimento = ?
ORDER BY pc.dt_prescricao;

-- Marcar medicação como administrada
UPDATE prescricao
SET dt_administracao = NOW()
WHERE id_prescricao = ? AND dt_administracao IS NULL;

-- Remover medicação lançada errada (ainda não administrada)
DELETE FROM prescricao
WHERE id_prescricao = ? AND dt_administracao IS NULL;

-- Confirmar atendimento (alta): fecha o prontuário
START TRANSACTION;
UPDATE atendimento
SET status = 'FINALIZADO'
WHERE id_atendimento = ? AND status = 'EM_ATENDIMENTO';
UPDATE prontuario
SET dt_fim = NOW(), diagnostico = ?, observacao = ?
WHERE id_atendimento = ?;
COMMIT;

-- =========================================================
-- PRONTUÁRIO / HISTÓRICO DO PACIENTE
-- =========================================================

-- Histórico completo do paciente (todas as visitas)
SELECT numero_atendimento, dt_chegada, status, classificacao, queixas,
       enfermeiro, medico, crm, diagnostico, observacao, dt_alta
FROM vw_historico_paciente
WHERE id_paciente = ?
ORDER BY dt_chegada DESC;

-- Histórico pelo CPF
SELECT numero_atendimento, dt_chegada, status, classificacao, medico, diagnostico, dt_alta
FROM vw_historico_paciente
WHERE cpf = ?
ORDER BY dt_chegada DESC;

-- Medicações recebidas pelo paciente em todas as visitas
SELECT a.numero_atendimento, pc.medicamento, pc.dosagem, pc.via_administracao,
       pc.dt_prescricao, pc.dt_administracao
FROM prescricao pc
JOIN prontuario pr ON pr.id_prontuario = pc.id_prontuario
JOIN atendimento a ON a.id_atendimento = pr.id_atendimento
WHERE a.id_paciente = ?
ORDER BY pc.dt_prescricao DESC;

-- =========================================================
-- RELATÓRIOS
-- =========================================================

SELECT status, COUNT(*) AS quantidade
FROM atendimento
GROUP BY status;

SELECT classificacao, COUNT(*) AS quantidade
FROM triagem
GROUP BY classificacao;

-- Atendimentos por médico
SELECT pf.nome, m.crm, COUNT(*) AS atendimentos
FROM prontuario pr
JOIN medico m        ON m.id_profissional  = pr.id_medico
JOIN profissional pf ON pf.id_profissional = m.id_profissional
GROUP BY pf.id_profissional, pf.nome, m.crm
ORDER BY atendimentos DESC;

-- Tempo médio (minutos) da chegada até a alta
SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, a.dt_chegada, pr.dt_fim))) AS media_minutos
FROM atendimento a
JOIN prontuario pr ON pr.id_atendimento = a.id_atendimento
WHERE a.status = 'FINALIZADO';
