require('dotenv').config();
const path = require('path');
const express = require('express');
const { pool } = require('./db');
const { tratarErros } = require('./erros');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/saude', async (req, res, next) => {
  try {
    const [linhas] = await pool.query('SELECT COUNT(*) AS pacientes FROM paciente');
    res.json({ api: 'ok', banco: 'ok', pacientes: Number(linhas[0].pacientes) });
  } catch (erro) {
    next(erro);
  }
});

app.use('/api', require('./routes/auth.routes'));
app.use('/api', require('./routes/pacientes.routes'));
app.use('/api', require('./routes/atendimentos.routes'));
app.use('/api', require('./routes/triagem.routes'));
app.use('/api', require('./routes/medico.routes'));

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use(tratarErros);

const PORTA = Number(process.env.PORT || 3000);
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
