CREATE DATABASE IF NOT EXISTS pronto_socorro;
USE pronto_socorro;

DROP VIEW  IF EXISTS vw_painel_atendimento;
DROP TABLE IF EXISTS prescricao;
DROP TABLE IF EXISTS medicamento;
DROP TABLE IF EXISTS triagem_queixa;
DROP TABLE IF EXISTS queixa;
DROP TABLE IF EXISTS triagem;
DROP TABLE IF EXISTS classificacao_risco;
DROP TABLE IF EXISTS etapa_atendimento;
DROP TABLE IF EXISTS atendimento;
DROP TABLE IF EXISTS paciente;
DROP TABLE IF EXISTS profissional;
DROP TABLE IF EXISTS funcao_servico;
DROP TABLE IF EXISTS servico;
DROP TABLE IF EXISTS funcao;

CREATE TABLE funcao (
  id_funcao INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE servico (
  id_servico INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(50) NOT NULL UNIQUE,
  descricao  VARCHAR(200)
);

CREATE TABLE funcao_servico (
  id_funcao  INT NOT NULL,
  id_servico INT NOT NULL,
  PRIMARY KEY (id_funcao, id_servico),
  FOREIGN KEY (id_funcao)  REFERENCES funcao (id_funcao),
  FOREIGN KEY (id_servico) REFERENCES servico (id_servico)
);

CREATE TABLE profissional (
  id_profissional   INT AUTO_INCREMENT PRIMARY KEY,
  nome              VARCHAR(100) NOT NULL,
  cpf               CHAR(11)     NOT NULL UNIQUE,
  registro_conselho VARCHAR(20),
  login             VARCHAR(30)  NOT NULL UNIQUE,
  senha_hash        VARCHAR(255) NOT NULL,
  ativo             BOOLEAN      NOT NULL DEFAULT TRUE,
  id_funcao         INT          NOT NULL,
  FOREIGN KEY (id_funcao) REFERENCES funcao (id_funcao)
);

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

CREATE TABLE atendimento (
  id_atendimento      INT AUTO_INCREMENT PRIMARY KEY,
  numero_atendimento  VARCHAR(10)  UNIQUE,
  id_paciente         INT          NOT NULL,
  dt_chegada          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status              VARCHAR(20)  NOT NULL DEFAULT 'AGUARDANDO_TRIAGEM',
  observacao          VARCHAR(500),
  dt_confirmacao      DATETIME,
  dt_cancelamento     DATETIME,
  motivo_cancelamento VARCHAR(200),
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente),
  CHECK (status IN ('AGUARDANDO_TRIAGEM', 'AGUARDANDO_MEDICO', 'EM_ATENDIMENTO',
                    'FINALIZADO', 'CANCELADO'))
);

CREATE TABLE etapa_atendimento (
  id_etapa        INT AUTO_INCREMENT PRIMARY KEY,
  id_atendimento  INT      NOT NULL,
  id_servico      INT      NOT NULL,
  id_profissional INT      NOT NULL,
  dt_inicio       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dt_fim          DATETIME,
  observacao      VARCHAR(500),
  UNIQUE (id_atendimento, id_servico),
  FOREIGN KEY (id_atendimento)  REFERENCES atendimento (id_atendimento),
  FOREIGN KEY (id_servico)      REFERENCES servico (id_servico),
  FOREIGN KEY (id_profissional) REFERENCES profissional (id_profissional)
);

CREATE TABLE classificacao_risco (
  id_classificacao     INT AUTO_INCREMENT PRIMARY KEY,
  cor                  VARCHAR(20) NOT NULL UNIQUE,
  descricao            VARCHAR(50) NOT NULL,
  prioridade           INT         NOT NULL UNIQUE,
  tempo_max_espera_min INT         NOT NULL
);

CREATE TABLE triagem (
  id_triagem          INT AUTO_INCREMENT PRIMARY KEY,
  id_atendimento      INT          NOT NULL UNIQUE,
  pressao_sistolica   INT          NOT NULL,
  pressao_diastolica  INT          NOT NULL,
  temperatura         DECIMAL(4,1) NOT NULL,
  frequencia_cardiaca INT          NOT NULL,
  id_classificacao    INT          NOT NULL,
  outras_queixas      VARCHAR(500),
  dt_triagem          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_atendimento)   REFERENCES atendimento (id_atendimento),
  FOREIGN KEY (id_classificacao) REFERENCES classificacao_risco (id_classificacao)
);

CREATE TABLE queixa (
  id_queixa INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE triagem_queixa (
  id_triagem INT NOT NULL,
  id_queixa  INT NOT NULL,
  PRIMARY KEY (id_triagem, id_queixa),
  FOREIGN KEY (id_triagem) REFERENCES triagem (id_triagem),
  FOREIGN KEY (id_queixa)  REFERENCES queixa (id_queixa)
);

CREATE TABLE medicamento (
  id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(100) NOT NULL,
  apresentacao   VARCHAR(60)  NOT NULL,
  UNIQUE (nome, apresentacao)
);

CREATE TABLE prescricao (
  id_prescricao     INT AUTO_INCREMENT PRIMARY KEY,
  id_atendimento    INT         NOT NULL,
  id_medicamento    INT         NOT NULL,
  dosagem           VARCHAR(50) NOT NULL,
  via_administracao VARCHAR(20) NOT NULL,
  frequencia        VARCHAR(50),
  dt_prescricao     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dt_administracao  DATETIME,
  FOREIGN KEY (id_atendimento) REFERENCES atendimento (id_atendimento),
  FOREIGN KEY (id_medicamento) REFERENCES medicamento (id_medicamento)
);

CREATE VIEW vw_painel_atendimento AS
SELECT a.id_atendimento,
       a.numero_atendimento,
       a.status,
       p.nome            AS paciente,
       p.data_nascimento,
       TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE()) AS idade,
       c.cor             AS classificacao,
       c.prioridade,
       c.tempo_max_espera_min,
       t.dt_triagem,
       TIMESTAMPDIFF(MINUTE, t.dt_triagem, NOW())        AS minutos_espera
  FROM atendimento a
  JOIN paciente p            ON p.id_paciente      = a.id_paciente
  JOIN triagem t             ON t.id_atendimento   = a.id_atendimento
  JOIN classificacao_risco c ON c.id_classificacao = t.id_classificacao
 WHERE a.status IN ('AGUARDANDO_MEDICO', 'EM_ATENDIMENTO');
