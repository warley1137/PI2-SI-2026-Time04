# Sistema de Atendimento de Pronto Socorro — PI 2

Sistema web com três partes que conversam entre si:

```
 NAVEGADOR (front-end)          SERVIDOR (back-end)              BANCO (MySQL)
 public/  HTML+CSS+JS   ──────▶  src/  Node.js + Express  ──────▶  pronto_socorro
 telas, formulários     fetch    rotas /api/...           SQL      tabelas e views
                        JSON     valida, aplica regras    mysql2
                       ◀──────   devolve JSON            ◀──────
```

- **Front-end** (`public/`): o que o usuário vê. Não acessa o banco; só chama a API com `fetch`.
- **Back-end** (`src/`): recebe os pedidos do front (ex.: `POST /api/triagem`), confere login e permissão, valida os dados, executa o SQL no MySQL e devolve a resposta em JSON.
- **Banco** (`banco-de-dados/`): guarda os dados. São os mesmos scripts que já estão no GitHub.

O mesmo servidor entrega as telas e a API, então só existe um endereço: **http://localhost:3000**.

---

## 1. O que instalar (uma vez só)

| Programa | Para quê | Onde baixar |
|---|---|---|
| **Node.js** (versão LTS) | Roda o back-end | https://nodejs.org (botão “LTS”) |
| **MySQL 8 + Workbench** | O banco (você já tem) | https://dev.mysql.com/downloads/installer |
| **VS Code** | Abrir e editar o projeto | https://code.visualstudio.com |
| **Insomnia** | Testar a API sem a tela | https://insomnia.rest/download |

Depois de instalar o Node, feche e abra o VS Code e confira no terminal:

```bash
node -v
npm -v
```

Se aparecerem números de versão, está tudo certo.

---

## 2. Rodar o projeto (passo a passo)

### 2.1 Criar o banco
No **MySQL Workbench**, abra e execute (raio ⚡) nesta ordem:
1. `banco-de-dados/01_criacao_tabelas.sql`
2. `banco-de-dados/02_dados_iniciais.sql`

### 2.2 Abrir no VS Code
`File > Open Folder…` e escolha a pasta `pronto-socorro`.
Abra o terminal em `Terminal > New Terminal`.

### 2.3 Configurar a senha do MySQL
Faça uma cópia do arquivo `.env.example` e dê a ela o nome **`.env`**. Pode copiar e colar no VS Code e renomear, ou usar o comando:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# Mac/Linux
cp .env.example .env
```

Abra o `.env` e troque `DB_PASSWORD` pela senha do seu MySQL (a mesma do Workbench).

> O `.env` **não vai para o GitHub** (está no `.gitignore`), porque tem a sua senha.

### 2.4 Instalar as dependências

```bash
npm install
```

Esse comando cria a pasta `node_modules` com o Express, o mysql2 e o dotenv.

### 2.5 Criar as senhas dos usuários

```bash
npm run senhas
```

O script mostra cada profissional do banco e pede uma senha para ele (duas vezes, para confirmar). O que você digita **não aparece na tela**, como em qualquer senha. Regras: pelo menos 6 caracteres, diferente do login e nada óbvio como `123456`.

- A senha é gravada **criptografada (hash)** na coluna `senha_hash`; ninguém consegue ler a senha real no banco.
- Quem já tem senha: aperte **Enter** para manter a atual.
- Para trocar a senha de uma pessoa só: `npm run senhas -- carla.med NovaSenha@1`.
- Se rodar o script 02 de novo, as senhas voltam para `PENDENTE` e é preciso rodar `npm run senhas` outra vez.

### 2.6 Ligar o servidor

```bash
npm start
```

Deve aparecer `Servidor rodando em http://localhost:3000`. Deixe esse terminal aberto; para desligar o servidor, use `Ctrl + C`.

### 2.7 Usar o sistema
Abra **http://localhost:3000** no navegador.

| Login | Perfil | Telas |
|---|---|---|
| `ana.recepcao` | Recepcionista | Recepção, Atendimentos, Histórico |
| `bruno.enf` | Enfermeiro | Triagem, Painel, Histórico |
| `carla.med` | Médico | Painel, Meu atendimento, Histórico |

A senha de cada um é a que você definiu no passo 2.5.

**Fluxo completo para demonstrar:**
1. Entre como **ana.recepcao**. Cadastre um paciente, clique em **Abrir atendimento** e anote o número (ex.: AT0008).
2. Saia e entre como **bruno.enf**. Clique no paciente na fila, preencha os sinais vitais, escolha a cor e conclua.
3. Saia e entre como **carla.med**. O paciente aparece no **Painel**, ordenado pela cor. Clique em **Chamar**, prescreva uma medicação e depois **Confirme e finalize**.
4. Em **Histórico**, busque o CPF: aparecem todas as visitas, com diagnóstico e medicações.

> Para conferir no banco, rode no Workbench, por exemplo, `SELECT * FROM atendimento;`.

---

## 3. Testar a API no Insomnia

O Insomnia faz o papel do front: manda pedidos para o back-end e mostra a resposta. Assim dá para testar o back-end mesmo sem nenhuma tela pronta.

1. Com o servidor ligado (`npm start`), abra o Insomnia.
2. Vá em **Import** (ou `Create > Import`) e escolha `insomnia/pronto-socorro-insomnia.json`.
3. Rode **0 - Teste de conexão > Saúde**. A resposta deve ser `{"api":"ok","banco":"ok",...}`.
4. **Coloque as senhas no ambiente do Insomnia:** clique no ambiente (**Base Environment**, ao lado do nome da coleção) e troque `senha_recepcao`, `senha_enfermeiro` e `senha_medico` pelas senhas que você definiu no passo 2.5. Todas as requisições de login usam esses valores.
   Cada pasta começa com um **» Login** do perfil certo. Rode-o primeiro; o Insomnia guarda o cookie de login sozinho.
5. Rode as requisições **de cima para baixo**, pasta por pasta (2 → 3 → 4 → 5). Elas seguem o fluxo real: cadastrar, abrir AT0008, triagem, médico, finalizar.
6. A pasta **6 - Testes de erro** mostra o sistema recusando dados errados.

**Como ler a resposta** (o número aparece no canto do Insomnia):

| Código | Significado | Exemplo |
|---|---|---|
| 200 / 201 | Deu certo (201 = criou algo) | paciente cadastrado |
| 400 | Dado inválido | CPF errado, pressão invertida |
| 401 | Não está logado | faltou fazer login |
| 403 | Logado, mas sem permissão | enfermeiro tentando cadastrar paciente |
| 404 | Não encontrado | id que não existe |
| 409 | A ação não pode ser feita agora | cancelar um atendimento já finalizado |
| 500 | Erro no servidor | geralmente senha errada no `.env` |

> Os ids dos exemplos (7, 8…) valem para o banco recém-criado. Se você cadastrar outras coisas antes, troque o número na URL.

---

## 4. Organização das pastas

```
pronto-socorro/
├── banco-de-dados/          scripts SQL e DER (a sua parte)
├── src/                     BACK-END
│   ├── server.js            liga o servidor e junta as rotas
│   ├── db.js                conexão com o MySQL (lê o .env) + função de transação
│   ├── auth.js              senha criptografada, login por cookie, permissão por função
│   ├── validacoes.js        confere CPF, datas, sinais vitais, cores
│   ├── erros.js             transforma erros em respostas 400/401/403/404/409/500
│   └── routes/              uma rota para cada etapa do atendimento
│       ├── auth.routes.js          login / logout
│       ├── pacientes.routes.js     cadastro, busca e histórico
│       ├── atendimentos.routes.js  abrir, listar, alterar, cancelar
│       ├── triagem.routes.js       fila e classificação de Manchester
│       └── medico.routes.js        painel, chamar, prescrição, finalizar
├── public/                  FRONT-END
│   ├── index.html           todas as telas (só uma aparece por vez)
│   ├── css/style.css
│   └── js/
│       ├── api.js           função que chama o back-end + utilidades
│       ├── app.js           login, menu por perfil, troca de telas
│       ├── recepcao.js      telas Recepção e Atendimentos
│       ├── triagem.js       tela Triagem
│       ├── medico.js        Painel e Atendimento médico
│       └── historico.js     Histórico do paciente
├── scripts/definir-senhas.js
├── insomnia/pronto-socorro-insomnia.json
├── package.json             nome do projeto, dependências e comandos (npm start)
├── .env.example             modelo de configuração
└── .gitignore
```

---

## 5. Rotas da API (contrato entre front e back)

Todas começam com `/api`. As rotas marcadas com 🔒 exigem login; o perfil indicado é o único que pode usá-las.

| Método | Rota | Quem | O que faz |
|---|---|---|---|
| GET | `/saude` | — | Testa se API e banco estão ok |
| POST | `/login` | — | Entra no sistema `{login, senha}` |
| POST | `/logout` | — | Sai |
| GET | `/me` | 🔒 todos | Quem está logado |
| GET | `/pacientes?busca=` | 🔒 todos | Busca por nome ou CPF |
| GET | `/pacientes/:id` | 🔒 todos | Dados do paciente |
| POST | `/pacientes` | 🔒 recepção | Cadastra paciente |
| PUT | `/pacientes/:id` | 🔒 recepção | Altera cadastro |
| GET | `/pacientes/:id/historico` | 🔒 todos | Visitas + medicações (view `vw_historico_paciente`) |
| GET | `/atendimentos?status=&numero=&hoje=1` | 🔒 todos | Lista com filtros |
| GET | `/atendimentos/:id` | 🔒 todos | Atendimento completo |
| POST | `/atendimentos` | 🔒 recepção | Abre atendimento e gera o número ATxxxx |
| PUT | `/atendimentos/:id` | 🔒 recepção | Altera observação (antes de finalizar) |
| POST | `/atendimentos/:id/cancelar` | 🔒 recepção | Cancela (antes da confirmação do médico) |
| GET | `/triagem/fila` | 🔒 enfermeiro | Quem aguarda triagem |
| POST | `/triagem` | 🔒 enfermeiro | Grava sinais vitais + cor e envia ao painel |
| GET | `/triagem/:idAtendimento` | 🔒 todos | Dados da triagem |
| PUT | `/triagem/:idAtendimento/classificacao` | 🔒 enf./médico | Reclassifica a cor |
| GET | `/painel` | 🔒 enf./médico | Painel por prioridade (view `vw_painel_atendimento`) |
| POST | `/atendimentos/:id/chamar` | 🔒 médico | Inicia o atendimento e abre o prontuário |
| GET | `/meus-atendimentos` | 🔒 médico | Atendimentos em andamento do médico |
| GET | `/atendimentos/:id/prescricoes` | 🔒 todos | Medicações do atendimento |
| POST | `/atendimentos/:id/prescricoes` | 🔒 médico | Registra medicação |
| PATCH | `/prescricoes/:id/administrar` | 🔒 enf./médico | Marca como administrada |
| DELETE | `/prescricoes/:id` | 🔒 médico | Remove medicação não administrada |
| POST | `/atendimentos/:id/finalizar` | 🔒 médico | Confirma o atendimento `{diagnostico, observacao}` |

---

## 6. Como uma ação percorre o sistema (exemplo: triagem)

1. **Tela** (`public/js/triagem.js`): o enfermeiro preenche o formulário e clica em *Concluir triagem*. O JS chama:
   ```js
   api('POST', '/triagem', { id_atendimento: 8, pressao_sistolica: 135, ..., classificacao: 'Laranja' })
   ```
2. **Rota** (`src/routes/triagem.routes.js`): `exigirLogin('ENFERMEIRO')` confere o cookie. Quem não está logado recebe 401; quem não é enfermeiro recebe 403.
3. **Validação** (`src/validacoes.js`): a sistólica tem que ser maior que a diastólica, a temperatura tem que estar entre 30 e 45, e a cor tem que estar na lista. Se algo falhar, a resposta é 400.
4. **Banco** (`transacao` em `src/db.js`): dois comandos rodam juntos, e se um falhar nenhum vale:
   ```sql
   INSERT INTO triagem (...) SELECT ... FROM atendimento
    WHERE id_atendimento = ? AND status = 'AGUARDANDO_TRIAGEM';
   UPDATE atendimento SET status = 'AGUARDANDO_MEDICO' WHERE id_atendimento = ?;
   ```
   Se o atendimento não estava aguardando triagem, nada é inserido (`affectedRows = 0`) e a resposta é 409.
5. **Resposta**: o servidor devolve JSON com código 201. A tela mostra o aviso e atualiza a fila, e o paciente passa a aparecer no **Painel**.

O `?` no SQL é preenchido pelo mysql2 com os valores enviados. Isso evita SQL Injection, porque o texto digitado nunca vira comando.

---

## 7. Regras que o back-end garante

- **Ordem do atendimento**: `AGUARDANDO_TRIAGEM → AGUARDANDO_MEDICO → EM_ATENDIMENTO → FINALIZADO`, com `CANCELADO` possível antes de finalizar. Cada `UPDATE` só funciona se o status atual for o esperado.
- **Um atendimento aberto por paciente**: abrir um segundo dá 409 e mostra o número do que já está aberto.
- **Permissão por função**: recepção cadastra, enfermeiro faz a triagem, médico prescreve e finaliza.
- **Prontuário do médico**: só o médico que chamou o paciente pode prescrever e finalizar.
- **Medicação já administrada** não pode ser removida.
- **Senha** guardada com hash (`scrypt`), nunca em texto puro. O login fica em um cookie assinado (HttpOnly) que vale por 8 horas.
- **Transações** nas etapas que mexem em mais de uma tabela: abrir, cancelar, triagem, chamar e finalizar.

---

## 8. Problemas comuns

| Mensagem | Causa e solução |
|---|---|
| `'node' não é reconhecido` | Node não instalado, ou o VS Code foi aberto antes da instalação. Reinicie o VS Code. |
| `Não foi possível conectar ao banco… Confira o .env` | Senha errada no `.env`, MySQL desligado, ou o arquivo ficou como `.env.txt`. |
| `ER_BAD_DB_ERROR` / banco não existe | Rode o `01_criacao_tabelas.sql` no Workbench. |
| `Login ou senha incorretos` | Confira a senha que você definiu, ou rode `npm run senhas` para criar uma nova. |
| `EADDRINUSE :3000` | O servidor já está rodando em outro terminal. Feche-o ou troque `PORT` no `.env`. |
| Mudei o código e nada mudou | Pare (`Ctrl + C`) e rode `npm start` de novo, ou use `npm run dev`, que reinicia sozinho. No front, basta atualizar a página. |

---

## 9. Tecnologias

- **Node.js + Express**: servidor e rotas REST.
- **mysql2**: conexão com o MySQL (pool de conexões, parâmetros `?`, transações).
- **dotenv**: lê o arquivo `.env`.
- **crypto** (nativo do Node): hash de senha e assinatura do cookie.
- **HTML, CSS e JavaScript puro** no front: `fetch` para chamar a API, sem frameworks.
