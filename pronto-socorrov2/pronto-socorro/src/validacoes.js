const { ErroApi } = require('./erros');

const CORES = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'];

const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const texto = (v) => (v === undefined || v === null ? '' : String(v).trim());
const textoOuNulo = (v) => texto(v) || null;

function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(cpf[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(cpf[t])) return false;
  }
  return true;
}

function idValido(valor, nome = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErroApi(400, `${nome} inválido.`);
  return n;
}

function obrigatorio(valor, nome, max) {
  const v = texto(valor);
  if (!v) throw new ErroApi(400, `Preencha o campo ${nome}.`);
  if (max && v.length > max) throw new ErroApi(400, `${nome} pode ter no máximo ${max} caracteres.`);
  return v;
}

function opcional(valor, nome, max) {
  const v = textoOuNulo(valor);
  if (v && max && v.length > max) throw new ErroApi(400, `${nome} pode ter no máximo ${max} caracteres.`);
  return v;
}

function validarPaciente(b) {
  const cpf = digitos(b.cpf) || null;
  if (cpf && !cpfValido(cpf)) throw new ErroApi(400, 'CPF inválido.');
  const nascimento = obrigatorio(b.data_nascimento, 'data de nascimento');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento) || isNaN(new Date(nascimento)) || new Date(nascimento) > new Date()) {
    throw new ErroApi(400, 'Data de nascimento inválida.');
  }
  const sexo = textoOuNulo(b.sexo);
  if (sexo && !['M', 'F'].includes(sexo)) throw new ErroApi(400, 'Sexo deve ser M ou F.');
  const cep = digitos(b.cep) || null;
  if (cep && cep.length !== 8) throw new ErroApi(400, 'CEP deve ter 8 dígitos.');
  const uf = textoOuNulo(b.uf)?.toUpperCase() || null;
  if (uf && !/^[A-Z]{2}$/.test(uf)) throw new ErroApi(400, 'UF deve ter 2 letras.');
  const telefone = digitos(b.telefone) || null;
  if (telefone && (telefone.length < 10 || telefone.length > 11)) throw new ErroApi(400, 'Telefone deve ter DDD + número.');
  return {
    nome: obrigatorio(b.nome, 'nome', 100),
    cpf,
    rg: opcional(b.rg, 'RG', 20),
    data_nascimento: nascimento,
    sexo,
    nome_mae: opcional(b.nome_mae, 'nome da mãe', 100),
    nome_pai: opcional(b.nome_pai, 'nome do pai', 100),
    telefone,
    cep,
    logradouro: opcional(b.logradouro, 'logradouro', 100),
    numero: opcional(b.numero, 'número', 10),
    complemento: opcional(b.complemento, 'complemento', 50),
    bairro: opcional(b.bairro, 'bairro', 60),
    cidade: opcional(b.cidade, 'cidade', 60),
    uf
  };
}

function numeroNaFaixa(valor, nome, min, max, inteiro = true) {
  const n = Number(String(valor ?? '').replace(',', '.'));
  if (valor === '' || valor === null || valor === undefined || isNaN(n)) throw new ErroApi(400, `Informe ${nome}.`);
  if (inteiro && !Number.isInteger(n)) throw new ErroApi(400, `${nome} deve ser um número inteiro.`);
  if (n < min || n > max) throw new ErroApi(400, `${nome} deve estar entre ${min} e ${max}.`);
  return n;
}

function validarCor(cor) {
  if (!CORES.includes(cor)) throw new ErroApi(400, `Classificação deve ser: ${CORES.join(', ')}.`);
  return cor;
}

function validarTriagem(b) {
  const sistolica = numeroNaFaixa(b.pressao_sistolica, 'a pressão sistólica', 40, 300);
  const diastolica = numeroNaFaixa(b.pressao_diastolica, 'a pressão diastólica', 20, 200);
  if (diastolica >= sistolica) throw new ErroApi(400, 'A pressão sistólica deve ser maior que a diastólica.');
  return {
    pressao_sistolica: sistolica,
    pressao_diastolica: diastolica,
    temperatura: numeroNaFaixa(b.temperatura, 'a temperatura', 30, 45, false),
    frequencia_cardiaca: numeroNaFaixa(b.frequencia_cardiaca, 'a frequência cardíaca', 20, 250),
    queixas: obrigatorio(b.queixas, 'queixas', 500),
    classificacao: validarCor(b.classificacao)
  };
}

function validarPrescricao(b) {
  return {
    medicamento: obrigatorio(b.medicamento, 'medicamento', 100),
    dosagem: obrigatorio(b.dosagem, 'dosagem', 50),
    via_administracao: obrigatorio(b.via_administracao, 'via de administração', 20),
    frequencia: opcional(b.frequencia, 'frequência', 50)
  };
}

module.exports = { CORES, digitos, texto, textoOuNulo, cpfValido, idValido, obrigatorio, opcional, validarPaciente, validarTriagem, validarCor, validarPrescricao };
