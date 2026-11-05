let triagemSelecionada = null;

async function carregarFila() {
  const area = document.getElementById('fila-triagem');
  try {
    const fila = await api('GET', '/triagem/fila');
    if (!fila.length) {
      area.innerHTML = '<div class="vazio">Ninguém aguardando triagem.</div>';
      return;
    }
    area.innerHTML = fila.map((a) => `
      <div class="item-fila ${triagemSelecionada?.id_atendimento == a.id_atendimento ? 'selecionado' : ''}" data-id="${a.id_atendimento}">
        <div><strong>${esc(a.paciente)}</strong><span class="discreto">${esc(a.numero_atendimento)} · ${esc(a.idade)} anos</span></div>
        <span class="discreto">${esc(a.minutos_espera)} min</span>
      </div>`).join('');
    area._fila = fila;
  } catch (e) {
    area.innerHTML = `<div class="vazio">${esc(e.message)}</div>`;
  }
}

function formTriagem(a) {
  triagemSelecionada = a;
  document.querySelectorAll('.item-fila').forEach((el) => el.classList.toggle('selecionado', el.dataset.id == a.id_atendimento));
  const area = document.getElementById('area-triagem');
  area.className = 'card';
  area.innerHTML = `
    <div class="dados" style="margin-bottom:16px">
      <div><small>Atendimento</small><b>${esc(a.numero_atendimento)}</b></div>
      <div><small>Paciente</small><b>${esc(a.paciente)}</b></div>
      <div><small>Idade</small><b>${esc(a.idade)} anos</b></div>
      <div><small>Chegada</small><b>${dataHora(a.dt_chegada)}</b></div>
    </div>
    ${a.observacao ? `<p class="discreto">Recepção: ${esc(a.observacao)}</p>` : ''}
    <form id="form-triagem" class="grade">
      <label>Pressão sistólica (mmHg)<input name="pressao_sistolica" type="number" placeholder="120" required></label>
      <label>Pressão diastólica (mmHg)<input name="pressao_diastolica" type="number" placeholder="80" required></label>
      <label>Temperatura (°C)<input name="temperatura" type="number" step="0.1" placeholder="36.5" required></label>
      <label>Batimentos (bpm)<input name="frequencia_cardiaca" type="number" placeholder="80" required></label>
      <label class="inteiro">Queixas<textarea name="queixas" maxlength="500" required placeholder="O que o paciente relata"></textarea></label>
      <div class="inteiro">
        <label style="margin-bottom:6px">Protocolo de Manchester</label>
        <div class="manchester">
          ${CORES.map((c) => `
            <input type="radio" name="classificacao" id="cor-${c.nome}" value="${c.nome}" required>
            <label for="cor-${c.nome}" class="cor-${c.nome}">${c.nome}<span>${c.desc} · ${c.tempo}</span></label>`).join('')}
        </div>
      </div>
      <p id="triagem-erro" class="erro-texto inteiro"></p>
      <div class="inteiro"><button class="btn primario largo">Concluir triagem</button></div>
    </form>`;

  document.getElementById('form-triagem').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = document.getElementById('triagem-erro');
    erro.textContent = '';
    try {
      const r = await api('POST', '/triagem', { id_atendimento: Number(a.id_atendimento), ...dadosDoForm(e.target) });
      aviso(`${a.numero_atendimento} classificado como ${r.classificacao} e enviado ao painel.`);
      triagemSelecionada = null;
      area.className = 'vazio';
      area.textContent = 'Selecione um paciente da fila.';
      carregarFila();
    } catch (err) {
      erro.textContent = err.message;
    }
  });
}

document.getElementById('fila-triagem').addEventListener('click', (e) => {
  const item = e.target.closest('.item-fila');
  if (!item) return;
  const a = document.getElementById('fila-triagem')._fila.find((x) => x.id_atendimento == item.dataset.id);
  formTriagem(a);
});
document.getElementById('btn-atualizar-fila').addEventListener('click', carregarFila);

TELAS.triagem = carregarFila;
