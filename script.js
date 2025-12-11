// -------------------------------------------------
// DietaExata - script.js (frontend)
// Requisitos: BACKEND_URL apontando para o backend Render
// Backend deve expor /gerar-pix (POST) e /api/payment/:id (GET)
// -------------------------------------------------

const BACKEND_URL = "https://SEU_BACKEND_RENDER_URL"; // <<< substitua pelo seu URL (Render)
const PAYMENT_AMOUNT = 19.99; // valor da assinatura
const COMMISSION_RATE = 0.5;  // 50% do primeiro pagamento

// APP STATE
let usuario = null;
let lastPaymentId = null;

// ------------------ UTIL ------------------
function $(id){ return document.getElementById(id); }
function show(id){ $(id).classList.remove('hidden'); }
function hide(id){ $(id).classList.add('hidden'); }
function mostrarPagina(page){
  // esconder todas
  document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
  // menu
  if (localStorage.getItem('usuario')) show('menu'); else hide('menu');
  // show page
  show(page + 'Page');
  // hooks
  if (page === 'bemVindo') updateWelcome();
  if (page === 'minhasDietas') listarDietas();
  if (page === 'indicacao') gerarCodigoIndicacao();
  if (page === 'indicacoesUsuario') carregarIndicacoes();
}

// ------------------ AUTH ------------------
function mostrarCadastro(){ mostrarPagina('cadastro'); }
function mostrarLogin(){ mostrarPagina('login'); }

function cadastrar(){
  const nome = $('cadNome').value?.trim();
  const email = $('cadEmail').value?.trim();
  const senha = $('cadSenha').value;
  const indicador = $('cadIndicador').value?.trim();

  if (!nome || !email || !senha) return alert('Preencha nome, email e senha');

  const novo = {
    nome, email, senha, indicador: indicador || null,
    dietas: [], ativo: false, codigo: null
  };

  // gravar por email (simples)
  localStorage.setItem('usuario_' + email, JSON.stringify(novo));
  // set current
  localStorage.setItem('usuario', JSON.stringify(novo));
  usuario = novo;

  // se veio com indicador do link (query) registre (será processado quando o indicado pagar)
  mostrarPagina('pagamento');
  gerarPixFront();
}

function login(){
  const email = $('loginEmail').value?.trim();
  const senha = $('loginSenha').value;

  const salvo = JSON.parse(localStorage.getItem('usuario_' + email));
  if (!salvo) return alert('Usuário não encontrado');
  if (salvo.senha !== senha) return alert('Senha incorreta');

  localStorage.setItem('usuario', JSON.stringify(salvo));
  usuario = salvo;

  if (!usuario.ativo){
    mostrarPagina('pagamento');
    gerarPixFront();
    return;
  }

  mostrarPagina('bemVindo');
}

// ------------------ WELCOME ------------------
function updateWelcome(){
  usuario = JSON.parse(localStorage.getItem('usuario') || null);
  if (!usuario) { mostrarPagina('login'); return; }
  $('bemVindoNome').innerText = 'Olá, ' + usuario.nome;
  // ensure code
  if (!usuario.codigo) {
    usuario.codigo = gerarCodigo(usuario.email);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }
  gerarCodigoIndicacao();
  show('menu');
}

// ------------------ DIETA ------------------
function gerarDieta(){
  const text = `Dieta Personalizada
Idade: ${$('idade').value}
Altura: ${$('altura').value}
Peso: ${$('peso').value}
Objetivo: ${$('objetivo').value}

Horários: ${$('horarios').value}
Gosta: ${$('gostos').value}
Restrições: ${$('restricoes').value}
Acorda: ${$('acorda').value} - Dorme: ${$('dorme').value}
`;
  $('dietaResultado').innerText = text;
  mostrarPagina('dietaGerada');
}

function salvarDieta(){
  usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) return alert('Usuário não encontrado');
  usuario.dietas = usuario.dietas || [];
  usuario.dietas.push($('dietaResultado').innerText);
  localStorage.setItem('usuario', JSON.stringify(usuario));
  localStorage.setItem('usuario_' + usuario.email, JSON.stringify(usuario));
  alert('Dieta salva!');
}

function listarDietas(){
  usuario = JSON.parse(localStorage.getItem('usuario'));
  const list = (usuario && usuario.dietas && usuario.dietas.length) ? usuario.dietas.join('\n\n------\n\n') : 'Nenhuma dieta salva.';
  $('listaDietas').innerText = list;
}

// ------------------ INDICAÇÃO / CÓDIGO ------------------
function gerarCodigo(email){ return 'DEX-' + btoa(email).substring(0,8); }

function gerarCodigoIndicacao(){
  usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) return;
  if (!usuario.codigo) {
    usuario.codigo = gerarCodigo(usuario.email);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }
  $('meuCodigo').innerText = usuario.codigo;
  const link = window.location.origin + window.location.pathname + '?indicador=' + usuario.codigo;
  $('meuLink').innerText = link;
}

// ------------------ INDICAÇÕES / SALDOS ------------------
// estrutura localStorage 'indicacoes' : { codigo: { lista: [emails], saldo: number } }
function registrarIndicacaoPara(referrerCode, newUserEmail){
  if (!referrerCode) return;
  const indicacoes = JSON.parse(localStorage.getItem('indicacoes') || '{}');
  if (!indicacoes[referrerCode]) indicacoes[referrerCode] = { lista: [], saldo: 0 };
  // evitar duplicados
  if (!indicacoes[referrerCode].lista.includes(newUserEmail)) {
    indicacoes[referrerCode].lista.push(newUserEmail);
    indicacoes[referrerCode].saldo = +( (indicacoes[referrerCode].saldo || 0) + (PAYMENT_AMOUNT * COMMISSION_RATE) ).toFixed(2);
  }
  localStorage.setItem('indicacoes', JSON.stringify(indicacoes));
}
function carregarIndicacoes(){
  usuario = JSON.parse(localStorage.getItem('usuario') || null);
  if (!usuario) return mostrarPagina('login');

  const indicacoes = JSON.parse(localStorage.getItem('indicacoes') || '{}');
  const data = indicacoes[usuario.codigo] || { lista: [], saldo: 0 };
  $('totalIndicados').innerText = (data.lista.length || 0);
  $('saldoIndicacoes').innerText = 'R$ ' + (data.saldo || 0).toFixed(2);

  // historico saques
  const saques = JSON.parse(localStorage.getItem('saques') || '[]');
  const userSaques = saques.filter(s => s.email === usuario.email);
  $('historicoSaques').innerText = userSaques.length ? userSaques.map(s => `R$ ${s.valor.toFixed(2)} — ${s.data}`).join('\n') : 'Nenhum saque solicitado.';
}

// ------------------ SOLICITAR SAQUE ------------------
function solicitarSaque(){
  usuario = JSON.parse(localStorage.getItem('usuario') || null);
  if (!usuario) return alert('Faça login antes.');

  const indicacoes = JSON.parse(localStorage.getItem('indicacoes') || '{}');
  const data = indicacoes[usuario.codigo] || { lista: [], saldo: 0 };
  const saldo = +(data.saldo || 0);
  if (saldo < 1) return alert('Saldo insuficiente para saque.');

  // gravar pedido de saque
  const saques = JSON.parse(localStorage.getItem('saques') || '[]');
  const pedido = { id: Date.now().toString(), email: usuario.email, valor: saldo, data: new Date().toLocaleString() };
  saques.push(pedido);
  localStorage.setItem('saques', JSON.stringify(saques));

  // zerar saldo do indicador (a gestão real do pagamento deve ser feita pelo backend / admin)
  indicacoes[usuario.codigo].saldo = 0;
  localStorage.setItem('indicacoes', JSON.stringify(indicacoes));

  alert('Saque solicitado. Em breve entraremos em contato para transferência.');
  carregarIndicacoes();
}

// ------------------ PAGAMENTO (BACKEND) ------------------
// Gera pagamento via backend seguro (Render)
async function gerarPixFront(){
  usuario = JSON.parse(localStorage.getItem('usuario') || null);
  const email = (usuario && usuario.email) || prompt('Digite seu email para gerar o pagamento:');
  try {
    $('pagamentoStatus').innerText = 'Gerando pagamento...';
    const res = await fetch(BACKEND_URL + '/gerar-pix', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ valor: PAYMENT_AMOUNT, descricao: 'DietaExata - Assinatura', email, nome: usuario?.nome || 'Cliente' })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('erro', data);
      $('pagamentoStatus').innerText = 'Erro ao gerar pagamento';
      return alert('Erro gerar PIX: ' + (data.error || JSON.stringify(data)));
    }

    // mostrar QR
    if (data.qr_base64) {
      $('qrcode').innerHTML = `<img src="data:image/png;base64,${data.qr_base64}" style="max-width:260px">`;
      $('pixCode').value = data.qr_code || '';
    } else if (data.qr_code) {
      $('qrcode').innerHTML = `<div class="small">Copia & Cola</div>`;
      $('pixCode').value = data.qr_code;
    }

    lastPaymentId = data.id;
    localStorage.setItem('lastPaymentId', lastPaymentId);
    $('pagamentoStatus').innerText = 'Pagamento criado. Escaneie o QR ou copie o código.';
  } catch (err) {
    console.error(err);
    $('pagamentoStatus').innerText = 'Falha ao conectar com o servidor';
    alert('Erro ao gerar pagamento: veja console');
  }
}

async function verificarPagamentoFront(){
  const paymentId = localStorage.getItem('lastPaymentId');
  if (!paymentId) return alert('Nenhum pagamento gerado.');
  try {
    const res = await fetch(BACKEND_URL + '/api/payment/' + paymentId);
    const data = await res.json();
    if (!res.ok) {
      console.error('erro status', data);
      return alert('Erro ao consultar pagamento');
    }
    // status examples: approved, pending, rejected
    const status = (data.status || data.mp?.status || '').toLowerCase();
    $('pagamentoStatus').innerText = 'Status: ' + status;
    if (status === 'approved' || status === 'paid' || status === 'success') {
      // marcar usuário como ativo localmente
      usuario = JSON.parse(localStorage.getItem('usuario') || null);
      if (!usuario) return alert('Usuário não encontrado');
      usuario.ativo = true;
      localStorage.setItem('usuario', JSON.stringify(usuario));
      localStorage.setItem('usuario_' + usuario.email, JSON.stringify(usuario));

      // se o usuário veio com código indicador (query) devemos creditar o indicador com 50% do valor (apenas no primeiro pagamento)
      const urlParams = new URLSearchParams(window.location.search);
      const indicador = urlParams.get('indicador') || usuario.indicador;
      if (indicador) {
        registrarIndicacaoPara(indicador, usuario.email);
      }

      alert('Pagamento confirmado! Acesso liberado.');
      mostrarPagina('bemVindo');
      return;
    } else {
      alert('Pagamento não confirmado. Status: ' + status);
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao verificar pagamento.');
  }
}

// ------------------ helpers para copiar ------------------
function copiarCodigo(){ navigator.clipboard.writeText($('meuCodigo').innerText); alert('Código copiado'); }
function copiarLink(){ navigator.clipboard.writeText($('meuLink').innerText); alert('Link copiado'); }

// ------------------ inicialização (on load) ------------------
(function init(){
  // se tiver query ?indicador=... salvar no campo de cadastro automático
  const params = new URLSearchParams(window.location.search);
  const indicador = params.get('indicador');
  if (indicador) {
    // guardar para usar no cadastro
    document.addEventListener('DOMContentLoaded', ()=> {
      const el = $('cadIndicador');
      if (el) el.value = indicador;
    });
  }

  // recuperar usuário e decidir tela inicial
  usuario = JSON.parse(localStorage.getItem('usuario') || null);
  if (!usuario) {
    mostrarPagina('login');
  } else if (!usuario.ativo) {
    mostrarPagina('pagamento');
    // tentar gerar pix automaticamente (comentado para não gerar sem ação)
    // gerarPixFront();
  } else {
    mostrarPagina('bemVindo');
  }

  // preload indicacoes structure if missing
  if (!localStorage.getItem('indicacoes')) localStorage.setItem('indicacoes', JSON.stringify({}));
})();
