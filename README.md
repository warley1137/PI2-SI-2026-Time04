# Sistema de Atendimento de Pronto Socorro

**Projeto Integrador 2 — PUC-Campinas**

## 1. Introdução

O **Sistema de Atendimento de Pronto Socorro** controla os atendimentos de um Pronto Socorro, da chegada do paciente na recepção até a alta médica. O sistema tem três etapas:

1. **Recepção:** cadastro do paciente e abertura do atendimento.
2. **Triagem:** sinais vitais, queixas e classificação de risco pelo Protocolo de Manchester.
3. **Atendimento Médico:** consulta, medicações e alta.

---

## 2. Requisitos Gerais

| ID | Requisito | Descrição |
|---|---|---|
| RG01 | Objetivo | Informatizar e controlar o fluxo de atendimento de um Pronto Socorro, da recepção à alta. |
| RG02 | Plataforma | Aplicação Web, com Front-End e Back-End separados e banco de dados relacional. |
| RG03 | Usuários | Três perfis: Recepção, Enfermagem e Médico. |
| RG04 | Número de atendimento | Cada atendimento tem um número único e automático, que liga as três etapas. |
| RG05 | Prioridade | A fila do médico segue a classificação do Protocolo de Manchester. |
| RG06 | Escopo | Projeto acadêmico, sem integração com sistemas externos (prontuário eletrônico, SUS, convênios). |

---

## 3. Requisitos Funcionais

### 3.1 Recepção

| ID | Requisito | Descrição |
|---|---|---|
| RF01 | Cadastrar paciente | Cadastrar paciente com nome completo, endereço, RG, CPF, nome do pai, nome da mãe e data de nascimento. |
| RF02 | Gerar número de atendimento | Gerar automaticamente um número único para cada atendimento (ex.: AT0001). |
| RF03 | Incluir atendimento | Registrar um novo atendimento para um paciente cadastrado. |
| RF04 | Alterar atendimento | Alterar os dados de um atendimento ainda não confirmado pelo médico. |
| RF05 | Consultar atendimento | Consultar os atendimentos cadastrados. |
| RF06 | Cancelar atendimento | Cancelar um atendimento ainda não confirmado pelo médico. |

### 3.2 Triagem (Enfermagem)

| ID | Requisito | Descrição |
|---|---|---|
| RF07 | Registrar sinais vitais | Registrar pressão arterial, temperatura corporal e batimentos cardíacos. |
| RF08 | Registrar queixas | Registrar as queixas do paciente (ex.: dor de cabeça, náusea, dor muscular, suor excessivo). |
| RF09 | Classificar atendimento | Classificar o atendimento pelo Protocolo de Manchester (seção 5). |
| RF10 | Vincular triagem ao atendimento | Associar a triagem ao número de atendimento gerado na recepção. |

### 3.3 Atendimento Médico

| ID | Requisito | Descrição |
|---|---|---|
| RF11 | Acessar atendimento | Acessar os dados de um atendimento (sinais vitais, queixas e classificação). |
| RF12 | Registrar medicações | Registrar as medicações prescritas e administradas. |
| RF13 | Confirmar atendimento | Confirmar a finalização do atendimento (alta). |
| RF14 | Painel de Atendimento | Tela com a fila de pacientes ordenada pela classificação de Manchester. |
| RF15 | Dados no painel | Exibir número do atendimento, nome, data de nascimento e classificação de cada paciente. |

### 3.4 Regras do Sistema

| ID | Requisito | Descrição |
|---|---|---|
| RF16 | Bloqueio após confirmação | Depois da confirmação do médico, o atendimento não pode ser alterado nem cancelado. |
| RF17 | Ordem da fila | A fila segue a prioridade de Manchester e, em caso de empate, a ordem de chegada. |

---

## 4. Requisitos Não Funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RNF01 | Arquitetura Web | Separação entre Front-End e Back-End. |
| RNF02 | Banco de dados relacional | Armazenamento das informações em banco relacional. |
| RNF03 | Integração das interfaces | O Back-End conecta as interfaces de Recepção, Triagem e Médico. |
| RNF04 | Interfaces simples | Interfaces simples e objetivas, adequadas ao ritmo de um pronto atendimento. |
| RNF05 | Integridade dos dados | Garantir a integridade entre paciente, atendimento, triagem e registro médico. |
| RNF06 | Consistência do fluxo | Impedir que uma etapa ocorra sem que a anterior tenha sido registrada. |
| RNF07 | Autenticação e perfis | Acesso por login e senha, e cada perfil acessa só as funções do seu módulo. |
| RNF08 | Proteção de dados | Dados pessoais e de saúde tratados conforme a LGPD, com senhas criptografadas. |
| RNF09 | Desempenho | Consultas e operações comuns respondem em até 3 segundos, em condições normais. |
| RNF10 | Validação de dados | Validar os dados de entrada (CPF, datas e campos obrigatórios). |

---

## 5. Regras de Negócio

- Um paciente pode ter vários atendimentos, e cada atendimento pertence a um único paciente.
- O número de atendimento é gerado pelo sistema e não pode ser editado.
- A triagem só pode ser registrada para atendimentos abertos e não cancelados.
- O atendimento médico só ocorre depois da triagem e da classificação.
- Atendimentos cancelados não entram na fila do médico.

### Classificação de Manchester

| Cor | Prioridade | Tempo máximo de espera |
|---|---|---|
| Vermelho | Emergência | Imediato |
| Laranja | Muito urgente | 10 minutos |
| Amarelo | Urgente | 60 minutos |
| Verde | Pouco urgente | 120 minutos |
| Azul | Não urgente | 240 minutos |

---

## 6. Fluxo do Atendimento

```
Recepção                Triagem                    Médico
Abre atendimento  -->   Sinais vitais e queixas -> Acessa atendimento
(AT0001)                Classifica (Manchester)    Registra medicações
                                                   Confirma (alta)

Status: Aguardando triagem -> Aguardando atendimento -> Finalizado
        (Cancelado, somente antes da confirmação médica)
```

---

## 7. Estrutura do Sistema (Componentes)

### 7.1 Front-End

- **Interface da Recepção:** inclusão, alteração, consulta e cancelamento de atendimentos.
- **Interface da Triagem (Enfermagem):** inclusão dos dados de triagem do atendimento.
- **Interfaces do Médico:** Painel de Atendimentos + interface para lançamento de medicações e confirmação da consulta.

### 7.2 Back-End

Camada responsável por conectar todas as interfaces (fronts) e gerenciar a obtenção/persistência dos dados no banco.

### 7.3 Banco de Dados

- Deve conter tabelas para: paciente, atendimento, triagem e demais informações necessárias ao funcionamento do processo.
- Modelagem (relacional) a ser definida pela equipe.

---

## 8. Atores do Sistema

| Ator | Responsabilidades |
|---|---|
| Recepção | Cadastro, alteração, consulta e cancelamento de atendimentos. |
| Enfermagem | Registro de sinais vitais, queixas e classificação de Manchester (triagem). |
| Médico | Consulta ao atendimento, registro de medicações, confirmação do atendimento e uso do Painel de Atendimento. |

---

## 9. Fora de Escopo (não mencionado no descritivo)

- Requisitos de segurança/autenticação de usuários não foram detalhados no escopo original — recomenda-se que a equipe defina esse requisito adicionalmente.
- Requisitos de desempenho, volumetria e disponibilidade não foram especificados — sugere-se definição pela equipe conforme necessidade do projeto acadêmico.
