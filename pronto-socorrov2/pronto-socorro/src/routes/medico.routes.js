const express = require('express');
const { pool, transacao } = require('../db');
const { rota, ErroApi } = require('../erros');
const { exigirLogin } = require('../auth');
const { idValido, opcional, obrigatorio, validarPrescricao } = require('../validacoes');

const router = express.Router();

async function prontuarioDoMedico(idAtendimento, idMedico) {
  const [linhas] = await pool.query(
    `SELECT pr.id_prontuario, pr.id_medico, a.status
       FROM prontuario pr
       JOIN atendimento a ON a.id_atendimento = pr.id_atendimento
      WHERE pr.id_atendimento = ?`,
    [idAtendimento]
  );
  const pront = linhas[0];
  if (!pront) throw new ErroApi(404, 'Este atendimento ainda não foi iniciado pelo médico.');
  if (Number(pront.id_medico) !== Number(idMedico)) throw new ErroApi(403, 'Este atendimento está com outro médico.');
  return pront;
}

router.get('/painel', exigirLogin('MEDICO', 'ENFERMEIRO'), rota(async (req, res) => {
  const [linhas] = await pool.query(
    `SELECT v.*, (v.minutos_espera > v.tempo_max_espera_min) AS atrasado,
            m.nome AS medico, pr.id_medico
       FROM vw_painel_atendimento v
       LEFT JOIN prontuario pr ON pr.id_atendimento = v.id_atendimento
       LEFT JOIN profissional m ON m.id_profissional = pr.id_medico
      ORDER BY (v.status = 'EM_ATENDIMENTO') DESC, v.prioridade, v.dt_triagem`
  );
  res.json(linhas.map((l) => ({ ...l, atrasado: Boolean(Number(l.atrasado)) })));
}));

router.post('/atendimentos/:id/chamar', exigirLogin('MEDICO'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  await transacao(async (conn) => {
    const [r] = await conn.query(
      `UPDATE atendimento SET status = 'EM_ATENDIMENTO'
        WHERE id_atendimento = ? AND status = 'AGUARDANDO_MEDICO'`,
      [id]
    );
    if (!r.affectedRows) throw new ErroApi(409, 'Este paciente não está aguardando médico.');
    await conn.query('INSERT INTO prontuario (id_atendimento, id_medico) VALUES (?, ?)', [id, req.usuario.id]);
  });
  res.json({ id_atendimento: id, status: 'EM_ATENDIMENTO' });
}));

router.get('/atendimentos/:id/prescricoes', exigirLogin(), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const [linhas] = await pool.query(
    `SELECT pr.*
       FROM prescricao pr
       JOIN prontuario p ON p.id_prontuario = pr.id_prontuario
      WHERE p.id_atendimento = ?
      ORDER BY pr.dt_prescricao`,
    [id]
  );
  res.json(linhas);
}));

router.post('/atendimentos/:id/prescricoes', exigirLogin('MEDICO'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const m = validarPrescricao(req.body);
  const pront = await prontuarioDoMedico(id, req.usuario.id);
  if (pront.status !== 'EM_ATENDIMENTO') throw new ErroApi(409, 'Só é possível prescrever durante o atendimento.');
  const [r] = await pool.query(
    `INSERT INTO prescricao (id_prontuario, medicamento, dosagem, via_administracao, frequencia)
     VALUES (?, ?, ?, ?, ?)`,
    [pront.id_prontuario, m.medicamento, m.dosagem, m.via_administracao, m.frequencia]
  );
  res.status(201).json({ id_prescricao: r.insertId, id_prontuario: pront.id_prontuario, ...m });
}));

router.patch('/prescricoes/:id/administrar', exigirLogin('MEDICO', 'ENFERMEIRO'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const [r] = await pool.query(
    `UPDATE prescricao SET dt_administracao = NOW()
      WHERE id_prescricao = ? AND dt_administracao IS NULL`,
    [id]
  );
  if (!r.affectedRows) throw new ErroApi(409, 'Prescrição não encontrada ou já administrada.');
  res.json({ id_prescricao: id, administrada: true });
}));

router.delete('/prescricoes/:id', exigirLogin('MEDICO'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const [r] = await pool.query(
    `DELETE FROM prescricao
      WHERE id_prescricao = ? AND dt_administracao IS NULL
        AND id_prontuario IN (
          SELECT p.id_prontuario FROM prontuario p
            JOIN atendimento a ON a.id_atendimento = p.id_atendimento
           WHERE p.id_medico = ? AND a.status = 'EM_ATENDIMENTO')`,
    [id, req.usuario.id]
  );
  if (!r.affectedRows) throw new ErroApi(409, 'Só é possível remover medicação ainda não administrada, durante o seu atendimento.');
  res.json({ id_prescricao: id, removida: true });
}));

router.post('/atendimentos/:id/finalizar', exigirLogin('MEDICO'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const diagnostico = obrigatorio(req.body.diagnostico, 'diagnóstico', 500);
  const observacao = opcional(req.body.observacao, 'observação', 1000);
  await prontuarioDoMedico(id, req.usuario.id);
  await transacao(async (conn) => {
    const [r] = await conn.query(
      `UPDATE atendimento SET status = 'FINALIZADO'
        WHERE id_atendimento = ? AND status = 'EM_ATENDIMENTO'`,
      [id]
    );
    if (!r.affectedRows) throw new ErroApi(409, 'Este atendimento não está em andamento.');
    await conn.query(
      'UPDATE prontuario SET dt_fim = NOW(), diagnostico = ?, observacao = ? WHERE id_atendimento = ?',
      [diagnostico, observacao, id]
    );
  });
  res.json({ id_atendimento: id, status: 'FINALIZADO' });
}));

router.get('/meus-atendimentos', exigirLogin('MEDICO'), rota(async (req, res) => {
  const [linhas] = await pool.query(
    `SELECT a.id_atendimento, a.numero_atendimento, p.nome AS paciente, t.classificacao, pr.dt_inicio
       FROM prontuario pr
       JOIN atendimento a ON a.id_atendimento = pr.id_atendimento
       JOIN paciente p    ON p.id_paciente    = a.id_paciente
       JOIN triagem t     ON t.id_atendimento = a.id_atendimento
      WHERE pr.id_medico = ? AND a.status = 'EM_ATENDIMENTO'
      ORDER BY pr.dt_inicio`,
    [req.usuario.id]
  );
  res.json(linhas);
}));

module.exports = router;
