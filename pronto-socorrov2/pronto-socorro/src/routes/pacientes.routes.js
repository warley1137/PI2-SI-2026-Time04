const express = require('express');
const { pool } = require('../db');
const { rota, ErroApi } = require('../erros');
const { exigirLogin } = require('../auth');
const { digitos, texto, idValido, validarPaciente } = require('../validacoes');

const router = express.Router();

router.get('/pacientes', exigirLogin(), rota(async (req, res) => {
  const busca = texto(req.query.busca);
  if (busca.length < 2) throw new ErroApi(400, 'Digite ao menos 2 caracteres para buscar.');
  const cpf = digitos(busca);
  const porCpf = cpf.length === 11 && cpf === busca.replace(/[.\-\s]/g, '');

  const [linhas] = await pool.query(
    `SELECT id_paciente, nome, cpf, data_nascimento,
            TIMESTAMPDIFF(YEAR, data_nascimento, CURDATE()) AS idade, telefone
       FROM paciente
      WHERE ${porCpf ? 'cpf = ?' : "nome LIKE CONCAT('%', ?, '%')"}
      ORDER BY nome
      LIMIT 50`,
    [porCpf ? cpf : busca]
  );
  res.json(linhas);
}));

router.get('/pacientes/:id', exigirLogin(), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const [linhas] = await pool.query('SELECT * FROM paciente WHERE id_paciente = ?', [id]);
  if (!linhas.length) throw new ErroApi(404, 'Paciente não encontrado.');
  res.json(linhas[0]);
}));

router.post('/pacientes', exigirLogin('RECEPCIONISTA'), rota(async (req, res) => {
  const p = validarPaciente(req.body);
  const [r] = await pool.query(
    `INSERT INTO paciente (nome, cpf, rg, data_nascimento, sexo, nome_mae, nome_pai, telefone,
                           cep, logradouro, numero, complemento, bairro, cidade, uf)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.nome, p.cpf, p.rg, p.data_nascimento, p.sexo, p.nome_mae, p.nome_pai, p.telefone,
     p.cep, p.logradouro, p.numero, p.complemento, p.bairro, p.cidade, p.uf]
  );
  res.status(201).json({ id_paciente: r.insertId, ...p });
}));

router.put('/pacientes/:id', exigirLogin('RECEPCIONISTA'), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const p = validarPaciente(req.body);
  const [r] = await pool.query(
    `UPDATE paciente
        SET nome = ?, cpf = ?, rg = ?, data_nascimento = ?, sexo = ?, nome_mae = ?, nome_pai = ?,
            telefone = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?,
            cidade = ?, uf = ?
      WHERE id_paciente = ?`,
    [p.nome, p.cpf, p.rg, p.data_nascimento, p.sexo, p.nome_mae, p.nome_pai, p.telefone,
     p.cep, p.logradouro, p.numero, p.complemento, p.bairro, p.cidade, p.uf, id]
  );
  if (!r.affectedRows) throw new ErroApi(404, 'Paciente não encontrado.');
  res.json({ id_paciente: id, ...p });
}));

router.get('/pacientes/:id/historico', exigirLogin(), rota(async (req, res) => {
  const id = idValido(req.params.id);
  const [visitas] = await pool.query(
    `SELECT * FROM vw_historico_paciente WHERE id_paciente = ? ORDER BY dt_chegada DESC`,
    [id]
  );
  const [medicacoes] = await pool.query(
    `SELECT a.numero_atendimento, pr.medicamento, pr.dosagem, pr.via_administracao,
            pr.frequencia, pr.dt_prescricao, pr.dt_administracao
       FROM prescricao pr
       JOIN prontuario p  ON p.id_prontuario  = pr.id_prontuario
       JOIN atendimento a ON a.id_atendimento = p.id_atendimento
      WHERE a.id_paciente = ?
      ORDER BY pr.dt_prescricao DESC`,
    [id]
  );
  res.json({ visitas, medicacoes });
}));

module.exports = router;
