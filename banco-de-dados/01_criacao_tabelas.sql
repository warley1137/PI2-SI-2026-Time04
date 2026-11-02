DROP DATABASE IF EXISTS pronto_socorro;
CREATE DATABASE pronto_socorro;
USE pronto_socorro;

CREATE TABLE paciente (
  id_paciente     INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cpf             CHAR(11)     UNIQUE,
  rg              VARCHAR(20),
  data_nascimento DATE         NOT NULL,
  sexo            CHAR(1),
  nome_mae        VARCHAR(100),
  nome_pai        VARCHAR(100),
  telefone        VARCHAR(15),
  cep             CHAR(8),
  logradouro      VARCHAR(100),
  numero          VARCHAR(10),
  complemento     VARCHAR(50),
  bairro          VARCHAR(60),
  cidade          VARCHAR(60),
  uf              CHAR(2),
  dt_cadastro     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profissional (
  id_profissional INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cpf             CHAR(11)     NOT NULL UNIQUE,
  funcao          VARCHAR(20)  NOT NULL,
  login           VARCHAR(30)  NOT NULL UNIQUE,
  senha_hash      VARCHAR(255) NOT NULL,
  ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
  CHECK (funcao IN ('RECEPCIONISTA', 'ENFERMEIRO', 'MEDICO'))
);

CREATE TABLE medico (
  id_profissional INT PRIMARY KEY,
  crm             VARCHAR(20) NOT NULL UNIQUE,
  especialidade   VARCHAR(60),
  FOREIGN KEY (id_profissional) REFERENCES profissional (id_profissional)
);

CREATE TABLE enfermeiro (
  id_profissional INT PRIMARY KEY,
  coren           VARCHAR(20) NOT NULL UNIQUE,
  FOREIGN KEY (id_profissional) REFERENCES profissional (id_profissional)
);

CREATE TABLE atendimento (
  id_atendimento      INT AUTO_INCREMENT PRIMARY KEY,
  numero_atendimento  VARCHAR(10)  UNIQUE,
  id_paciente         INT          NOT NULL,
  id_recepcionista    INT          NOT NULL,
  dt_chegada          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status              VARCHAR(20)  NOT NULL DEFAULT 'AGUARDANDO_TRIAGEM',
  observacao          VARCHAR(500),
  dt_cancelamento     DATETIME,
  motivo_cancelamento VARCHAR(200),
  FOREIGN KEY (id_paciente)      REFERENCES paciente (id_paciente),
  FOREIGN KEY (id_recepcionista) REFERENCES profissional (id_profissional),
  CHECK (status IN ('AGUARDANDO_TRIAGEM', 'AGUARDANDO_MEDICO', 'EM_ATENDIMENTO',
                    'FINALIZADO', 'CANCELADO'))
);

CREATE TABLE triagem (
  id_triagem          INT AUTO_INCREMENT PRIMARY KEY,
  id_atendimento      INT          NOT NULL UNIQUE,
  id_enfermeiro       INT          NOT NULL,
  pressao_sistolica   INT          NOT NULL,
  pressao_diastolica  INT          NOT NULL,
  temperatura         DECIMAL(4,1) NOT NULL,
  frequencia_cardiaca INT          NOT NULL,
  queixas             VARCHAR(500) NOT NULL,
  classificacao       VARCHAR(10)  NOT NULL,
  dt_triagem          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  FOREIGN KEY (id_enfermeiro)  REFERENCES enfermeiro (id_profissional),
  CHECK (classificacao IN ('Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'))
);

CREATE TABLE prontuario (
  id_prontuario   INT AUTO_INCREMENT PRIMARY KEY,
  id_atendimento  INT           NOT NULL UNIQUE,
  id_medico       INT           NOT NULL,
  dt_inicio       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dt_fim          DATETIME,
  diagnostico     VARCHAR(500),
  observacao      VARCHAR(1000),
  FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  FOREIGN KEY (id_medico)      REFERENCES medico (id_profissional)
);

CREATE TABLE prescricao (
  id_prescricao     INT AUTO_INCREMENT PRIMARY KEY,
  id_prontuario     INT          NOT NULL,
  medicamento       VARCHAR(100) NOT NULL,
  dosagem           VARCHAR(50)  NOT NULL,
  via_administracao VARCHAR(20)  NOT NULL,
  frequencia        VARCHAR(50),
  dt_prescricao     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dt_administracao  DATETIME,
  FOREIGN KEY (id_prontuario) REFERENCES prontuario (id_prontuario)
);

CREATE VIEW vw_painel_atendimento AS
SELECT a.id_atendimento,
       a.numero_atendimento,
       a.status,
       p.nome AS paciente,
       p.data_nascimento,
       TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE()) AS idade,
       t.classificacao,
       CASE t.classificacao
         WHEN 'Vermelho' THEN 1
         WHEN 'Laranja'  THEN 2
         WHEN 'Amarelo'  THEN 3
         WHEN 'Verde'    THEN 4
         ELSE 5
       END AS prioridade,
       CASE t.classificacao
         WHEN 'Vermelho' THEN 0
         WHEN 'Laranja'  THEN 10
         WHEN 'Amarelo'  THEN 60
         WHEN 'Verde'    THEN 120
         ELSE 240
       END AS tempo_max_espera_min,
       t.queixas,
       t.dt_triagem,
       TIMESTAMPDIFF(MINUTE, t.dt_triagem, NOW()) AS minutos_espera
  FROM atendimento a
  JOIN paciente p ON p.id_paciente    = a.id_paciente
  JOIN triagem t  ON t.id_atendimento = a.id_atendimento
 WHERE a.status IN ('AGUARDANDO_MEDICO', 'EM_ATENDIMENTO');

CREATE VIEW vw_historico_paciente AS
SELECT p.id_paciente,
       p.nome AS paciente,
       p.cpf,
       a.numero_atendimento,
       a.dt_chegada,
       a.status,
       t.classificacao,
       t.queixas,
       pe.nome AS enfermeiro,
       pm.nome AS medico,
       m.crm,
       pr.diagnostico,
       pr.observacao,
       pr.dt_fim AS dt_alta
  FROM paciente p
  JOIN atendimento a        ON a.id_paciente      = p.id_paciente
  LEFT JOIN triagem t       ON t.id_atendimento   = a.id_atendimento
  LEFT JOIN profissional pe ON pe.id_profissional = t.id_enfermeiro
  LEFT JOIN prontuario pr   ON pr.id_atendimento  = a.id_atendimento
  LEFT JOIN medico m        ON m.id_profissional  = pr.id_medico
  LEFT JOIN profissional pm ON pm.id_profissional = m.id_profissional;
