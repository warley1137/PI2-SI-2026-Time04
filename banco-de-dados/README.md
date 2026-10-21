# Banco de Dados

MySQL 8. Modelo com 6 tabelas: paciente, atendimento, profissional, prontuario, triagem (com classificação de Manchester) e prescricao.

![DER](DER_pronto_socorro.png)

## Execução

1. `01_criacao_tabelas.sql`: recria o banco `pronto_socorro`, as tabelas e a view do painel.
2. `02_dados_iniciais.sql`: insere profissionais, pacientes e alguns atendimentos de teste.

## Status do atendimento

`AGUARDANDO_TRIAGEM` → `AGUARDANDO_MEDICO` → `EM_ATENDIMENTO` → `FINALIZADO` (ou `CANCELADO` antes da finalização)
