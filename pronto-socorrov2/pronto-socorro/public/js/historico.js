async function buscarHistorico() {
  const busca = document.querySelector('#form-busca-historico input').value;
  const area = document.getElementById('area-historico');
  try {
    const lista = await api('GET', '/pacientes?busca=' + encodeURIComponent(busca));
    if (lista.length === 1) return (location.hash = 'historico/' + lista[0].id_paciente);
    area.innerHTML = tabela(['Nome', 'CPF', 'Nascimento', ''], lista.map((p) => `<tr>
      <td><b>${esc(p.nome)}</b></td><td>${cpfFormatado(p.cpf)}</td><td>${data(p.data_nascimento)}</td>
      <td class="acoes"><a class="btn pequeno" href="#historico/${p.id_paciente}">Ver histórico</a></td></tr>`));
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

async function mostrarHistorico(idPaciente) {
  const area = document.getElementById('area-historico');
  if (!idPaciente) {
    area.innerHTML = '';
    return;
  }
  try {
    const [p, h] = await Promise.all([
      api('GET', '/pacientes/' + idPaciente),
      api('GET', `/pacientes/${idPaciente}/historico`)
    ]);
    const endereco = [p.logradouro, p.numero, p.complemento, p.bairro, p.cidade && `${p.cidade}/${p.uf || ''}`].filter(Boolean).join(', ');
    area.innerHTML = `
      <div class="card">
        <div class="linha"><h2 style="margin:0 0 12px">${esc(p.nome)}</h2></div>
        <div class="dados">
          <div><small>CPF</small><b>${cpfFormatado(p.cpf)}</b></div>
          <div><small>RG</small><b>${esc(p.rg || '—')}</b></div>
          <div><small>Nascimento</small><b>${data(p.data_nascimento)}</b></div>
          <div><small>Mãe</small><b>${esc(p.nome_mae || '—')}</b></div>
          <div><small>Pai</small><b>${esc(p.nome_pai || '—')}</b></div>
          <div><small>Endereço</small><b>${esc(endereco || '—')}</b></div>
        </div>
      </div>
      <h2>${h.visitas.length} atendimento(s)</h2>
      ${h.visitas.length ? h.visitas.map((v) => {
        const meds = h.medicacoes.filter((m) => m.numero_atendimento === v.numero_atendimento);
        return `<div class="card visita cor-${esc(v.classificacao)}">
          <div class="linha"><b>${esc(v.numero_atendimento)} · ${dataHora(v.dt_chegada)}</b><span>${tagCor(v.classificacao)} ${tagStatus(v.status)}</span></div>
          ${v.queixas ? `<p><b>Queixas:</b> ${esc(v.queixas)}</p>` : ''}
          ${v.diagnostico ? `<p><b>Diagnóstico:</b> ${esc(v.diagnostico)}</p>` : ''}
          ${v.observacao ? `<p><b>Observação:</b> ${esc(v.observacao)}</p>` : ''}
          <p class="discreto">${v.enfermeiro ? 'Triagem: ' + esc(v.enfermeiro) : ''}${v.medico ? ' · Médico: ' + esc(v.medico) + ' (' + esc(v.crm) + ')' : ''}${v.dt_alta ? ' · Alta: ' + dataHora(v.dt_alta) : ''}</p>
          ${meds.length ? `<p><b>Medicações:</b> ${meds.map((m) => `${esc(m.medicamento)} ${esc(m.dosagem)} (${esc(m.via_administracao)})`).join('; ')}</p>` : ''}
        </div>`;
      }).join('') : '<div class="vazio">Nenhum atendimento registrado.</div>'}`;
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

document.getElementById('form-busca-historico').addEventListener('submit', (e) => {
  e.preventDefault();
  buscarHistorico();
});

TELAS.historico = mostrarHistorico;
