const pool = require('./db');
const { hashSenha } = require('./auth');

(async () => {
  const [alvo, senha] = process.argv.slice(2);
  if (!alvo || !senha) {
    console.log('Uso:');
    console.log('  node definir-senha.js <login> <senha>');
    console.log('  node definir-senha.js --todos <senha>');
    process.exit(1);
  }
  if (senha.length < 4) {
    console.log('Use uma senha com pelo menos 4 caracteres.');
    process.exit(1);
  }
  if (alvo === '--todos') {
    const [lista] = await pool.query('SELECT id_profissional, login FROM profissional');
    for (const p of lista) {
      await pool.query('UPDATE profissional SET senha_hash = ? WHERE id_profissional = ?', [hashSenha(senha), p.id_profissional]);
      console.log('Senha definida para', p.login);
    }
  } else {
    const [r] = await pool.query('UPDATE profissional SET senha_hash = ? WHERE login = ?', [hashSenha(senha), alvo]);
    console.log(r.affectedRows ? 'Senha definida para ' + alvo : 'Login não encontrado: ' + alvo);
  }
  await pool.end();
})().catch(e => {
  console.error('Erro:', e.sqlMessage || e.message);
  process.exit(1);
});
