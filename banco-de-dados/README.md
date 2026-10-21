# Banco de Dados

MySQL 8. Modelo com 6 tabelas: paciente, atendimento, profissional, prontuario, triagem (com classificação de Manchester) e prescricao.
<img width="1568" height="1576" alt="DER_pronto_socorro" src="https://github.com/user-attachments/assets/f9935ba1-7321-4ceb-bc5e-c0211d14ad3f" />


## Execução

1. `01_criacao_tabelas.sql`: recria o banco `pronto_socorro`, as tabelas e a view do painel.
2. `02_dados_iniciais.sql`: insere profissionais, pacientes e alguns atendimentos de teste.

## Status do atendimento

`AGUARDANDO_TRIAGEM` → `AGUARDANDO_MEDICO` → `EM_ATENDIMENTO` → `FINALIZADO` (ou `CANCELADO` antes da finalização)
