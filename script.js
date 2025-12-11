let usuario = null;
let acessoLiberado = false;

// ================= CARREGAMENTO =====================

function carregarUsuario() {
    const salvo = localStorage.getItem("usuario");
    if (!salvo) {
        window.location.href = "index.html";
        return;
    }

    usuario = JSON.parse(salvo);

    if (!usuario.ativo) {
        window.location.href = "pagamento.html";
        return;
    }

    document.getElementById("bemVindoNome").innerText =
        "Olá, " + usuario.nome;

    gerarCodigoIndicacao();
    listarDietas();
}

// ================= CADASTRO =====================

function cadastrar() {
    const nome = document.getElementById("cadNome").value;
    const email = document.getElementById("cadEmail").value;
    const senha = document.getElementById("cadSenha").value;
    const indicador = document.getElementById("cadIndicador").value;

    usuario = {
        nome,
        email,
        senha,
        indicador,
        dietas: [],
        ativo: false
    };

    localStorage.setItem("usuario", JSON.stringify(usuario));

    window.location.href = "pagamento.html";
}

// ================= LOGIN =====================

function login() {
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;

    const salvo = JSON.parse(localStorage.getItem("usuario"));

    if (!salvo || salvo.email !== email || salvo.senha !== senha) {
        alert("Usuário ou senha inválidos");
        return;
    }

    usuario = salvo;

    if (!usuario.ativo) {
        window.location.href = "pagamento.html";
        return;
    }

    window.location.href = "app.html";
}

// ================= PAGAMENTO / PIX =====================

function gerarPix() {
    const chave = "35807794869";
    const nome = "Bruno Jeferson Dionisio Barbosa";
    const cidade = "SAO PAULO";
    const valor = "29.90";

    const payload =
`00020126580014BR.GOV.BCB.PIX01${chave.length}${chave}
5204000053039865405${valor}
5802BR59${nome.length}${nome}
6010${cidade}62070503***6304`;

    const codigo = payload.replace(/\s+/g, "");

    document.getElementById("pixCode").value = codigo;

    new QRCode(document.getElementById("qrcode"), {
        text: codigo,
        width: 240,
        height: 240
    });
}

function confirmarPagamento() {
    usuario.ativo = true;
    localStorage.setItem("usuario", JSON.stringify(usuario));
    window.location.href = "app.html";
}

// ================= SESSÃO =====================

function logout() {
    usuario = null;
    localStorage.removeItem("usuario");
    window.location.href = "index.html";
}

// ================= NAVEGAÇÃO =====================

function mostrarPagina(p) {
    document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));
    document.getElementById(p + "Page").classList.remove("hidden");
}

// ================= DIETAS =====================

function gerarDieta() {
    const idade = document.getElementById("idade").value;
    const altura = document.getElementById("altura").value;
    const peso = document.getElementById("peso").value;
    const objetivo = document.getElementById("objetivo").value;

    const dieta =
`Dieta Personalizada
Idade: ${idade}
Altura: ${altura}
Peso: ${peso}
Objetivo: ${objetivo}

Refeições recomendadas:
Café da manhã: ovos + frutas
Almoço: arroz + proteína + legumes
Jantar: leve + proteína`;

    document.getElementById("dietaResultado").innerText = dieta;

    mostrarPagina("dietaGerada");
}

function salvarDieta() {
    usuario.dietas.push(document.getElementById("dietaResultado").innerText);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    alert("Dieta salva!");
}

function listarDietas() {
    if (!usuario || !usuario.dietas) return;

    document.getElementById("listaDietas").innerText =
        usuario.dietas.join("\n\n-----------------\n\n");
}

// ================= INDICAÇÃO =====================

function gerarCodigoIndicacao() {
    const codigo = btoa(usuario.email).substring(0, 8);

    usuario.codigo = codigo;
    localStorage.setItem("usuario", JSON.stringify(usuario));

    const link = window.location.origin + "/dietaexata/cadastro.html?indicador=" + codigo;

    document.getElementById("meuCodigo").innerText = codigo;
    document.getElementById("meuLink").innerText = link;
}

function copiarCodigo() {
    navigator.clipboard.writeText(usuario.codigo);
    alert("Código copiado!");
}

function copiarLink() {
    navigator.clipboard.writeText(document.getElementById("meuLink").innerText);
    alert("Link copiado!");
}
