const crypto = require('crypto');

function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, sal, 64).toString('hex');
  return `scrypt$${sal}$${hash}`;
}

function conferirSenha(senha, guardado) {
  const [tipo, sal, hash] = String(guardado).split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const calc = crypto.scryptSync(senha, sal, 64);
  const orig = Buffer.from(hash, 'hex');
  return calc.length === orig.length && crypto.timingSafeEqual(calc, orig);
}

module.exports = { hashSenha, conferirSenha };
