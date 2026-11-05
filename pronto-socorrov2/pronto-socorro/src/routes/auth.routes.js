const express = require('express');
const { pool } = require('../db');
const { rota, ErroApi } = require('../erros');
const { conferirSenha, criarSessao, encerrarSessao, exigirLogin } = require('../auth');
const { texto } = require('../validacoes');

const router = express.Router();

router.post('/login', rota(async (req, res) => {
  const login = texto(req.body.login);
  const senha = texto(req.body.senha);
  if (!login || !senha) throw new ErroApi(400, 'Informe login e senha.');

  const [linhas] = await pool.query(
    `SELECT id_profissional, nome, funcao, senha_hash
       FROM profissional
      WHERE login = ? AND ativo = TRUE`,
    [login]
  );
  const prof = linhas[0];
  if (!prof || !conferirSenha(senha, prof.senha_hash)) throw new ErroApi(401, 'Login ou senha incorretos.');

  const usuario = { id: Number(prof.id_profissional), nome: prof.nome, funcao: prof.funcao };
  criarSessao(res, usuario);
  res.json(usuario);
}));

router.post('/logout', (req, res) => {
  encerrarSessao(res);
  res.json({ ok: true });
});

router.get('/me', exigirLogin(), (req, res) => {
  const { id, nome, funcao } = req.usuario;
  res.json({ id, nome, funcao });
});

module.exports = router;
