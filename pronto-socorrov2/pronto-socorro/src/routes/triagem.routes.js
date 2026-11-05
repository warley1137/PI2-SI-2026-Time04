const express = require('express');
const { pool, transacao } = require('../db');
const { rota, ErroApi } = require('../erros');
const { exigirLogin } = require('../auth');
const { idValido, validarTriagem, validarCor } = require('../validacoes');

const router = express.Router();

router.get('/triagem/fila', exigirLogin('ENFERMEIRO'), rota(async (req, res) => {
  const [linhas] = await pool.query(
    `SELECT a.id_atendimento, a.numero_atendimento, a.dt_chegada, a.observacao,
            p.nome AS paciente, p.data_nascimento, p.sexo,
            TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE()) AS idade,
            TIMESTAMPDIFF(MINUTE, a.dt_chegada, NOW()) AS minutos_espera
       FROM atendimento a
       JOIN paciente p ON p.id_paciente = a.id_paciente
      WHERE a.status = 'AGUARDANDO_TRIAGEM'
      ORDER BY a.dt_chegada`
  );
  res.json(linhas);
}));

router.post('/triagem', exigirLogin('ENFERMEIRO'), rota(async (req, res) => {
  const idAtendimento = idValido(req.body.id_atendimento, 'Atendimento');
  const t = validarTriagem(req.body);

  await transacao(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO triagem (id_atendimento, id_enfermeiro, pressao_sistolica, pressao_diastolica,
                            temperatura, frequencia_cardiaca, queixas, classificacao)
       SELECT id_atendimento, ?, ?, ?, ?, ?, ?, ?
         FROM atendimento
        WHERE id_atendimento = ? AND status = 'AGUARDANDO_TRIAGEM'`,
      [req.usuario.id, t.pressao_sistolica, t.pressao_diastolica, t.temperatura,
       t.frequencia_cardiaca, t.queixas, t.classificacao, idAtendimento]
    );
    if (!r.affectedRows) throw new ErroApi(409, 'Este atendimento não está aguardando triagem.');
    await conn.query(
      `UPDATE atendimento SET status = 'AGUARDANDO_MEDICO' WHERE id_atendimento = ?`,
      [idAtendimento]
    );
  });
  res.status(201).json({ id_atendimento: idAtendimento, status: 'AGUARDANDO_MEDICO', ...t });
}));

router.get('/triagem/:idAtendimento', exigirLogin(), rota(async (req, res) => {
  const id = idValido(req.params.idAtendimento);
  const [linhas] = await pool.query(
    `SELECT t.*, p.nome AS enfermeiro, e.coren
       FROM triagem t
       JOIN enfermeiro e   ON e.id_profissional = t.id_enfermeiro
       JOIN profissional p ON p.id_profissional = e.id_profissional
      WHERE t.id_atendimento = ?`,
    [id]
  );
  if (!linhas.length) throw new ErroApi(404, 'Triagem não encontrada.');
  res.json(linhas[0]);
}));

router.put('/triagem/:idAtendimento/classificacao', exigirLogin('ENFERMEIRO', 'MEDICO'), rota(async (req, res) => {
  const id = idValido(req.params.idAtendimento);
  const cor = validarCor(req.body.classificacao);
  const [r] = await pool.query(
    `UPDATE triagem SET classificacao = ?
      WHERE id_atendimento = ?
        AND id_atendimento IN (SELECT id_atendimento FROM atendimento WHERE status = 'AGUARDANDO_MEDICO')`,
    [cor, id]
  );
  if (!r.affectedRows) throw new ErroApi(409, 'Só é possível reclassificar quem ainda aguarda o médico.');
  res.json({ id_atendimento: id, classificacao: cor });
}));

module.exports = router;
