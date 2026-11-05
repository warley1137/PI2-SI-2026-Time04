const express = require('express');
const { pool, transacao } = require('../db');
const { rota, ErroApi } = require('../erros');
const { exigirLogin } = require('../auth');
const { texto, idValido, obrigatorio, opcional } = require('../validacoes');

const router = express.Router();
const STATUS = ['AGUARDANDO_TRIAGEM', 'AGUARDANDO_MEDICO', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO'];

router.get('/atendimentos', exigirLogin(), rota(async (req, res) => {
  const filtros = [];
  const valores = [];
  const status = texto(req.query.status);
  if (status) {
    if (!STATUS.includes(status)) throw new ErroApi(400, 'Status inválido.');
    filtros.push('a.status = ?');
    valores.push(status);
  }
  if (req.query.hoje === '1') filtros.push('DATE(a.dt_chegada) = CURDATE()');
  const numero = texto(req.query.numero).toUpperCase();
  if (numero) {
    filtros.push('a.numero_atendimento = ?');
    valores.push(numero);
  }

  const [linhas] = await pool.query(
    `SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada, a.observacao,
            p.id_paciente, p.nome AS paciente, p.cpf, t.classificacao
       FROM atendimento a
       JOIN paciente p     ON p.id_paciente    = a.id_paciente
       LEFT JOIN triagem t ON t.id_atendimento = a.id_atendimento
      ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
      ORDER BY a.dt_chegada DESC
      LIMIT 200`,
    valores
  );
  res.json(linhas);
}));

router.get('/atendimentos/:id', exigirLogin(), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const [linhas] = await pool.query(
    `SELECT a.id_atendimento, a.numero_atendimento, a.status, a.dt_chegada, a.observacao AS observacao_recepcao,
            a.dt_cancelamento, a.motivo_cancelamento,
            p.id_paciente, p.nome AS paciente, p.cpf, p.data_nascimento, p.sexo,
            TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE()) AS idade,
            rec.nome AS recepcionista,
            t.pressao_sistolica, t.pressao_diastolica, t.temperatura, t.frequencia_cardiaca,
            t.queixas, t.classificacao, t.dt_triagem, enf.nome AS enfermeiro,
            pr.id_prontuario, pr.id_medico, med.nome AS medico, pr.dt_inicio, pr.dt_fim,
            pr.diagnostico, pr.observacao AS observacao_medica
       FROM atendimento a
       JOIN paciente p              ON p.id_paciente       = a.id_paciente
       JOIN profissional rec        ON rec.id_profissional = a.id_recepcionista
       LEFT JOIN triagem t          ON t.id_atendimento    = a.id_atendimento
       LEFT JOIN profissional enf   ON enf.id_profissional = t.id_enfermeiro
       LEFT JOIN prontuario pr      ON pr.id_atendimento   = a.id_atendimento
       LEFT JOIN profissional med   ON med.id_profissional = pr.id_medico
      WHERE a.id_atendimento = ?`,
    [id]
  );
  if (!linhas.length) throw new ErroApi(404, 'Atendimento não encontrado.');
  res.json(linhas[0]);
}));

router.post('/atendimentos', exigirLogin('RECEPCIONISTA'), rota(async (req, res) => {
  const idPaciente = idValido(req.body.id_paciente, 'Paciente');
  const observacao = opcional(req.body.observacao, 'observação', 500);

  const resultado = await transacao(async (conn) => {
    const [pac] = await conn.query('SELECT id_paciente FROM paciente WHERE id_paciente = ?', [idPaciente]);
    if (!pac.length) throw new ErroApi(404, 'Paciente não encontrado.');

    const [aberto] = await conn.query(
      `SELECT numero_atendimento FROM atendimento
        WHERE id_paciente = ? AND status NOT IN ('FINALIZADO', 'CANCELADO')`,
      [idPaciente]
    );
    if (aberto.length) throw new ErroApi(409, `Este paciente já tem o atendimento ${aberto[0].numero_atendimento} em aberto.`);

    const [r] = await conn.query(
      'INSERT INTO atendimento (id_paciente, id_recepcionista, observacao) VALUES (?, ?, ?)',
      [idPaciente, req.usuario.id, observacao]
    );
    await conn.query(
      `UPDATE atendimento
          SET numero_atendimento = CONCAT('AT', LPAD(id_atendimento, GREATEST(4, LENGTH(id_atendimento)), '0'))
        WHERE id_atendimento = ?`,
      [r.insertId]
    );
    const [novo] = await conn.query(
      'SELECT id_atendimento, numero_atendimento, status, dt_chegada FROM atendimento WHERE id_atendimento = ?',
      [r.insertId]
    );
    return novo[0];
  });
  res.status(201).json(resultado);
}));

router.put('/atendimentos/:id', exigirLogin('RECEPCIONISTA'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const observacao = opcional(req.body.observacao, 'observação', 500);
  const [r] = await pool.query(
    `UPDATE atendimento SET observacao = ?
      WHERE id_atendimento = ? AND status NOT IN ('FINALIZADO', 'CANCELADO')`,
    [observacao, id]
  );
  if (!r.affectedRows) throw new ErroApi(409, 'Atendimento não encontrado ou já encerrado.');
  res.json({ id_atendimento: id, observacao });
}));

router.post('/atendimentos/:id/cancelar', exigirLogin('RECEPCIONISTA'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const motivo = obrigatorio(req.body.motivo, 'motivo do cancelamento', 200);
  await transacao(async (conn) => {
    const [r] = await conn.query(
      `UPDATE atendimento
          SET status = 'CANCELADO', dt_cancelamento = NOW(), motivo_cancelamento = ?
        WHERE id_atendimento = ? AND status NOT IN ('FINALIZADO', 'CANCELADO')`,
      [motivo, id]
    );
    if (!r.affectedRows) throw new ErroApi(409, 'Só é possível cancelar antes da confirmação do médico.');
    await conn.query(
      `UPDATE prontuario SET dt_fim = NOW(), observacao = CONCAT('Atendimento cancelado: ', ?)
        WHERE id_atendimento = ? AND dt_fim IS NULL`,
      [motivo, id]
    );
  });
  res.json({ id_atendimento: id, status: 'CANCELADO' });
}));

module.exports = router;
