require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = require('./db');
const crypto = require('crypto');
const { conferirSenha } = require('./auth');


const SEGREDO = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const assinar = obj => {
  const p = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return p + '.' + crypto.createHmac('sha256', SEGREDO).update(p).digest('base64url');
};
const lerToken = token => {
  if (!token) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  const esperado = crypto.createHmac('sha256', SEGREDO).update(p).digest('base64url');
  if (s.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(esperado))) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString());
    return o.exp > Date.now() ? o : null;
  } catch { return null; }
};
const cookie = (req, nome) => {
  const m = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(nome + '='));
  return m ? m.slice(nome.length + 1) : null;
};
const auth = (...funcoes) => (req, res, next) => {
  const u = lerToken(cookie(req, 'ps_sessao'));
  if (!u) return res.status(401).json({ erro: 'Entre com seu login para continuar.' });
  if (funcoes.length && !funcoes.includes(u.funcao)) return res.status(403).json({ erro: 'Seu perfil não tem acesso a esta função.' });
  req.usuario = u;
  next();
};

const q = async (sql, params = []) => (await pool.query(sql, params))[0];
const rota = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ erro: e.sqlMessage || e.message });
});
const obrigatorio = (res, obj, campos) => {
  const falta = campos.filter(c => obj[c] === undefined || obj[c] === null || String(obj[c]).trim() === '');
  if (falta.length) { res.status(400).json({ erro: 'Preencha: ' + falta.join(', ') }); return false; }
  return true;
};


app.post('/api/login', rota(async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) return res.status(400).json({ erro: 'Informe login e senha.' });
  const [u] = await q('SELECT id_profissional, nome, funcao, senha_hash, ativo FROM profissional WHERE login = ?', [String(login).trim()]);
  if (!u || !u.ativo) return res.status(401).json({ erro: 'Login ou senha incorretos.' });
  if (!String(u.senha_hash).startsWith('scrypt$')) return res.status(403).json({ erro: 'Este login ainda não tem senha. Rode: node definir-senha.js' });
  if (!conferirSenha(senha, u.senha_hash)) return res.status(401).json({ erro: 'Login ou senha incorretos.' });
  const token = assinar({ id: u.id_profissional, nome: u.nome, funcao: u.funcao, exp: Date.now() + 8 * 3600 * 1000 });
  res.setHeader('Set-Cookie', `ps_sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
  res.json({ nome: u.nome, funcao: u.funcao });
}));

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'ps_sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const u = lerToken(cookie(req, 'ps_sessao'));
  res.json(u ? { nome: u.nome, funcao: u.funcao } : null);
});

app.get('/api/resumo', rota(async (req, res) => {
  const linhas = await q('SELECT status, COUNT(*) AS n FROM atendimento GROUP BY status');
  const por = Object.fromEntries(linhas.map(l => [l.status, l.n]));
  const [{ pacientes }] = await q('SELECT COUNT(*) AS pacientes FROM paciente');
  res.json({ por, pacientes });
}));

app.get('/api/pacientes', auth('RECEPCIONISTA'), rota(async (req, res) => {
  res.json(await q('SELECT id_paciente, nome, cpf, data_nascimento, telefone FROM paciente ORDER BY nome LIMIT 300'));
}));

app.post('/api/pacientes', auth('RECEPCIONISTA'), rota(async (req, res) => {
  const b = req.body;
  if (!obrigatorio(res, b, ['nome', 'data_nascimento'])) return;
  const r = await pool.query(
    'INSERT INTO paciente (nome, cpf, data_nascimento, sexo, telefone) VALUES (?,?,?,?,?)',
    [b.nome.trim(), b.cpf ? b.cpf.replace(/\D/g, '') : null, b.data_nascimento, b.sexo || null, b.telefone || null]
  );
  res.json({ id_paciente: r[0].insertId });
}));

app.get('/api/atendimentos', auth('RECEPCIONISTA', 'ENFERMEIRO'), rota(async (req, res) => {
  const filtro = req.query.status ? 'WHERE a.status = ?' : '';
  res.json(await q(
    `SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada, a.observacao, p.nome AS paciente
       FROM atendimento a JOIN paciente p ON p.id_paciente = a.id_paciente ${filtro}
      ORDER BY a.dt_chegada DESC LIMIT 200`,
    req.query.status ? [req.query.status] : []
  ));
}));

app.post('/api/atendimentos', auth('RECEPCIONISTA'), rota(async (req, res) => {
  const b = req.body;
  if (!obrigatorio(res, b, ['id_paciente'])) return;
  const aberto = await q(
    "SELECT id_atendimento FROM atendimento WHERE id_paciente = ? AND status NOT IN ('FINALIZADO','CANCELADO')",
    [b.id_paciente]
  );
  if (aberto.length) return res.status(409).json({ erro: 'Este paciente já tem um atendimento em aberto.' });
  const r = await pool.query('INSERT INTO atendimento (id_paciente, observacao) VALUES (?, ?)', [b.id_paciente, b.observacao || null]);
  const id = r[0].insertId;
  await q("UPDATE atendimento SET numero_atendimento = CONCAT('A', LPAD(id_atendimento, 5, '0')) WHERE id_atendimento = ?", [id]);
  await q("INSERT IGNORE INTO prontuario (id_atendimento, id_profissional, etapa, dt_fim) VALUES (?, ?, 'RECEPCAO', NOW())", [id, req.usuario.id]);
  res.json({ id_atendimento: id });
}));

app.post('/api/atendimentos/:id/cancelar', auth('RECEPCIONISTA'), rota(async (req, res) => {
  if (!obrigatorio(res, req.body, ['motivo'])) return;
  await q(
    "UPDATE atendimento SET status='CANCELADO', dt_cancelamento=NOW(), motivo_cancelamento=? WHERE id_atendimento=? AND status NOT IN ('FINALIZADO','CANCELADO')",
    [req.body.motivo, req.params.id]
  );
  res.json({ ok: true });
}));

app.post('/api/triagem', auth('ENFERMEIRO'), rota(async (req, res) => {
  const b = req.body;
  if (!obrigatorio(res, b, ['id_atendimento', 'pressao_sistolica', 'pressao_diastolica', 'temperatura', 'frequencia_cardiaca', 'queixas', 'classificacao'])) return;
  await q(
    'INSERT INTO triagem (id_atendimento, pressao_sistolica, pressao_diastolica, temperatura, frequencia_cardiaca, queixas, classificacao) VALUES (?,?,?,?,?,?,?)',
    [b.id_atendimento, b.pressao_sistolica, b.pressao_diastolica, b.temperatura, b.frequencia_cardiaca, b.queixas, b.classificacao]
  );
  await q("INSERT IGNORE INTO prontuario (id_atendimento, id_profissional, etapa, dt_fim) VALUES (?, ?, 'TRIAGEM', NOW())", [b.id_atendimento, req.usuario.id]);
  await q("UPDATE atendimento SET status='AGUARDANDO_MEDICO', dt_confirmacao=NOW() WHERE id_atendimento=? AND status='AGUARDANDO_TRIAGEM'", [b.id_atendimento]);
  res.json({ ok: true });
}));

app.get('/api/painel', auth(), rota(async (req, res) => {
  res.json(await q('SELECT * FROM vw_painel_atendimento ORDER BY prioridade, dt_triagem'));
}));

app.post('/api/atendimentos/:id/iniciar', auth('MEDICO'), rota(async (req, res) => {
  await q("UPDATE atendimento SET status='EM_ATENDIMENTO' WHERE id_atendimento=? AND status='AGUARDANDO_MEDICO'", [req.params.id]);
  await q("INSERT IGNORE INTO prontuario (id_atendimento, id_profissional, etapa) VALUES (?,?, 'ATENDIMENTO_MEDICO')", [req.params.id, req.usuario.id]);
  res.json({ ok: true });
}));

app.post('/api/atendimentos/:id/finalizar', auth('MEDICO'), rota(async (req, res) => {
  await q("UPDATE atendimento SET status='FINALIZADO' WHERE id_atendimento=? AND status='EM_ATENDIMENTO'", [req.params.id]);
  await q("UPDATE prontuario SET dt_fim=NOW(), anotacao=? WHERE id_atendimento=? AND etapa='ATENDIMENTO_MEDICO'", [req.body.anotacao || null, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/prescricoes/:id', auth('MEDICO'), rota(async (req, res) => {
  res.json(await q('SELECT * FROM prescricao WHERE id_atendimento=? ORDER BY dt_prescricao', [req.params.id]));
}));

app.post('/api/prescricoes', auth('MEDICO'), rota(async (req, res) => {
  const b = req.body;
  if (!obrigatorio(res, b, ['id_atendimento', 'medicamento', 'dosagem', 'via_administracao'])) return;
  await q(
    'INSERT INTO prescricao (id_atendimento, medicamento, dosagem, via_administracao, frequencia) VALUES (?,?,?,?,?)',
    [b.id_atendimento, b.medicamento.trim(), b.dosagem.trim(), b.via_administracao, b.frequencia || null]
  );
  res.json({ ok: true });
}));

app.get('/api/prontuarios', auth(), rota(async (req, res) => {
  res.json(await q(
    `SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada, p.nome AS paciente,
            t.classificacao, t.queixas, pr.anotacao, pr.dt_fim,
            (SELECT COUNT(*) FROM prescricao x WHERE x.id_atendimento = a.id_atendimento) AS prescricoes
       FROM atendimento a
       JOIN paciente p ON p.id_paciente = a.id_paciente
       LEFT JOIN triagem t ON t.id_atendimento = a.id_atendimento
       LEFT JOIN prontuario pr ON pr.id_atendimento = a.id_atendimento AND pr.etapa = 'ATENDIMENTO_MEDICO'
      ORDER BY a.dt_chegada DESC LIMIT 200`
  ));
}));

const porta = process.env.PORT || 3000;
pool.query('SELECT 1').then(() => {
  console.log('Banco conectado.');
  app.listen(porta, () => console.log('Abra http://localhost:' + porta));
}).catch(e => {
  console.error('Não foi possível conectar ao banco:', e.code || e.message);
  console.error('Confira o .env e se você está na rede/VPN da faculdade.');
  process.exit(1);
});
