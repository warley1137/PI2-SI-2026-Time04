function formPacienteHtml(paciente) {
  const p = paciente || {};
  const v = (campo) => esc(p[campo] ?? '');
  return `<form id="form-paciente" class="grade">
    <label class="inteiro">Nome completo *<input name="nome" value="${v('nome')}" maxlength="100" required></label>
    <label>CPF<input name="cpf" value="${v('cpf')}" placeholder="000.000.000-00"></label>
    <label>RG<input name="rg" value="${v('rg')}" maxlength="20"></label>
    <label>Nascimento *<input name="data_nascimento" type="date" value="${v('data_nascimento')}" required></label>
    <label>Sexo<select name="sexo">
      <option value="">—</option>
      <option value="F" ${p.sexo === 'F' ? 'selected' : ''}>Feminino</option>
      <option value="M" ${p.sexo === 'M' ? 'selected' : ''}>Masculino</option>
    </select></label>
    <label>Nome da mãe<input name="nome_mae" value="${v('nome_mae')}" maxlength="100"></label>
    <label>Nome do pai<input name="nome_pai" value="${v('nome_pai')}" maxlength="100"></label>
    <label>Telefone<input name="telefone" value="${v('telefone')}" placeholder="(19) 99999-0000"></label>
    <label>CEP<input name="cep" value="${v('cep')}" placeholder="00000-000"></label>
    <label class="inteiro">Logradouro<input name="logradouro" value="${v('logradouro')}" maxlength="100"></label>
    <label>Número<input name="numero" value="${v('numero')}" maxlength="10"></label>
    <label>Complemento<input name="complemento" value="${v('complemento')}" maxlength="50"></label>
    <label>Bairro<input name="bairro" value="${v('bairro')}" maxlength="60"></label>
    <label>Cidade<input name="cidade" value="${v('cidade')}" maxlength="60"></label>
    <label>UF<input name="uf" value="${v('uf')}" maxlength="2"></label>
  </form>`;
}

function abrirFormPaciente(paciente) {
  abrirModal({
    titulo: paciente ? 'Editar paciente' : 'Novo paciente',
    corpo: formPacienteHtml(paciente),
    botoes: [{
      texto: 'Salvar',
      classe: 'primario',
      acao: async () => {
        const dados = dadosDoForm(document.getElementById('form-paciente'));
        const salvo = paciente
          ? await api('PUT', `/pacientes/${paciente.id_paciente}`, dados)
          : await api('POST', '/pacientes', dados);
        aviso(paciente ? 'Cadastro atualizado.' : 'Paciente cadastrado.');
        const busca = document.querySelector('#form-busca-paciente input');
        busca.value = salvo.cpf || salvo.nome;
        buscarPacientes();
      }
    }]
  });
}

async function buscarPacientes() {
  const busca = document.querySelector('#form-busca-paciente input').value;
  const area = document.getElementById('resultado-pacientes');
  try {
    const lista = await api('GET', '/pacientes?busca=' + encodeURIComponent(busca));
    area.innerHTML = tabela(['Nome', 'CPF', 'Nascimento', 'Idade', ''], lista.map((p) => `
      <tr>
        <td><b>${esc(p.nome)}</b></td>
        <td>${cpfFormatado(p.cpf)}</td>
        <td>${data(p.data_nascimento)}</td>
        <td>${esc(p.idade)} anos</td>
        <td class="acoes">
          <button class="btn pequeno" data-editar="${p.id_paciente}">Editar</button>
          <button class="btn pequeno primario" data-abrir="${p.id_paciente}" data-nome="${esc(p.nome)}">Abrir atendimento</button>
        </td>
      </tr>`));
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

function abrirAtendimento(idPaciente, nome) {
  abrirModal({
    titulo: 'Abrir atendimento',
    corpo: `<p>Paciente: <b>${esc(nome)}</b></p>
      <label>Observação da recepção<textarea id="obs-atendimento" maxlength="500" placeholder="Ex.: chegou acompanhado, relata dor..."></textarea></label>`,
    botoes: [{
      texto: 'Abrir',
      classe: 'primario',
      acao: async () => {
        const novo = await api('POST', '/atendimentos', {
          id_paciente: Number(idPaciente),
          observacao: document.getElementById('obs-atendimento').value
        });
        setTimeout(() => abrirModal({
          titulo: 'Atendimento aberto',
          corpo: `<p>Informe ao paciente o número do atendimento:</p>
            <div class="destaque-numero">${esc(novo.numero_atendimento)}</div>
            <p class="discreto" style="text-align:center">Status: aguardando triagem</p>`
        }));
      }
    }]
  });
}

document.getElementById('form-busca-paciente').addEventListener('submit', (e) => {
  e.preventDefault();
  buscarPacientes();
});
document.getElementById('btn-novo-paciente').addEventListener('click', () => abrirFormPaciente(null));
document.getElementById('resultado-pacientes').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.editar) abrirFormPaciente(await api('GET', '/pacientes/' + b.dataset.editar));
  if (b.dataset.abrir) abrirAtendimento(b.dataset.abrir, b.dataset.nome);
});

TELAS.recepcao = () => {
  document.querySelector('#form-busca-paciente input').focus();
};

async function carregarAtendimentos() {
  const f = dadosDoForm(document.getElementById('form-filtro-atendimentos'));
  const qs = new URLSearchParams();
  if (f.status) qs.set('status', f.status);
  if (f.numero) qs.set('numero', f.numero.trim());
  if (f.hoje) qs.set('hoje', '1');
  const area = document.getElementById('lista-atendimentos');
  try {
    const lista = await api('GET', '/atendimentos?' + qs);
    area.innerHTML = tabela(['Nº', 'Paciente', 'Chegada', 'Status', 'Classificação', ''], lista.map((a) => {
      const aberto = !['FINALIZADO', 'CANCELADO'].includes(a.status);
      return `<tr>
        <td><b>${esc(a.numero_atendimento)}</b></td>
        <td>${esc(a.paciente)}</td>
        <td>${dataHora(a.dt_chegada)}</td>
        <td>${tagStatus(a.status)}</td>
        <td>${tagCor(a.classificacao)}</td>
        <td class="acoes">
          <button class="btn pequeno" data-ver="${a.id_atendimento}">Ver</button>
          ${aberto ? `<button class="btn pequeno" data-alterar="${a.id_atendimento}">Alterar</button>
          <button class="btn pequeno perigo" data-cancelar="${a.id_atendimento}" data-numero="${esc(a.numero_atendimento)}">Cancelar</button>` : ''}
        </td>
      </tr>`;
    }));
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

function detalheAtendimentoHtml(a) {
  return `<div class="dados">
      <div><small>Número</small><b>${esc(a.numero_atendimento)}</b></div>
      <div><small>Status</small>${tagStatus(a.status)}</div>
      <div><small>Paciente</small><b>${esc(a.paciente)}</b></div>
      <div><small>Idade</small><b>${esc(a.idade)} anos</b></div>
      <div><small>Chegada</small><b>${dataHora(a.dt_chegada)}</b></div>
      <div><small>Recepcionista</small><b>${esc(a.recepcionista)}</b></div>
    </div>
    ${a.observacao_recepcao ? `<h3>Observação da recepção</h3><p>${esc(a.observacao_recepcao)}</p>` : ''}
    ${a.classificacao ? `<h3>Triagem — ${tagCor(a.classificacao)}</h3>
      <div class="dados">
        <div><small>Pressão</small><b>${esc(a.pressao_sistolica)}/${esc(a.pressao_diastolica)}</b></div>
        <div><small>Temperatura</small><b>${esc(a.temperatura)} °C</b></div>
        <div><small>Batimentos</small><b>${esc(a.frequencia_cardiaca)} bpm</b></div>
        <div><small>Enfermeiro</small><b>${esc(a.enfermeiro)}</b></div>
      </div><p>${esc(a.queixas)}</p>` : ''}
    ${a.medico ? `<h3>Médico: ${esc(a.medico)}</h3>
      <p><b>Diagnóstico:</b> ${esc(a.diagnostico || 'em andamento')}</p>
      ${a.observacao_medica ? `<p><b>Observação:</b> ${esc(a.observacao_medica)}</p>` : ''}` : ''}
    ${a.status === 'CANCELADO' ? `<h3>Cancelado em ${dataHora(a.dt_cancelamento)}</h3><p>${esc(a.motivo_cancelamento)}</p>` : ''}`;
}

document.getElementById('form-filtro-atendimentos').addEventListener('change', (e) => {
  if (e.target.name !== 'numero') carregarAtendimentos();
});
document.getElementById('form-filtro-atendimentos').addEventListener('submit', (e) => {
  e.preventDefault();
  carregarAtendimentos();
});
document.getElementById('lista-atendimentos').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.ver) {
      const a = await api('GET', '/atendimentos/' + b.dataset.ver);
      abrirModal({ titulo: 'Atendimento ' + a.numero_atendimento, corpo: detalheAtendimentoHtml(a) });
    }
    if (b.dataset.alterar) {
      const a = await api('GET', '/atendimentos/' + b.dataset.alterar);
      abrirModal({
        titulo: 'Alterar atendimento ' + a.numero_atendimento,
        corpo: `<label>Observação da recepção<textarea id="nova-obs" maxlength="500">${esc(a.observacao_recepcao)}</textarea></label>`,
        botoes: [{
          texto: 'Salvar', classe: 'primario', acao: async () => {
            await api('PUT', '/atendimentos/' + a.id_atendimento, { observacao: document.getElementById('nova-obs').value });
            aviso('Atendimento alterado.');
            carregarAtendimentos();
          }
        }]
      });
    }
    if (b.dataset.cancelar) {
      abrirModal({
        titulo: 'Cancelar atendimento ' + b.dataset.numero,
        corpo: `<label>Motivo do cancelamento *<input id="motivo-cancel" maxlength="200" placeholder="Ex.: paciente desistiu"></label>`,
        botoes: [{
          texto: 'Confirmar cancelamento', classe: 'perigo', acao: async () => {
            await api('POST', `/atendimentos/${b.dataset.cancelar}/cancelar`, { motivo: document.getElementById('motivo-cancel').value });
            aviso('Atendimento cancelado.');
            carregarAtendimentos();
          }
        }]
      });
    }
  } catch (err) {
    aviso(err.message, 'erro');
  }
});

TELAS.atendimentos = carregarAtendimentos;
