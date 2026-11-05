async function api(metodo, url, corpo) {
  const opcoes = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (corpo !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }
  const resposta = await fetch('/api' + url, opcoes);
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    if (resposta.status === 401 && url !== '/login' && url !== '/me') mostrarLogin();
    const erro = new Error(dados.erro || 'Erro ao falar com o servidor.');
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

const CORES = [
  { nome: 'Vermelho', desc: 'Emergência', tempo: 'Imediato' },
  { nome: 'Laranja', desc: 'Muito urgente', tempo: '10 min' },
  { nome: 'Amarelo', desc: 'Urgente', tempo: '60 min' },
  { nome: 'Verde', desc: 'Pouco urgente', tempo: '120 min' },
  { nome: 'Azul', desc: 'Não urgente', tempo: '240 min' }
];

const STATUS_TEXTO = {
  AGUARDANDO_TRIAGEM: 'Aguardando triagem',
  AGUARDANDO_MEDICO: 'Aguardando médico',
  EM_ATENDIMENTO: 'Em atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado'
};

function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dataHora(valor) {
  if (!valor) return '—';
  const [d, h = ''] = String(valor).split(/[ T]/);
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}${h ? ' ' + h.slice(0, 5) : ''}`;
}

function data(valor) {
  return valor ? dataHora(String(valor).slice(0, 10)) : '—';
}

function cpfFormatado(cpf) {
  const c = String(cpf || '');
  return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : (c || '—');
}

function tagStatus(status) {
  return `<span class="tag status-${esc(status)}">${esc(STATUS_TEXTO[status] || status)}</span>`;
}

function tagCor(cor) {
  return cor ? `<span class="cor cor-${esc(cor)}">${esc(cor)}</span>` : '<span class="discreto">—</span>';
}

function tabela(colunas, linhas, classe = '') {
  if (!linhas.length) return '<div class="vazio">Nenhum registro encontrado.</div>';
  return `<div class="tabela-wrap"><table class="${classe}">
    <thead><tr>${colunas.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${linhas.join('')}</tbody></table></div>`;
}

let avisoTimer;
function aviso(mensagem, tipo = 'ok') {
  const el = document.getElementById('aviso');
  el.textContent = mensagem;
  el.className = 'aviso' + (tipo === 'erro' ? ' erro' : '');
  el.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (el.hidden = true), 4000);
}

function abrirModal({ titulo, corpo, botoes = [] }) {
  const fundo = document.getElementById('modal');
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-corpo').innerHTML = corpo;
  const erro = document.getElementById('modal-erro');
  erro.textContent = '';
  const area = document.getElementById('modal-botoes');
  area.innerHTML = '';
  const fechar = () => (fundo.hidden = true);
  for (const b of [{ texto: 'Fechar', classe: 'fantasma' }, ...botoes]) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.classe || '');
    btn.textContent = b.texto;
    btn.onclick = async () => {
      if (!b.acao) return fechar();
      btn.disabled = true;
      try {
        await b.acao();
        fechar();
      } catch (e) {
        erro.textContent = e.message;
      } finally {
        btn.disabled = false;
      }
    };
    area.appendChild(btn);
  }
  fundo.hidden = false;
  const primeiro = fundo.querySelector('input, textarea, select');
  if (primeiro) primeiro.focus();
}

function dadosDoForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}
