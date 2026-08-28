# Documento de Requisitos
## Sistema de Atendimento de Pronto Socorro

**Projeto:** Projeto Integrador 2
**Instituição:** PUC-Campinas
**Data:** Agosto de 2026

---

## 1. Introdução

Este documento descreve os requisitos funcionais e não funcionais do **Sistema de Atendimento de Pronto Socorro**, cujo objetivo é controlar os atendimentos realizados em um Pronto Socorro, desde a chegada do paciente na recepção até sua saída após a alta médica. O sistema contempla três etapas do processo de atendimento: **Recepção**, **Triagem** e **Atendimento Médico**.

---

## 2. Requisitos Funcionais

### 2.1 Módulo de Recepção

| ID | Requisito | Descrição |
|---|---|---|
| RF01 | Cadastrar paciente | O sistema deve permitir o cadastro do paciente com dados pessoais: nome completo, endereço, RG, CPF, nome do pai, nome da mãe e data de nascimento. |
| RF02 | Gerar número de atendimento | O sistema deve gerar automaticamente um número único de atendimento para cada novo atendimento cadastrado (ex.: AT0001). |
| RF03 | Incluir atendimento | O sistema deve permitir que a recepção registre um novo atendimento vinculado ao paciente. |
| RF04 | Alterar atendimento | O sistema deve permitir que a recepção altere os dados de um atendimento, desde que ele ainda não tenha sido confirmado pelo médico. |
| RF05 | Consultar atendimento | O sistema deve permitir que a recepção consulte os atendimentos cadastrados. |
| RF06 | Cancelar atendimento | O sistema deve permitir que a recepção cancele um atendimento, desde que ele ainda não tenha sido confirmado pelo médico. |

### 2.2 Módulo de Triagem (Enfermagem)

| ID | Requisito | Descrição |
|---|---|---|
| RF07 | Registrar sinais vitais | O sistema deve permitir o registro de pressão arterial, temperatura corporal e batimentos cardíacos referentes ao atendimento. |
| RF08 | Registrar queixas | O sistema deve permitir o registro das principais queixas do paciente (ex.: dor de cabeça, náusea, enjoo, dor muscular, suor excessivo, etc.). |
| RF09 | Classificar atendimento | O sistema deve permitir que a enfermagem classifique o atendimento do paciente conforme as regras do **Protocolo de Manchester**. |
| RF10 | Vincular triagem ao atendimento | O sistema deve associar os dados da triagem ao número de atendimento gerado na recepção. |

### 2.3 Módulo de Atendimento Médico

| ID | Requisito | Descrição |
|---|---|---|
| RF11 | Acessar atendimento | O sistema deve permitir que o médico acesse os dados de um atendimento específico. |
| RF12 | Registrar medicações | O sistema deve permitir que o médico registre as medicações prescritas/administradas durante o atendimento. |
| RF13 | Confirmar atendimento | O sistema deve permitir que o médico confirme a finalização do atendimento (equivalente à alta). |
| RF14 | Painel de Atendimento | O sistema deve disponibilizar ao médico uma tela ("Painel de Atendimento") que exiba a fila de pacientes ordenada pela classificação de Manchester. |
| RF15 | Exibir dados no painel | O painel de atendimento deve exibir, para cada paciente na fila: número do atendimento, nome do paciente e data de nascimento, entre outros dados relevantes. |

### 2.4 Regras Gerais

| ID | Requisito | Descrição |
|---|---|---|
| RF16 | Bloqueio de edição pós-confirmação | Após a confirmação do atendimento pelo médico, o atendimento não deve mais poder ser alterado ou cancelado pela recepção. |
| RF17 | Ordenação por prioridade | A fila de atendimento exibida ao médico deve respeitar a ordem de prioridade definida pela classificação de Manchester, e não necessariamente a ordem de chegada. |

---

## 3. Requisitos Não Funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RNF01 | Arquitetura Web | O sistema deve ser desenvolvido como uma aplicação Web, com separação entre Front-End e Back-End. |
| RNF02 | Banco de dados relacional | O sistema deve utilizar um banco de dados relacional para armazenamento das informações. |
| RNF03 | Integração Front-End/Back-End | O Back-End deve conectar todas as interfaces (Recepção, Triagem, Médico) para obtenção e persistência dos dados. |
| RNF04 | Usabilidade | As interfaces devem ser simples e objetivas, facilitando o uso pelos profissionais de recepção, enfermagem e médicos em um ambiente de pronto atendimento. |
| RNF05 | Integridade dos dados | O sistema deve garantir a integridade referencial entre paciente, atendimento, triagem e registro médico. |
| RNF06 | Consistência do fluxo | O sistema deve impedir que uma etapa do processo (ex.: triagem, atendimento médico) ocorra sem que a etapa anterior tenha sido registrada. |

---

## 4. Estrutura do Sistema (Componentes)

### 4.1 Front-End
- **Interface da Recepção**: inclusão, alteração, consulta e cancelamento de atendimentos.
- **Interface da Triagem (Enfermagem)**: inclusão dos dados de triagem do atendimento.
- **Interfaces do Médico**: Painel de Atendimentos + interface para lançamento de medicações e confirmação da consulta.

### 4.2 Back-End
- Camada responsável por conectar todas as interfaces (fronts) e gerenciar a obtenção/persistência dos dados no banco.

### 4.3 Banco de Dados
- Deve conter tabelas para: paciente, atendimento, triagem e demais informações necessárias ao funcionamento do processo.
- Modelagem (relacional) a ser definida pela equipe.

---

## 5. Atores do Sistema

| Ator | Responsabilidades |
|---|---|
| Recepção | Cadastro, alteração, consulta e cancelamento de atendimentos. |
| Enfermagem | Registro de sinais vitais, queixas e classificação de Manchester (triagem). |
| Médico | Consulta ao atendimento, registro de medicações, confirmação do atendimento e uso do Painel de Atendimento. |

---

## 6. Fora de Escopo (não mencionado no descritivo)

- Requisitos de segurança/autenticação de usuários não foram detalhados no escopo original — recomenda-se que a equipe defina esse requisito adicionalmente.
- Requisitos de desempenho, volumetria e disponibilidade não foram especificados — sugere-se definição pela equipe conforme necessidade do projeto acadêmico.
