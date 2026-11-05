let usuario = null;
let painelTimer = null;

const MENUS = {
  RECEPCIONISTA: [['recepcao', 'Recepção'], ['atendimentos', 'Atendimentos'], ['historico', 'Histórico']],
  ENFERMEIRO: [['triagem', 'Triagem'], ['painel', 'Painel'], ['historico', 'Histórico']],
  MEDICO: [['painel', 'Painel'], ['consulta', 'Meu atendimento'], ['historico', 'Histórico']]
};

const TELAS = {};

function mostrarLogin() {
  usuario = null;
  pararPainel();
  document.getElementById('app').hidden = true;
  document.getElementById('tela-login').hidden = false;
}

function iniciarApp(u) {
  usuario = u;
  document.getElementById('tela-login').hidden = true;
  document.getElementById('app').hidden = false;
  document.getElementById('usuario-nome').textContent = u.nome;
  document.getElementById('usuario-funcao').textContent = u.funcao;
  document.getElementById('menu').innerHTML = MENUS[u.funcao]
    .map(([id, nome]) => `<a href="#${id}" data-view="${id}">${nome}</a>`)
    .join('');
  const atual = location.hash.slice(1).split('/')[0];
  if (MENUS[u.funcao].some(([id]) => id === atual)) mudarTela();
  else location.hash = MENUS[u.funcao][0][0];
}

function mudarTela() {
  if (!usuario) return;
  const [tela, parametro] = location.hash.slice(1).split('/');
  const permitida = MENUS[usuario.funcao].some(([id]) => id === tela);
  if (!permitida) return (location.hash = MENUS[usuario.funcao][0][0]);
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== 'view-' + tela));
  document.querySelectorAll('#menu a').forEach((a) => a.classList.toggle('ativo', a.dataset.view === tela));
  pararPainel();
  if (TELAS[tela]) TELAS[tela](parametro);
}

window.addEventListener('hashchange', mudarTela);

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = document.getElementById('login-erro');
  erro.textContent = '';
  try {
    const u = await api('POST', '/login', dadosDoForm(e.target));
    e.target.reset();
    iniciarApp(u);
  } catch (err) {
    erro.textContent = err.message;
  }
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await api('POST', '/logout').catch(() => {});
  location.replace('/');
});

function pararPainel() {
  clearInterval(painelTimer);
  painelTimer = null;
}

api('GET', '/me').then(iniciarApp).catch(mostrarLogin);
