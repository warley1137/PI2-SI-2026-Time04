const crypto = require('crypto');
const { ErroApi } = require('./erros');

const SEGREDO = process.env.SESSION_SECRET || 'segredo-de-desenvolvimento';
const COOKIE = 'ps_sessao';
const DURACAO_MS = 8 * 60 * 60 * 1000;

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function conferirSenha(senha, guardado) {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const calculado = crypto.scryptSync(senha, partes[1], 64);
  const esperado = Buffer.from(partes[2], 'hex');
  return esperado.length === calculado.length && crypto.timingSafeEqual(calculado, esperado);
}

function assinar(texto) {
  return crypto.createHmac('sha256', SEGREDO).update(texto).digest('base64url');
}

function criarSessao(res, usuario) {
  const dados = Buffer.from(JSON.stringify({ ...usuario, exp: Date.now() + DURACAO_MS })).toString('base64url');
  res.setHeader('Set-Cookie', `${COOKIE}=${dados}.${assinar(dados)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${DURACAO_MS / 1000}`);
}

function encerrarSessao(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function lerSessao(req) {
  const cookies = Object.fromEntries(
    String(req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0])
  );
  const valor = cookies[COOKIE];
  if (!valor || !valor.includes('.')) return null;
  const [dados, assinatura] = valor.split('.');
  const correta = assinar(dados);
  if (assinatura.length !== correta.length || !crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(correta))) return null;
  try {
    const usuario = JSON.parse(Buffer.from(dados, 'base64url').toString());
    return usuario.exp > Date.now() ? usuario : null;
  } catch {
    return null;
  }
}

function exigirLogin(...funcoes) {
  return (req, res, next) => {
    const usuario = lerSessao(req);
    if (!usuario) return next(new ErroApi(401, 'Faça login para continuar.'));
    if (funcoes.length && !funcoes.includes(usuario.funcao)) {
      return next(new ErroApi(403, 'Seu perfil não tem permissão para esta ação.'));
    }
    req.usuario = usuario;
    next();
  };
}

module.exports = { hashSenha, conferirSenha, criarSessao, encerrarSessao, lerSessao, exigirLogin };
