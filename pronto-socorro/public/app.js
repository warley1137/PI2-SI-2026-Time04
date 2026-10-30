const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataHora = d => d ? new Date(d.replace(' ', 'T')).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const dataSo = d => d ? d.slice(0, 10).split('-').reverse().join('/') : '—';
const COR = { Vermelho: '#b8423b', Laranja: '#c9772e', Amarelo: '#c9a227', Verde: '#4f8a5b', Azul: '#4a78a6' };
const PERFIL = { RECEPCIONISTA: 'Recepção', ENFERMEIRO: 'Enfermagem', MEDICO: 'Médico' };
const TAB_DO_PERFIL = { RECEPCIONISTA: 'recepcao', ENFERMEIRO: 'triagem', MEDICO: 'medico' };
const PERFIL_DA_TAB = { recepcao: 'RECEPCIONISTA', triagem: 'ENFERMEIRO', medico: 'MEDICO' };
let usuario = null;
let destino = null;
const STATUS = { AGUARDANDO_TRIAGEM: 'Aguardando triagem', AGUARDANDO_MEDICO: 'Aguardando médico', EM_ATENDIMENTO: 'Em atendimento', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado' };

async function api(url, body) {
  const opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login') { usuario = null; atualizarMenu(); ir('login'); }
  if (!r.ok) throw new Error(d.erro || 'Algo deu errado. Tente de novo.');
  return d;
}

let tt;
function aviso(msg, erro) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (erro ? ' err' : '');
  clearTimeout(tt);
  tt = setTimeout(() => (t.className = ''), 3500);
}

const acao = fn => async e => {
  e.preventDefault();
  try { await fn(e.target); } catch (err) { aviso(err.message, true); }
};
const dadosForm = f => Object.fromEntries(new FormData(f));

function tabela(el, cols, linhas, vazio) {
  if (!linhas.length) { el.innerHTML = `<tbody><tr><td class="empty">${vazio}</td></tr></tbody>`; return; }
  el.innerHTML = '<thead><tr>' + cols.map(c => `<th>${c[0]}</th>`).join('') + '</tr></thead><tbody>' +
    linhas.map(l => '<tr>' + cols.map(c => `<td>${c[1](l)}</td>`).join('') + '</tr>').join('') + '</tbody>';
}
const selo = c => c ? `<span class="badge" style="--c:${COR[c]}">${c}</span>` : '—';

const carregar = {
  async login() {},
  async inicio() {
    const { por } = await api('/api/resumo');
    $$('[data-m]').forEach(el => (el.textContent = por[el.dataset.m] || 0));
  },
  async recepcao() {
    const pac = await api('/api/pacientes');
    $('#sel-paciente').innerHTML = pac.length
      ? pac.map(p => `<option value="${p.id_paciente}">${esc(p.nome)}</option>`).join('')
      : '<option value="">Cadastre um paciente primeiro</option>';
    const at = await api('/api/atendimentos');
    tabela($('#t-atend'), [
      ['Número', a => esc(a.numero_atendimento)],
      ['Paciente', a => esc(a.paciente)],
      ['Chegada', a => dataHora(a.dt_chegada)],
      ['Status', a => STATUS[a.status]],
      ['', a => ['FINALIZADO', 'CANCELADO'].includes(a.status) ? '' : `<button class="btn ghost small" data-cancelar="${a.id_atendimento}">Cancelar</button>`]
    ], at, 'Nenhum atendimento ainda. Cadastre um paciente e abra o primeiro.');
  },
  async triagem() {
    const at = await api('/api/atendimentos?status=AGUARDANDO_TRIAGEM');
    $('#sel-triagem').innerHTML = at.length
      ? at.map(a => `<option value="${a.id_atendimento}">${esc(a.numero_atendimento)} · ${esc(a.paciente)}</option>`).join('')
      : '<option value="">Nenhum paciente aguardando triagem</option>';
    if (!$('#chips').children.length) {
      $('#chips').innerHTML = Object.keys(COR).map((c, i) =>
        `<label class="chip" style="--c:${COR[c]}"><input type="radio" name="classificacao" value="${c}" ${i === 0 ? 'required' : ''}><span>${c}</span></label>`).join('');
    }
  },
  async medico() {
    const fila = await api('/api/painel');
    $('#fila-medico').innerHTML = fila.length ? fila.map(p => `
      <div class="item ${sel === p.id_atendimento ? 'on' : ''}" style="--c:${COR[p.classificacao]}">
        <div><strong>${esc(p.paciente)}</strong> ${selo(p.classificacao)}<small>${esc(p.queixas)}</small></div>
        <button class="btn ${p.status === 'EM_ATENDIMENTO' ? 'ghost' : 'primary'} small" data-atender="${p.id_atendimento}" data-status="${p.status}" data-nome="${esc(p.paciente)}">${p.status === 'EM_ATENDIMENTO' ? 'Continuar' : 'Atender'}</button>
      </div>`).join('') : '<p class="empty">Ninguém na fila. Quando a triagem enviar alguém, aparece aqui.</p>';
    if (sel) await mostrarPresc();
  },
  async painel() {
    const p = await api('/api/painel');
    tabela($('#t-painel'), [
      ['Risco', x => selo(x.classificacao)],
      ['Número', x => esc(x.numero_atendimento)],
      ['Paciente', x => `${esc(x.paciente)} <span class="muted">(${x.idade} anos)</span>`],
      ['Queixas', x => esc(x.queixas)],
      ['Espera', x => `<span class="${x.minutos_espera > x.tempo_max_espera_min ? 'late' : ''}">${x.minutos_espera} min</span> <span class="muted">/ ${x.tempo_max_espera_min}</span>`],
      ['Status', x => STATUS[x.status]]
    ], p, 'Fila vazia. Nenhum paciente aguardando o médico.');
  },
  async prontuario() {
    const p = await api('/api/prontuarios');
    tabela($('#t-pront'), [
      ['Número', x => esc(x.numero_atendimento)],
      ['Paciente', x => esc(x.paciente)],
      ['Risco', x => selo(x.classificacao)],
      ['Queixas', x => esc(x.queixas || '—')],
      ['Prescrições', x => x.prescricoes],
      ['Anotação', x => esc(x.anotacao || '—')],
      ['Status', x => STATUS[x.status]]
    ], p, 'Nenhum registro ainda.');
  }
};

let sel = null;
async function mostrarPresc() {
  const lista = await api('/api/prescricoes/' + sel);
  $('#lista-presc').innerHTML = lista.length
    ? lista.map(r => `<li><strong>${esc(r.medicamento)}</strong> · ${esc(r.dosagem)} · ${esc(r.via_administracao)}${r.frequencia ? ' · ' + esc(r.frequencia) : ''}</li>`).join('')
    : '<li class="muted">Nenhuma medicação prescrita ainda.</li>';
}

function atualizarMenu() {
  $('#quem').hidden = !usuario;
  $('#b-sair').hidden = !usuario;
  $('#b-entrar').hidden = !!usuario;
  if (usuario) $('#quem').innerHTML = `${esc(usuario.nome)}<small>${PERFIL[usuario.funcao]}</small>`;
  $$('[data-go]').forEach(el => {
    const exigido = PERFIL_DA_TAB[el.dataset.go];
    el.hidden = (el.id === 'b-entrar' && !!usuario) || (!!usuario && !!exigido && exigido !== usuario.funcao);
  });
}

async function ir(nome) {
  if (!carregar[nome]) nome = 'inicio';
  const protegida = nome in PERFIL_DA_TAB || nome === 'painel' || nome === 'prontuario';
  if (protegida && !usuario) { destino = nome; nome = 'login'; }
  else if (usuario && PERFIL_DA_TAB[nome] && PERFIL_DA_TAB[nome] !== usuario.funcao) {
    aviso('Seu perfil não tem acesso a essa área.', true);
    nome = TAB_DO_PERFIL[usuario.funcao];
  }
  $$('[data-tab]').forEach(s => (s.hidden = s.dataset.tab !== nome));
  $$('.tabs button').forEach(b => b.dataset.go === nome ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (location.hash !== '#' + nome) history.replaceState(null, '', '#' + nome);
  window.scrollTo({ top: 0 });
  try { await carregar[nome](); } catch (e) { aviso(e.message, true); }
}

document.addEventListener('click', async e => {
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); return ir(go.dataset.go); }
  const canc = e.target.closest('[data-cancelar]');
  if (canc) {
    const motivo = prompt('Motivo do cancelamento:');
    if (!motivo) return;
    try { await api(`/api/atendimentos/${canc.dataset.cancelar}/cancelar`, { motivo }); aviso('Atendimento cancelado.'); carregar.recepcao(); }
    catch (err) { aviso(err.message, true); }
  }
  const at = e.target.closest('[data-atender]');
  if (at) {
    try {
      if (at.dataset.status === 'AGUARDANDO_MEDICO') await api(`/api/atendimentos/${at.dataset.atender}/iniciar`, {});
      sel = Number(at.dataset.atender);
      $('#sel-titulo').textContent = at.dataset.nome;
      $('#sel-sub').textContent = 'Em atendimento';
      $('#f-presc').hidden = false;
      $('#f-final').hidden = false;
      await carregar.medico();
    } catch (err) { aviso(err.message, true); }
  }
});

$('#f-paciente').addEventListener('submit', acao(async f => {
  await api('/api/pacientes', dadosForm(f));
  f.reset(); aviso('Paciente salvo.'); carregar.recepcao();
}));
$('#f-atend').addEventListener('submit', acao(async f => {
  await api('/api/atendimentos', dadosForm(f));
  f.reset(); aviso('Atendimento aberto.'); carregar.recepcao();
}));
$('#f-triagem').addEventListener('submit', acao(async f => {
  await api('/api/triagem', dadosForm(f));
  f.reset(); aviso('Triagem salva. Paciente enviado ao médico.'); carregar.triagem();
}));
$('#f-presc').addEventListener('submit', acao(async f => {
  await api('/api/prescricoes', { ...dadosForm(f), id_atendimento: sel });
  f.reset(); aviso('Medicação adicionada.'); mostrarPresc();
}));
$('#f-final').addEventListener('submit', acao(async f => {
  await api(`/api/atendimentos/${sel}/finalizar`, dadosForm(f));
  sel = null; f.reset();
  $('#sel-titulo').textContent = 'Selecionar paciente';
  $('#sel-sub').textContent = 'Escolha alguém na fila.';
  $('#f-presc').hidden = true; f.hidden = true; $('#lista-presc').innerHTML = '';
  aviso('Atendimento finalizado.'); carregar.medico();
}));

$('#f-login').addEventListener('submit', acao(async f => {
  usuario = await api('/api/login', dadosForm(f));
  f.reset();
  atualizarMenu();
  const alvo = destino && (!PERFIL_DA_TAB[destino] || PERFIL_DA_TAB[destino] === usuario.funcao) ? destino : TAB_DO_PERFIL[usuario.funcao];
  destino = null;
  aviso('Bem-vindo, ' + usuario.nome + '.');
  ir(alvo);
}));
$('#b-sair').addEventListener('click', async () => {
  await api('/api/logout', {}).catch(() => {});
  usuario = null; sel = null; destino = null;
  atualizarMenu();
  ir('inicio');
});

window.addEventListener('hashchange', () => ir(location.hash.slice(1)));
(async () => {
  try { usuario = await api('/api/me'); } catch { usuario = null; }
  atualizarMenu();
  ir(location.hash.slice(1) || 'inicio');
})();
