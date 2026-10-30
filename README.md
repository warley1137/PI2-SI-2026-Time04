# Pronto Socorro · Projeto Integrador 2

Sistema de atendimento de pronto socorro com recepção, triagem e atendimento médico. O visual é feito em HTML, CSS e JavaScript no navegador, e um servidor Node.js pequeno (`server.js`) faz a ponte com o banco MySQL.

## O que você precisa ter
- Node.js (versão 18 ou superior). Se não tiver, veja o passo 1.
- MySQL e MySQL Workbench instalados e rodando.
- Um editor como o VS Code (opcional, mas ajuda).

## Passo a passo

### 1. Instalar o Node.js (se ainda não tiver)
1. Para saber se já tem, abra o terminal e digite `node -v`. Se aparecer um número de versão, pule para o passo 2.
2. Baixe em https://nodejs.org a versão **LTS** (botão verde) e instale clicando em "Next" até o fim, deixando as opções padrão.
3. **Feche o VS Code (ou o terminal) por completo e abra de novo.** Sem isso, o terminal não enxerga o Node recém-instalado.
4. Confirme com `node -v` e `npm -v`. Os dois devem mostrar uma versão.

**Windows: erro "a execução de scripts foi desabilitada neste sistema"**
Se o PowerShell bloquear o `npm`, rode uma vez:
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Responda `S` se ele perguntar. Outra opção é usar `npm.cmd` no lugar de `npm` (por exemplo, `npm.cmd install`).

### 2. Criar o banco de dados (tabelas e dados)
As tabelas e os dados iniciais estão no repositório do projeto, na pasta `banco-de-dados`:
https://github.com/warley1137/PI2-SI-2026-Time04

1. Baixe os arquivos da pasta `banco-de-dados` (ou clone o repositório).
2. No MySQL Workbench, abra e execute **primeiro** o `01_criacao_tabelas.sql`.
3. Depois abra e execute o `02_dados_iniciais.sql`.

Atenção: se o `01_criacao_tabelas.sql` recriar o banco (`DROP DATABASE`), rodar de novo apaga todos os dados. Se o seu banco já está pronto e com dados, pule este passo.

A pasta também tem o `DER_pronto_socorro.png` com o diagrama do banco.

### 3. Configurar a conexão com o banco
Abra o arquivo `db.js` e troque as credenciais direto no código:

| Campo      | O que colocar              | Exemplo          |
|------------|----------------------------|------------------|
| `host`     | endereço do servidor MySQL | `127.0.0.1`      |
| `port`     | porta do MySQL             | `3306`           |
| `user`     | usuário do MySQL           | `root`           |
| `password` | senha do MySQL             | sua senha        |
| `database` | nome do schema             | `pronto_socorro` |

### 4. Instalar as dependências
No terminal, dentro da pasta do projeto:
```
npm install
```
Isso cria a pasta `node_modules`. Só precisa fazer uma vez.

### 5. Definir as senhas dos logins
Os profissionais ficam na tabela `profissional`. Se a coluna `senha_hash` estiver como `PENDENTE`, ninguém consegue entrar ainda. Defina as senhas (troque `1234` pela que quiser):
```
node definir-senha.js ana.recepcao 1234
node definir-senha.js bruno.enf 1234
node definir-senha.js carla.med 1234
```
Para definir a mesma senha para todos de uma vez:
```
node definir-senha.js --todos 1234
```
O `login` é o valor da coluna `login` da tabela `profissional`. Esse script usa as credenciais do `db.js`, então elas só precisam ser trocadas em um lugar.

### 6. Iniciar o sistema
```
npm start
```
O terminal deve mostrar `Banco conectado.` e `Abra http://localhost:3000`. Deixe esse terminal aberto enquanto usa o site e abra o endereço no navegador. Para parar, use `Ctrl + C`.

## Login por perfil
- **Recepção** só acessa a aba Recepção (cadastro de paciente e abertura de atendimento).
- **Enfermagem** só acessa a aba Triagem.
- **Médico** só acessa a aba Médico (atendimento, prescrição e finalização).
- **Painel de espera** e **Prontuário** abrem para qualquer perfil logado.
- A sessão dura 8 horas. O servidor também bloqueia o acesso, então não adianta tentar abrir a aba de outro perfil.

## Estrutura do projeto
```
pronto-socorro/
├── server.js          servidor e rotas
├── db.js              conexão com o MySQL (troque as credenciais aqui)
├── auth.js            criptografia das senhas
├── definir-senha.js   define a senha de um login
├── package.json
└── public/            site: index.html, style.css, app.js
```

## Problemas comuns
- **"NetworkError when attempting to fetch resource":** o servidor não está rodando, ou você abriu o `index.html` direto. Rode `npm start` e acesse `http://localhost:3000`.
- **"Não foi possível conectar ao banco":** confira as credenciais no `db.js` e se o MySQL está ligado.
- **`ER_ACCESS_DENIED_ERROR`:** usuário ou senha do banco errados no `db.js`.
- **`ER_BAD_DB_ERROR`:** o schema informado em `database` não existe. Rode o `01_criacao_tabelas.sql` (passo 2).
- **"Este login ainda não tem senha":** rode o `definir-senha.js` (passo 5).
- **`EADDRINUSE`:** a porta 3000 já está em uso. Feche o outro terminal que está rodando o projeto.
- **`'npm' não é reconhecido`:** o Node não está instalado, ou o terminal não foi reaberto depois da instalação (passo 1).
- **Mudou o `db.js` ou o `server.js`?** Pare o servidor com `Ctrl + C` e rode `npm start` de novo.