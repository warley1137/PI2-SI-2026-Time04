class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroApi) {
    return res.status(erro.status).json({ erro: erro.message });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  const msg = String(erro.sqlMessage || erro.message || '');
  if (erro.code === 'ER_DUP_ENTRY' || /duplicate/i.test(msg)) {
    if (/cpf/i.test(msg)) return res.status(409).json({ erro: 'Já existe um cadastro com este CPF.' });
    return res.status(409).json({ erro: 'Registro duplicado.' });
  }
  if (erro.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || /check constraint/i.test(msg)) {
    return res.status(400).json({ erro: 'Valor fora das opções permitidas.' });
  }
  if (erro.code === 'ER_NO_REFERENCED_ROW_2' || /foreign key/i.test(msg)) {
    return res.status(400).json({ erro: 'Registro relacionado não encontrado.' });
  }
  if (erro.code === 'ECONNREFUSED' || erro.code === 'ER_ACCESS_DENIED_ERROR' || erro.code === 'ER_BAD_DB_ERROR') {
    console.error('Falha ao conectar no MySQL:', erro.code, msg);
    return res.status(500).json({ erro: 'Não foi possível conectar ao banco de dados. Confira o arquivo .env.' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
}

module.exports = { ErroApi, rota, tratarErros };
