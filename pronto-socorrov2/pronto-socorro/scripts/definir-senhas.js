require('dotenv').config();
const readline = require('readline');
const { pool } = require('../src/db');
const { hashSenha } = require('../src/auth');

const TAMANHO_MINIMO = 6;

function validarSenha(login, senha) {
  if (senha.length < TAMANHO_MINIMO) return `A senha precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`;
  if (senha.toLowerCase() === login.toLowerCase()) return 'A senha não pode ser igual ao login.';
  if (/^(.)\1+$/.test(senha) || ['123456', '1234567', '12345678', 'senha123', 'abcdef'].includes(senha)) {
    return 'Senha muito fácil. Escolha outra.';
  }
  return null;
}

function perguntarOculto(rl, pergunta) {
  return new Promise((resolve) => {
    rl.escondido = false;
    rl.question(pergunta, (resposta) => {
      rl.escondido = false;
      resolve(resposta);
    });
    rl.escondido = true;
  });
}

async function modoInterativo() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (texto) => {
    if (!rl.escondido) rl.output.write(texto);
    else if (/[\r\n]/.test(texto)) rl.output.write('\n');
  };

  const [profissionais] = await pool.query(
    `SELECT id_profissional, nome, funcao, login, senha_hash = 'PENDENTE' AS pendente
       FROM profissional
      WHERE ativo = TRUE
      ORDER BY id_profissional`
  );
  if (!profissionais.length) {
    console.log('Nenhum profissional ativo no banco. Rode o 02_dados_iniciais.sql antes.');
    rl.close();
    return;
  }

  console.log('\nDefinição de senhas (o que você digita não aparece na tela).');
  console.log(`Mínimo de ${TAMANHO_MINIMO} caracteres. Quem já tem senha: aperte Enter para manter.\n`);

  for (const p of profissionais) {
    const pendente = Boolean(Number(p.pendente));
    console.log(`${p.nome} (${p.funcao}) — login: ${p.login}${pendente ? ' — SEM SENHA' : ''}`);
    while (true) {
      const senha = await perguntarOculto(rl, '  Nova senha: ');
      if (!senha && !pendente) {
        console.log('  Senha mantida.\n');
        break;
      }
      const problema = senha ? validarSenha(p.login, senha) : 'Este usuário ainda não tem senha. Digite uma.';
      if (problema) {
        console.log('  ' + problema);
        continue;
      }
      const confirmacao = await perguntarOculto(rl, '  Repita a senha: ');
      if (confirmacao !== senha) {
        console.log('  As senhas não conferem. Tente de novo.');
        continue;
      }
      await pool.query('UPDATE profissional SET senha_hash = ? WHERE id_profissional = ?', [hashSenha(senha), p.id_profissional]);
      console.log('  Senha gravada (em hash).\n');
      break;
    }
  }
  rl.close();
  console.log('Pronto! Agora rode: npm start');
}

async function modoDireto(login, senha) {
  const problema = validarSenha(login, senha);
  if (problema) {
    console.log(problema);
    return;
  }
  const [r] = await pool.query('UPDATE profissional SET senha_hash = ? WHERE login = ?', [hashSenha(senha), login]);
  console.log(r.affectedRows ? `Senha de ${login} atualizada.` : `Login ${login} não encontrado.`);
}

async function main() {
  const [login, senha] = process.argv.slice(2);
  if (login && senha) await modoDireto(login, senha);
  else await modoInterativo();
  await pool.end();
}

main().catch((erro) => {
  console.error('Erro:', erro.message);
  process.exit(1);
});
