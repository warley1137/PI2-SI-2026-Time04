document.getElementById('legenda-manchester').innerHTML = CORES
  .map((c) => `<span class="cor cor-${c.nome}">${c.nome} — ${c.tempo}</span>`)
  .join('');

async function carregarPainel() {
  const area = document.getElementById('tabela-painel');
  try {
    const lista = await api('GET', '/painel');
    const souMedico = usuario.funcao === 'MEDICO';
    area.innerHTML = tabela(['Classificação', 'Nº', 'Paciente', 'Idade', 'Queixas', 'Espera', 'Status', ''], lista.map((p) => {
      let acao = '';
      if (souMedico && p.status === 'AGUARDANDO_MEDICO') acao = `<button class="btn pequeno primario" data-chamar="${p.id_atendimento}">Chamar</button>`;
      if (souMedico && p.status === 'EM_ATENDIMENTO' && Number(p.id_medico) === usuario.id) acao = `<a class="btn pequeno" href="#consulta/${p.id_atendimento}">Continuar</a>`;
      if (!souMedico && p.status === 'AGUARDANDO_MEDICO') acao = `<button class="btn pequeno" data-reclassificar="${p.id_atendimento}" data-numero="${esc(p.numero_atendimento)}">Reclassificar</button>`;
      const espera = p.status === 'EM_ATENDIMENTO'
        ? `<span class="discreto">com ${esc(p.medico || 'médico')}</span>`
        : `<span class="${p.atrasado ? 'alerta' : ''}">${esc(p.minutos_espera)} / ${esc(p.tempo_max_espera_min)} min${p.atrasado ? ' ⚠' : ''}</span>`;
      return `<tr class="cor-${esc(p.classificacao)} ${p.atrasado && p.status !== 'EM_ATENDIMENTO' ? 'atrasado' : ''}">
        <td>${tagCor(p.classificacao)}</td>
        <td><b>${esc(p.numero_atendimento)}</b></td>
        <td>${esc(p.paciente)}</td>
        <td>${esc(p.idade)}</td>
        <td>${esc(p.queixas)}</td>
        <td class="espera">${espera}</td>
        <td>${tagStatus(p.status)}</td>
        <td class="acoes">${acao}</td>
      </tr>`;
    }), 'painel');
    document.getElementById('painel-atualizado').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR').slice(0, 5) + ' · atualiza sozinho a cada 30 s';
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

document.getElementById('tabela-painel').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.chamar) {
      await api('POST', `/atendimentos/${b.dataset.chamar}/chamar`);
      location.hash = 'consulta/' + b.dataset.chamar;
    }
    if (b.dataset.reclassificar) {
      abrirModal({
        titulo: 'Reclassificar ' + b.dataset.numero,
        corpo: `<div class="manchester">${CORES.map((c) => `
          <input type="radio" name="nova-cor" id="nova-${c.nome}" value="${c.nome}">
          <label for="nova-${c.nome}" class="cor-${c.nome}">${c.nome}<span>${c.tempo}</span></label>`).join('')}</div>`,
        botoes: [{
          texto: 'Salvar', classe: 'primario', acao: async () => {
            const cor = document.querySelector('input[name="nova-cor"]:checked');
            if (!cor) throw new Error('Escolha uma cor.');
            await api('PUT', `/triagem/${b.dataset.reclassificar}/classificacao`, { classificacao: cor.value });
            aviso('Classificação alterada.');
            carregarPainel();
          }
        }]
      });
    }
  } catch (err) {
    aviso(err.message, 'erro');
    carregarPainel();
  }
});

TELAS.painel = () => {
  carregarPainel();
  painelTimer = setInterval(carregarPainel, 30000);
};

async function carregarConsulta(id) {
  const area = document.getElementById('area-consulta');
  if (!id) {
    const meus = await api('GET', '/meus-atendimentos');
    if (meus.length === 1) return (location.hash = 'consulta/' + meus[0].id_atendimento);
    area.innerHTML = meus.length
      ? tabela(['Nº', 'Paciente', 'Classificação', 'Início', ''], meus.map((m) => `<tr>
          <td><b>${esc(m.numero_atendimento)}</b></td><td>${esc(m.paciente)}</td><td>${tagCor(m.classificacao)}</td>
          <td>${dataHora(m.dt_inicio)}</td><td class="acoes"><a class="btn pequeno" href="#consulta/${m.id_atendimento}">Abrir</a></td></tr>`))
      : '<div class="vazio">Você não tem atendimento em andamento. Chame um paciente pelo <a href="#painel">painel</a>.</div>';
    return;
  }

  try {
    const [a, prescricoes] = await Promise.all([
      api('GET', '/atendimentos/' + id),
      api('GET', `/atendimentos/${id}/prescricoes`)
    ]);
    const emAndamento = a.status === 'EM_ATENDIMENTO' && Number(a.id_medico) === usuario.id;
    area.innerHTML = `
      <div class="card visita cor-${esc(a.classificacao)}">
        <div class="linha"><h2 style="margin:0">${esc(a.numero_atendimento)} · ${esc(a.paciente)}</h2>${tagStatus(a.status)}</div>
        <div class="dados">
          <div><small>Idade</small><b>${esc(a.idade)} anos</b></div>
          <div><small>Sexo</small><b>${esc(a.sexo || '—')}</b></div>
          <div><small>Classificação</small>${tagCor(a.classificacao)}</div>
          <div><small>Triagem</small><b>${esc(a.enfermeiro)} · ${dataHora(a.dt_triagem)}</b></div>
        </div>
        <h3>Sinais vitais</h3>
        <div class="dados sinais">
          <div><small>Pressão</small><b>${esc(a.pressao_sistolica)}/${esc(a.pressao_diastolica)}</b></div>
          <div><small>Temperatura</small><b>${esc(a.temperatura)} °C</b></div>
          <div><small>Batimentos</small><b>${esc(a.frequencia_cardiaca)} bpm</b></div>
        </div>
        <h3>Queixas</h3><p>${esc(a.queixas)}</p>
        ${a.observacao_recepcao ? `<p class="discreto">Recepção: ${esc(a.observacao_recepcao)}</p>` : ''}
        <a href="#historico/${a.id_paciente}" class="btn pequeno">Ver histórico do paciente</a>
      </div>

      <div class="card">
        <h2>Medicações</h2>
        ${tabela(['Medicamento', 'Dosagem', 'Via', 'Frequência', 'Prescrita', 'Administrada', ''], prescricoes.map((m) => `<tr>
          <td><b>${esc(m.medicamento)}</b></td><td>${esc(m.dosagem)}</td><td>${esc(m.via_administracao)}</td>
          <td>${esc(m.frequencia || '—')}</td><td>${dataHora(m.dt_prescricao)}</td><td>${dataHora(m.dt_administracao)}</td>
          <td class="acoes">${!m.dt_administracao && emAndamento ? `
            <button class="btn pequeno" data-administrar="${m.id_prescricao}">Administrada</button>
            <button class="btn pequeno perigo" data-remover="${m.id_prescricao}">Remover</button>` : ''}</td>
        </tr>`))}
        ${emAndamento ? `
          <form id="form-prescricao" class="grade" style="margin-top:14px">
            <label>Medicamento *<input name="medicamento" maxlength="100" required></label>
            <label>Dosagem *<input name="dosagem" maxlength="50" placeholder="500 mg" required></label>
            <label>Via *<select name="via_administracao" required>
              <option>Oral</option><option>Intravenosa</option><option>Intramuscular</option>
              <option>Subcutânea</option><option>Inalatória</option><option>Tópica</option>
            </select></label>
            <label>Frequência<input name="frequencia" maxlength="50" placeholder="8/8h"></label>
            <div class="inteiro"><button class="btn">+ Adicionar medicação</button></div>
          </form>` : ''}
      </div>

      ${emAndamento ? `
        <div class="card">
          <h2>Confirmar atendimento</h2>
          <form id="form-finalizar" class="grade">
            <label class="inteiro">Diagnóstico *<textarea name="diagnostico" maxlength="500" required></textarea></label>
            <label class="inteiro">Observação / conduta<textarea name="observacao" maxlength="1000"></textarea></label>
            <p id="finalizar-erro" class="erro-texto inteiro"></p>
            <div class="inteiro"><button class="btn primario largo">Confirmar e finalizar atendimento</button></div>
          </form>
        </div>` : (a.diagnostico ? `<div class="card"><h2>Diagnóstico</h2><p>${esc(a.diagnostico)}</p><p class="discreto">${esc(a.observacao_medica || '')}</p></div>` : '')}`;

    if (!emAndamento) return;
    document.getElementById('form-prescricao').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('POST', `/atendimentos/${id}/prescricoes`, dadosDoForm(e.target));
        aviso('Medicação registrada.');
        carregarConsulta(id);
      } catch (err) {
        aviso(err.message, 'erro');
      }
    });
    document.getElementById('form-finalizar').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('POST', `/atendimentos/${id}/finalizar`, dadosDoForm(e.target));
        aviso(`Atendimento ${a.numero_atendimento} finalizado.`);
        location.hash = 'painel';
      } catch (err) {
        document.getElementById('finalizar-erro').textContent = err.message;
      }
    });
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

document.getElementById('area-consulta').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b || (!b.dataset.administrar && !b.dataset.remover)) return;
  const id = location.hash.split('/')[1];
  try {
    if (b.dataset.administrar) await api('PATCH', `/prescricoes/${b.dataset.administrar}/administrar`);
    if (b.dataset.remover) await api('DELETE', `/prescricoes/${b.dataset.remover}`);
    carregarConsulta(id);
  } catch (err) {
    aviso(err.message, 'erro');
  }
});

TELAS.consulta = carregarConsulta;
