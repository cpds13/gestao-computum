/* Gestão Computum — primeira versão de frontend.
   O armazenamento local abaixo é apenas modo protótipo.
   Em produção, substituir a camada store por Supabase e o upload por Google Drive.
*/

const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  googleDriveFolderId: '',
  googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSes_cqGBuoBI8rjiW2q5kkC0M9hrs5rrqpPijeEHQHmZ8dTXA/viewform?usp=pp_url',
  productionReady: false
};
/* =========================================================
   AUTENTICAÇÃO — SUPABASE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

async function carregarSessao() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error('Erro ao recuperar sessão:', error);
    mostrarLogin();
    return false;
  }

  if (!session?.user) {
    mostrarLogin();
    return false;
  }

  currentUser = session.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from('usuarios')
    .select('id, nome, email, perfil, ativo')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error('Erro ao carregar perfil:', profileError);
    mostrarLogin('Não foi possível carregar o perfil do usuário.');
    return false;
  }

  if (!profile.ativo) {
    await supabaseClient.auth.signOut();
    mostrarLogin('Este usuário está inativo.');
    return false;
  }

  currentProfile = profile;
  atualizarUsuarioInterface();

  return true;
}

function isCalculista() {
  return currentProfile?.perfil === 'calculista';
}

function isAdministrador() {
  return currentProfile?.perfil === 'administrador';
}

function minhasSolicitacoes() {
  if (!isCalculista()) return [];
  const nome = (currentProfile?.nome || '').trim().toLowerCase();
  return db.requests.filter(r =>
    (r.calculista || '').trim().toLowerCase() === nome
  );
}

function atualizarUsuarioInterface() {
  if (!currentProfile) return;

  const nome = currentProfile.nome || 'Usuário';

  const perfil = currentProfile.perfil
    ? currentProfile.perfil
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letra => letra.toUpperCase())
    : 'Usuário';

  const inicial = nome.trim().charAt(0).toUpperCase() || 'U';

  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarProfile = document.getElementById('sidebarUserProfile');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  const topbarName = document.getElementById('topbarUserName');
  const topbarAvatar = document.getElementById('topbarAvatar');

  if (sidebarName) sidebarName.textContent = nome;
  if (sidebarProfile) sidebarProfile.textContent = perfil;
  if (sidebarAvatar) sidebarAvatar.textContent = inicial;
  if (topbarName) topbarName.textContent = nome;
  if (topbarAvatar) topbarAvatar.textContent = inicial;

  if (currentProfile.perfil === 'calculista') {
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.style.display = button.dataset.view === 'dashboard' ? '' : 'none';
    });
    const dashboardButton = document.querySelector('.nav-item[data-view="dashboard"]');
    if (dashboardButton) dashboardButton.innerHTML = '<span>∑</span> Minha produção';
  }
}

function mostrarLogin(mensagem = '') {
  const appShell = document.getElementById('appShell');

  if (!appShell) return;

  appShell.innerHTML = `
    <div class="login-screen">
      <div class="login-card">

        <div class="login-brand">
          <div class="brand-mark"><span></span></div>
          <div>
            <strong>COMPUTUM</strong>
            <small>Gestão de Cálculos</small>
          </div>
        </div>

        <h1>Entrar</h1>
        <p class="login-subtitle">
          Acesse a Gestão Computum.
        </p>

        ${mensagem ? `
          <div class="login-message">
            ${mensagem}
          </div>
        ` : ''}

        <form id="loginForm">

          <div class="field">
            <label for="loginEmail">E-mail</label>
            <input
              id="loginEmail"
              type="email"
              class="input"
              autocomplete="email"
              required
            >
          </div>

          <div class="field">
            <label for="loginPassword">Senha</label>
            <input
              id="loginPassword"
              type="password"
              class="input"
              autocomplete="current-password"
              required
            >
          </div>

          <button
            type="submit"
            class="btn btn-primary login-button"
          >
            Entrar
          </button>

          <div id="loginError" class="login-error"></div>

        </form>

      </div>
    </div>
  `;

  const form = document.getElementById('loginForm');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const button = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById('loginError');

    button.disabled = true;
    button.textContent = 'Entrando...';
    errorBox.textContent = '';

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Erro de login:', error);
      errorBox.textContent = 'E-mail ou senha inválidos.';
      button.disabled = false;
      button.textContent = 'Entrar';
      return;
    }

    window.location.reload();
  });
}

/* =========================================================
   DADOS — SUPABASE
   ========================================================= */

const db = {
  requests: [],
  calculistas: [],
  advogados: [],
  clientes: [],
  processos: [],
  areas: [],
  tipos: [],
  save() {
    // A persistência no Supabase será feita pelas operações CRUD.
    // Nesta etapa, a leitura já vem do banco.
  }
};

function normalizarStatus(status) {
  const mapa = {
    NOVO: 'NOVO',
    ANALISE: 'ANALISE',
    AGUARDANDO_DOCUMENTOS: 'AGUARDANDO_DOCUMENTOS',
    EM_CALCULO: 'EM_CÁLCULO',
    EM_REVISAO: 'EM_REVISÃO',
    ENVIADO: 'ENVIADO',
    AGUARDANDO_PAGAMENTO: 'AGUARDANDO_PAGAMENTO',
    CONCLUIDO: 'CONCLUÍDO',
    IMPUGNACAO: 'IMPUGNADO',
    RETRABALHO: 'RETRABALHO',
    PAUSADO: 'PAUSADO',
    CANCELADO: 'CANCELADO'
  };

  return mapa[status] || status || 'NOVO';
}

function normalizarPrioridade(prioridade) {
  const mapa = {
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente'
  };

  return mapa[prioridade] || prioridade || 'Normal';
}

async function carregarSolicitacoes() {
  try {
    const [
      solicitacoesResult,
      advogadosResult,
      clientesResult,
      processosResult,
      areasResult,
      tiposResult,
      calculistasResult,
      usuariosResult,
      sistemasResult,
      pagamentosResult,
      historicoResult
    ] = await Promise.all([
      supabaseClient
        .from('solicitacoes')
        .select(`
          id,
          codigo,
          advogado_id,
          cliente_id,
          processo_id,
          area_id,
          tipo_servico_id,
          descricao,
          prazo,
          status,
          prioridade,
          calculista_id,
          revisor_id,
          tipo_entrega,
          data_solicitacao,
          data_inicio,
          data_conclusao,
          data_envio,
          valor_cobrado,
          desconto,
          valor_final,
          origem,
          cliente_antigo,
          google_drive_folder_id,
          google_drive_url,
          observacoes,
          created_by,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false }),

      supabaseClient
        .from('advogados')
        .select('id, nome, origem, ativo'),

      supabaseClient
        .from('clientes')
        .select('id, nome, cpf'),

      supabaseClient
        .from('processos')
        .select('id, numero_processo, cliente_id'),

      supabaseClient
        .from('areas_servico')
        .select('id, nome, ativo, ordem'),

      supabaseClient
        .from('tipos_servico')
        .select('id, area_id, nome, ativo, ordem'),

      supabaseClient
        .from('calculistas')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('nome'),

      supabaseClient
        .from('usuarios')
        .select('id, nome, email, perfil, ativo'),

      supabaseClient
        .from('sistemas_especializados')
        .select('id, nome, url, area_id, descricao, ativo, ordem'),

      supabaseClient
        .from('pagamentos')
        .select('id, solicitacao_id, valor, data_pagamento, forma_pagamento, observacao'),

      supabaseClient
        .from('historico_solicitacao')
        .select('id, solicitacao_id, usuario_id, tipo_evento, descricao, data_hora')
        .order('data_hora', { ascending: true })
    ]);

    const resultados = [
      solicitacoesResult,
      advogadosResult,
      clientesResult,
      processosResult,
      areasResult,
      tiposResult,
      calculistasResult,
      usuariosResult,
      sistemasResult,
      pagamentosResult,
      historicoResult
    ];

    const erro = resultados.find(resultado => resultado.error);

    if (erro) {
      console.error('Erro ao carregar dados do Supabase:', erro.error);

      $('#content').innerHTML = `
        <div class="card" style="padding:24px">
          <h2>Não foi possível carregar as solicitações.</h2>
          <p class="muted" style="margin-top:8px">
            Verifique a conexão com o Supabase e tente novamente.
          </p>
        </div>
      `;

      return false;
    }

    const solicitacoes = solicitacoesResult.data || [];
    const advogados = advogadosResult.data || [];
    const clientes = clientesResult.data || [];
    const processos = processosResult.data || [];
    const areas = areasResult.data || [];
    const tipos = tiposResult.data || [];
    const calculistas = calculistasResult.data || [];
    const usuarios = usuariosResult.data || [];

    db.calculistas = calculistas;
    db.advogados = advogados;
    db.clientes = clientes;
    db.processos = processos;
    db.areas = areas;
    db.tipos = tipos;

    const sistemas = sistemasResult.data || [];
    const pagamentos = pagamentosResult.data || [];
    const historico = historicoResult.data || [];

    const advogadoMap = new Map(
      advogados.map(item => [item.id, item])
    );

    const clienteMap = new Map(
      clientes.map(item => [item.id, item])
    );

    const processoMap = new Map(
      processos.map(item => [item.id, item])
    );

    const areaMap = new Map(
      areas.map(item => [item.id, item])
    );

    const tipoMap = new Map(
      tipos.map(item => [item.id, item])
    );

    const usuarioMap = new Map(
      usuarios.map(item => [item.id, item])
    );

    const sistemaMap = new Map(
      sistemas.map(item => [item.area_id, item])
    );

    const pagamentosPorSolicitacao = new Map();

    pagamentos.forEach(pagamento => {
      const atual =
        pagamentosPorSolicitacao.get(pagamento.solicitacao_id) || 0;

      pagamentosPorSolicitacao.set(
        pagamento.solicitacao_id,
        atual + Number(pagamento.valor || 0)
      );
    });

    const historicoPorSolicitacao = new Map();

    historico.forEach(evento => {
      const lista =
        historicoPorSolicitacao.get(evento.solicitacao_id) || [];

      const usuario = usuarioMap.get(evento.usuario_id);

      lista.push([
        new Date(evento.data_hora).toLocaleString('pt-BR'),
        evento.descricao || evento.tipo_evento || 'Evento registrado',
        usuario?.nome || ''
      ]);

      historicoPorSolicitacao.set(
        evento.solicitacao_id,
        lista
      );
    });

    db.requests = solicitacoes.map(solicitacao => {
      const advogado = advogadoMap.get(solicitacao.advogado_id);
      const cliente = clienteMap.get(solicitacao.cliente_id);
      const processo = processoMap.get(solicitacao.processo_id);
      const area = areaMap.get(solicitacao.area_id);
      const tipo = tipoMap.get(solicitacao.tipo_servico_id);

      const calculista =
        db.calculistas.find(
          item => item.id === solicitacao.calculista_id
        );

      const revisor = usuarioMap.get(solicitacao.revisor_id);
      const sistema = sistemaMap.get(solicitacao.area_id);

      return {
        id: solicitacao.id,
        advogadoId: solicitacao.advogado_id || '',
        clienteId: solicitacao.cliente_id || '',
        processoId: solicitacao.processo_id || '',
        areaId: solicitacao.area_id || '',
        tipoId: solicitacao.tipo_servico_id || '',
        calculistaId: solicitacao.calculista_id || '',
        codigo: solicitacao.codigo,
        advogado: advogado?.nome || 'Não informado',
        cliente: cliente?.nome || 'Não informado',
        processo: processo?.numero_processo || 'Não informado',
        area: area?.nome || 'Não informado',
        tipo: tipo?.nome || 'Não informado',
        tipoEntrega: solicitacao.tipo_entrega || 'calculo',
        status: normalizarStatus(solicitacao.status),
        prioridade: normalizarPrioridade(solicitacao.prioridade),
        calculista: calculista?.nome || '',
        revisor: revisor?.nome || '',
        prazo: solicitacao.prazo || '',

        valor: Number(
          Number(solicitacao.valor_final || 0) > 0
            ? solicitacao.valor_final
            : (solicitacao.valor_cobrado || 0)
        ),

        recebido: Number(
          pagamentosPorSolicitacao.get(solicitacao.id) || 0
        ),

        origem: solicitacao.origem || advogado?.origem || '',
        sistema: sistema?.nome || '',
        descricao: solicitacao.descricao || '',

        data: solicitacao.data_solicitacao
          ? solicitacao.data_solicitacao.slice(0, 10)
          : '',

        drive: solicitacao.google_drive_url || '',

        historico:
          historicoPorSolicitacao.get(solicitacao.id) || []
      };
    });

    console.info(
      `Supabase: ${db.requests.length} solicitação(ões) carregada(s).`
    );

    return true;

  } catch (error) {
    console.error(
      'Erro inesperado ao carregar dados:',
      error
    );

    $('#content').innerHTML = `
      <div class="card" style="padding:24px">
        <h2>Erro ao carregar os dados.</h2>
        <p class="muted" style="margin-top:8px">
          Ocorreu um erro inesperado ao consultar o Supabase.
        </p>
      </div>
    `;

    return false;
  }
}

const state = {
  view: 'dashboard',
  query: '',
  status: '',
  area: '',
  selected: null
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const money = n =>
  Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const fmtDate = s =>
  s
    ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—';

const today = new Date();

const daysTo = s =>
  s
    ? Math.ceil(
        (
          new Date(s + 'T12:00:00') -
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          )
        ) / 86400000
      )
    : 9999;

const statusLabel = {
  NOVO: 'Novo',
  ANALISE: 'Análise',
  AGUARDANDO_DOCUMENTOS: 'Aguardando documentos',
  EM_CÁLCULO: 'Em cálculo',
  EM_REVISÃO: 'Em revisão',
  ENVIADO: 'Enviado',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  CONCLUÍDO: 'Concluído',
  IMPUGNADO: 'Impugnado',
  PAUSADO: 'Pausado',
  CANCELADO: 'Cancelado'
};

const statusClass = s =>
  ({
    NOVO: 'novo',
    EM_CÁLCULO: 'calculo',
    EM_REVISÃO: 'revisao',
    ENVIADO: 'enviado',
    CONCLUÍDO: 'concluido',
    AGUARDANDO_DOCUMENTOS: 'aguardando',
    AGUARDANDO_PAGAMENTO: 'aguardando',
    IMPUGNADO: 'atrasado'
  }[s] || 'novo');

function showToast(msg) {
  const t = $('#toast');

  t.textContent = msg;
  t.classList.add('show');

  setTimeout(
    () => t.classList.remove('show'),
    2600
  );
}

function extrairGoogleDriveFolderId(url) {
  const texto = String(url || '').trim();

  const padroes = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/
  ];

  for (const padrao of padroes) {
    const match = texto.match(padrao);
    if (match) return match[1];
  }

  return '';
}

function abrirFormularioForms(r) {
  const url = CONFIG.googleFormUrl;

  if (!url) {
    showToast('O endereço do Google Forms ainda não foi configurado.');
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

function abrirVincularPastaModal(r) {
  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="driveLinkModal">
      <div class="modal">
        <div class="modal-head">
          <h2>Vincular pasta do Google Drive</h2>
          <button class="close" data-close>×</button>
        </div>

        <form id="driveLinkForm">
          <div class="modal-body">
            <div class="notice" style="margin-bottom:16px">
              Solicitação: <strong>${r.codigo}</strong><br>
              Cole aqui o link da pasta criada pelo Apps Script no Google Drive.
            </div>

            <div class="field">
              <label for="driveFolderUrl">Link da pasta</label>
              <input
                id="driveFolderUrl"
                name="driveFolderUrl"
                class="input"
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value="${r.drive || ''}"
                required
              >
            </div>

            <small class="muted" style="display:block;margin-top:8px">
              O link permanece privado conforme as permissões da sua conta Google.
            </small>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn" data-close>Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar vínculo</button>
          </div>
        </form>
      </div>
    </div>
  `;

  $('#driveLinkModal').addEventListener('click', e => {
    if (e.target.id === 'driveLinkModal' || e.target.matches('[data-close]')) {
      closeModal();
    }
  });

  $('#driveLinkForm').addEventListener('submit', async e => {
    e.preventDefault();

    const url = e.target.driveFolderUrl.value.trim();
    const folderId = extrairGoogleDriveFolderId(url);
    const button = e.target.querySelector('button[type="submit"]');

    if (!folderId) {
      showToast('Cole um link válido de uma pasta do Google Drive.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Salvando...';

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({
        google_drive_folder_id: folderId,
        google_drive_url: url,
        updated_at: new Date().toISOString()
      })
      .eq('id', r.id);

    if (error) {
      console.error('Erro ao vincular pasta do Drive:', error);
      showToast('Não foi possível salvar o vínculo com o Drive.');
      button.disabled = false;
      button.textContent = 'Salvar vínculo';
      return;
    }

    const item = db.requests.find(x => x.id === r.id);
    if (item) item.drive = url;

    closeModal();
    showToast('Pasta do Google Drive vinculada.');
    openDetail(r.id);
  });
}

let renderEmAndamento = false;
let renderPendente = false;
let queryRenderTimer = null;

function nav(view) {
  if (!view || !views[view]) view = 'dashboard';

  if (isCalculista() && view !== 'dashboard') {
    view = 'dashboard';
  }

  if (state.view === view && !renderEmAndamento) {
    activeNav();
    return;
  }

  state.view = view;
  state.query = '';

  render();

  if (window.innerWidth < 801) {
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

function activeNav() {
  $$('.nav-item[data-view]').forEach(button => {
    const ativo = button.dataset.view === state.view;
    button.classList.toggle('active', ativo);
    button.setAttribute('aria-current', ativo ? 'page' : 'false');
  });
}

function render() {
  if (renderEmAndamento) {
    renderPendente = true;
    return;
  }

  renderEmAndamento = true;

  try {
    if (isCalculista() && state.view !== 'dashboard') {
      state.view = 'dashboard';
    }

    const titles = {
      dashboard: 'Dashboard',
      solicitacoes: 'Solicitações',
      advogados: 'Advogados',
      clientes: 'Clientes',
      processos: 'Processos',
      calculistas: 'Calculistas',
      financeiro: 'Financeiro',
      relatorios: 'Relatórios',
      configuracoes: 'Configurações'
    };

    const content = $('#content');
    const breadcrumb = $('#breadcrumb');
    const fn = views[state.view] || views.dashboard;

    if (breadcrumb) breadcrumb.textContent = titles[state.view] || 'Dashboard';
    if (content) content.innerHTML = fn();

    activeNav();
  } finally {
    renderEmAndamento = false;
  }

  if (renderPendente) {
    renderPendente = false;
    requestAnimationFrame(() => render());
  }
}

function tutorialIcon(name) {
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-6h6v6"/></svg>',
    solicitacoes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M8 8h8M8 12h8M8 16h5"/></svg>',
    advogados: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-3.5 3-5.3 6.5-5.3s5.8 1.8 6.5 5.3"/></svg>',
    clientes: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.8 20c.6-3.4 2.4-5.1 5.2-5.1s4.6 1.7 5.2 5.1"/><path d="M16 5.5a3 3 0 0 1 0 5.8M16 14.9c2.5.3 4 2 4.4 4.1"/></svg>',
    processos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5"/></svg>',
    calculistas: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="3" rx="1"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>',
    financeiro: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.7c-.7-.7-1.7-1.1-2.9-1.1-1.8 0-3 .8-3 2 0 3.1 6 1.4 6 4.5 0 1.2-1.2 2.1-3.1 2.1-1.3 0-2.4-.4-3.2-1.2M12 6v12"/></svg>',
    relatorios: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M3 19h18"/></svg>',
    configuracoes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19 13.5 1.2 1-.9 1.6-1.5-.5a7.8 7.8 0 0 1-1.4 1.4l.5 1.5-1.6.9-1-1.2a7.5 7.5 0 0 1-1.9.3l-.5 1.5h-1.8l-.5-1.5a7.5 7.5 0 0 1-1.9-.3l-1 1.2-1.6-.9.5-1.5a7.8 7.8 0 0 1-1.4-1.4l-1.5.5-.9-1.6 1.2-1a7.5 7.5 0 0 1-.2-1.5c0-.5.1-1 .2-1.5l-1.2-1 .9-1.6 1.5.5A7.8 7.8 0 0 1 7.2 7l-.5-1.5 1.6-.9 1 1.2a7.5 7.5 0 0 1 1.9-.3l.5-1.5h1.8l.5 1.5a7.5 7.5 0 0 1 1.9.3l1-1.2 1.6.9-.5 1.5a7.8 7.8 0 0 1 1.4 1.4l1.5-.5.9 1.6-1.2 1c.1.5.2 1 .2 1.5s-.1 1-.2 1.5Z"/></svg>'
  };
  return icons[name] || icons.dashboard;
}

function tutorialForView(view) {
  const data = {
    dashboard: { title: 'Visão geral', steps: ['Acompanhe o volume de solicitações e os valores em aberto.', 'Use os atalhos para acessar rapidamente as demandas que precisam de atenção.', 'Abra uma solicitação para consultar documentos, responsáveis, prazo e histórico.'] },
    solicitacoes: { title: 'Como funciona Solicitações', steps: ['Cadastre a demanda com advogado, cliente, processo, serviço e prazo.', 'Atribua o calculista e acompanhe o status da produção.', 'Use os detalhes para enviar documentos pelo Forms e acessar a pasta no Drive.'] },
    advogados: { title: 'Como funciona Advogados', steps: ['Cadastre quem solicita os cálculos.', 'Mantenha os dados de contato organizados para reutilização nas solicitações.', 'Acesse as solicitações relacionadas a cada advogado.'] },
    clientes: { title: 'Como funciona Clientes', steps: ['Cadastre os clientes atendidos pelo escritório.', 'Centralize os dados básicos para evitar novos cadastros repetidos.', 'Use o cadastro como referência ao criar solicitações e processos.'] },
    processos: { title: 'Como funciona Processos', steps: ['Registre os números dos processos e seus dados de referência.', 'Associe processos às solicitações quando necessário.', 'Consulte rapidamente o histórico relacionado ao processo.'] },
    calculistas: { title: 'Como funciona Calculistas', steps: ['Cadastre os profissionais que executam os cálculos.', 'Mantenha os calculistas ativos disponíveis para atribuição.', 'A distribuição das solicitações determina o que aparece no painel de produção de cada calculista.'] },
    financeiro: { title: 'Como funciona Financeiro', steps: ['Acompanhe valores cobrados e recebidos.', 'Registre pagamentos vinculados às solicitações.', 'Use essas informações para acompanhar saldos pendentes.'] },
    relatorios: { title: 'Como funciona Relatórios', steps: ['Consulte os dados consolidados da operação.', 'Use os relatórios para acompanhar volume, prazos e situação das demandas.', 'Os relatórios servem como apoio à gestão e não alteram os registros.'] },
    configuracoes: { title: 'Como funciona Configurações', steps: ['Consulte as configurações gerais do sistema.', 'Mantenha os parâmetros e integrações organizados.', 'Alterações sensíveis devem ser feitas somente por usuários autorizados.'] }
  };
  return { ...(data[view] || data.dashboard), icon: tutorialIcon(view) };
}

function tutorialBlock(view) {
  const g = tutorialForView(view);
  return `
    <div class="tutorial-panel" data-tutorial-panel hidden>
      
      <div class="tutorial-content">
        <strong>${g.title}</strong>
        <ol>${g.steps.map((step, i) => `<li><span class="tutorial-step">${i + 1}</span><span class="tutorial-step-text">${step}</span></li>`).join('')}</ol>
      </div>
    </div>
  `;
}

function pageHead(title, sub, action = '') {
  const guide = tutorialForView(state.view);
  return `
    <div class="page-head">
      <div>
        <div class="page-title-line">
          <h1>${title}</h1>
          <button class="tutorial-trigger" type="button" data-tutorial aria-label="Como funciona esta área" title="Como funciona esta área">${guide.icon}</button>
        </div>
        <p>${sub}</p>
      </div>
      ${
        action
          ? `<div class="actions">${action}</div>`
          : ''
      }
    </div>
    ${tutorialBlock(state.view)}
  `;
}

function kpi(label, value, sub) {
  return `
    <div class="card kpi">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="sub">${sub}</div>
    </div>
  `;
}

function requestRow(r) {
  return `
    <tr data-open="${r.id}">
      <td><strong>${r.codigo}</strong></td>
      <td>${r.advogado}</td>
      <td>${r.cliente}</td>
      <td>${r.tipo}</td>
      <td>
        ${
          r.calculista ||
          '<span class="muted">Não atribuído</span>'
        }
      </td>
      <td>${fmtDate(r.prazo)}</td>
      <td>
        <span class="status ${statusClass(r.status)}">
          ${statusLabel[r.status] || r.status}
        </span>
      </td>
      <td class="money">${money(r.valor)}</td>
    </tr>
  `;
}

function tableRequests(rows) {
  if (!rows.length) {
    return `
      <div class="empty">
        Nenhuma solicitação encontrada.
      </div>
    `;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Advogado</th>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Calculista</th>
            <th>Prazo</th>
            <th>Status</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(requestRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function calculistaDashboard() {
  const rows = minhasSolicitacoes();
  const abertas = rows.filter(r => !['CONCLUÍDO', 'CANCELADO'].includes(r.status));
  const novas = rows.filter(r => r.status === 'NOVO');
  const calculo = rows.filter(r => r.status === 'EM CÁLCULO');
  const revisao = rows.filter(r => r.status === 'EM REVISÃO');
  const atrasadas = abertas.filter(r => daysTo(r.prazo) < 0);

  const tarefaRow = r => `
    <tr data-open-calculista="${r.id}" style="cursor:pointer">
      <td><strong>${r.codigo}</strong></td>
      <td>${r.cliente}</td>
      <td>${r.tipo}</td>
      <td>${r.processo}</td>
      <td>${fmtDate(r.prazo)}</td>
      <td><span class="status ${statusClass(r.status)}">${statusLabel[r.status] || r.status}</span></td>
      <td>${r.prioridade}</td>
    </tr>`;

  return pageHead(
    `Olá, ${currentProfile?.nome || 'Calculista'}`,
    'Painel de produção — suas solicitações atribuídas.',
    ''
  ) + `
    <div class="grid kpi-grid">
      ${kpi('Novas', novas.length, 'Aguardando início')}
      ${kpi('Em cálculo', calculo.length, 'Trabalhos em andamento')}
      ${kpi('Em revisão', revisao.length, 'Aguardando conferência')}
      ${kpi('Atrasadas', atrasadas.length, 'Exigem atenção')}
    </div>

    <section class="card" style="margin-top:18px">
      <div class="card-head">
        <div>
          <h2>Minhas solicitações</h2>
          <p class="muted" style="margin-top:4px">Clique em uma solicitação para abrir os dados de produção.</p>
        </div>
      </div>
      ${rows.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Cliente</th><th>Serviço</th><th>Processo</th><th>Prazo</th><th>Status</th><th>Prioridade</th>
              </tr>
            </thead>
            <tbody>${rows.map(tarefaRow).join('')}</tbody>
          </table>
        </div>` : `
        <div class="empty">Nenhuma solicitação foi atribuída a você.</div>`}
    </section>
  `;
}

async function alterarStatusCalculista(id, novoStatus, descricao) {
  const r = db.requests.find(x => x.id === id);
  if (!r) return;

  const statusPermitidos = ['EM_CALCULO', 'EM_REVISAO', 'CONCLUIDO'];
  if (!statusPermitidos.includes(novoStatus)) return;

  const update = { status: novoStatus, updated_at: new Date().toISOString() };
  if (novoStatus === 'EM_CALCULO' && !r.data_inicio) update.data_inicio = new Date().toISOString();
  if (novoStatus === 'CONCLUIDO') update.data_conclusao = new Date().toISOString();

  const { error } = await supabaseClient
    .from('solicitacoes')
    .update(update)
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar status:', error);
    showToast('Não foi possível atualizar o status.');
    return;
  }

  await supabaseClient.from('historico_solicitacao').insert({
    solicitacao_id: id,
    usuario_id: currentUser.id,
    tipo_evento: 'STATUS',
    descricao: descricao || `Status alterado para ${novoStatus}`,
    data_hora: new Date().toISOString()
  });

  await carregarSolicitacoes();
  render();
  showToast('Status atualizado.');
}

function openCalculistaDetail(id) {
  const r = minhasSolicitacoes().find(x => x.id === id);
  if (!r) return;

  const botoes = [];
  if (r.status === 'NOVO') {
    botoes.push(`<button class="btn btn-primary" data-calc-action="start" data-id="${r.id}">▶ Iniciar cálculo</button>`);
  }
  if (r.status === 'EM CÁLCULO') {
    botoes.push(`<button class="btn btn-primary" data-calc-action="review" data-id="${r.id}">✓ Enviar para revisão</button>`);
  }
  if (r.status === 'EM REVISÃO') {
    botoes.push(`<button class="btn btn-primary" data-calc-action="done" data-id="${r.id}">✓ Marcar como concluído</button>`);
  }

  const root = document.getElementById('drawerRoot');
  root.innerHTML = `
    <div class="drawer-backdrop" id="calcDrawerBackdrop">
      <aside class="drawer">
        <div class="drawer-head">
          <div><span class="eyebrow">PRODUÇÃO</span><h2>${r.codigo}</h2></div>
          <button class="icon-btn" data-calc-close>×</button>
        </div>
        <div class="drawer-body">
          <div class="detail-status"><span class="status ${statusClass(r.status)}">${statusLabel[r.status] || r.status}</span></div>
          <div class="detail-grid">
            <div><small>Cliente</small><strong>${r.cliente}</strong></div>
            <div><small>Processo</small><strong>${r.processo}</strong></div>
            <div><small>Serviço</small><strong>${r.tipo}</strong></div>
            <div><small>Área</small><strong>${r.area}</strong></div>
            <div><small>Prazo</small><strong>${fmtDate(r.prazo)}</strong></div>
            <div><small>Prioridade</small><strong>${r.prioridade}</strong></div>
          </div>

          <div class="card" style="margin-top:18px;padding:16px">
            <h3>Observações para o cálculo</h3>
            <p class="muted" style="margin-top:8px;white-space:pre-wrap">${r.descricao || 'Nenhuma observação registrada.'}</p>
          </div>

          <div class="card" style="margin-top:18px;padding:16px">
            <h3>Documentos</h3>
            <p class="muted" style="margin:6px 0 14px">Os documentos ficam na pasta privada da solicitação.</p>
            ${r.drive ? `<a class="btn btn-secondary" href="${r.drive}" target="_blank" rel="noopener noreferrer">📁 Abrir pasta no Drive</a>` : '<div class="empty">Pasta do Drive ainda não vinculada.</div>'}
          </div>

          <div class="card" style="margin-top:18px;padding:16px">
            <h3>Execução</h3>
            <p class="muted" style="margin:6px 0 14px">${r.sistema ? `Sistema indicado: ${r.sistema}` : 'Sistema especializado não informado.'}</p>
            <div class="actions">${botoes.join('') || '<span class="muted">Nenhuma ação disponível neste status.</span>'}</div>
          </div>
        </div>
      </aside>
    </div>`;

  document.getElementById('calcDrawerBackdrop').addEventListener('click', async e => {
    if (e.target.id === 'calcDrawerBackdrop' || e.target.matches('[data-calc-close]')) {
      root.innerHTML = '';
      return;
    }
    const btn = e.target.closest('[data-calc-action]');
    if (!btn) return;
    const action = btn.dataset.calcAction;
    const status = action === 'start' ? 'EM_CALCULO' : action === 'review' ? 'EM_REVISAO' : 'CONCLUIDO';
    const desc = action === 'start' ? 'Calculista iniciou o cálculo.' : action === 'review' ? 'Cálculo enviado para revisão.' : 'Cálculo marcado como concluído pelo calculista.';
    btn.disabled = true;
    await alterarStatusCalculista(id, status, desc);
    root.innerHTML = '';
  });
}

const views = {

  dashboard() {
    if (isCalculista()) {
      return calculistaDashboard();
    }

    const open =
      db.requests.filter(
        r =>
          ![
            'CONCLUÍDO',
            'CANCELADO'
          ].includes(r.status)
      ).length;

    const recv =
      db.requests.reduce(
        (a, r) => a + (r.recebido || 0),
        0
      );

    const billed =
      db.requests.reduce(
        (a, r) => a + (r.valor || 0),
        0
      );

    const due =
      db.requests.reduce(
        (a, r) =>
          a +
          Math.max(
            0,
            (r.valor || 0) -
              (r.recebido || 0)
          ),
        0
      );

    const retr = 2;

    const attention =
      db.requests.filter(
        r =>
          daysTo(r.prazo) <= 3 &&
          ![
            'CONCLUÍDO',
            'CANCELADO'
          ].includes(r.status)
      );

    return (
      pageHead(
        `Boa noite, ${
          currentProfile?.nome || 'Usuário'
        }`,
        'Visão geral da operação de cálculos judiciais.',
        '<button class="btn btn-primary" data-new>＋ Nova solicitação</button>'
      ) +

      `<div class="grid kpi-grid">
        ${kpi(
          'Em aberto',
          open,
          'Solicitações não concluídas'
        )}

        ${kpi(
          'A receber',
          money(due),
          'Saldo das demandas'
        )}

        ${kpi(
          'Recebido',
          money(recv),
          'Acumulado no protótipo'
        )}

        ${kpi(
          'Retrabalhos',
          retr,
          'Ocorrências recentes'
        )}
      </div>` +

      `
      <div class="section-grid">

        <section class="card">
          <div class="card-head">
            <h2>Solicitações recentes</h2>
            <button
              class="kpi-link"
              data-view-link="solicitacoes"
            >
              Ver todas
            </button>
          </div>

          ${tableRequests(
            db.requests.slice(0, 6)
          )}
        </section>

        <section class="card">
          <div class="card-head">
            <h2>Precisam de atenção</h2>
          </div>

          <div class="card-body">
            <div class="alert-list">

              ${
                attention.length
                  ? attention
                      .map(
                        r => `
                        <div
                          class="alert ${
                            daysTo(r.prazo) < 0
                              ? 'danger'
                              : 'warning'
                          }"
                          data-open="${r.id}"
                        >
                          <div class="mark"></div>

                          <div>
                            <strong>
                              ${r.codigo} · ${r.tipo}
                            </strong>

                            <small>
                              ${
                                daysTo(r.prazo) < 0
                                  ? 'Atrasado'
                                  : daysTo(r.prazo) === 0
                                  ? 'Vence hoje'
                                  : `Vence em ${daysTo(
                                      r.prazo
                                    )} dias`
                              }
                              · ${r.advogado}
                            </small>
                          </div>
                        </div>
                      `
                      )
                      .join('')
                  : `
                    <div class="empty">
                      Nenhuma pendência urgente.
                    </div>
                  `
              }

            </div>
          </div>
        </section>

      </div>
      `
    );
  },

  solicitacoes() {
    let rows =
      db.requests.filter(
        r =>
          (
            !state.query ||
            `
              ${r.codigo}
              ${r.advogado}
              ${r.cliente}
              ${r.processo}
              ${r.tipo}
            `
              .toLowerCase()
              .includes(
                state.query.toLowerCase()
              )
          ) &&
          (
            !state.status ||
            r.status === state.status
          ) &&
          (
            !state.area ||
            r.area === state.area
          )
      );

    return (
      pageHead(
        'Solicitações',
        `${rows.length} demanda(s) encontrada(s).`,
        '<button class="btn btn-primary" data-new>＋ Nova solicitação</button>'
      ) +

      `
      <div class="card filters">

        <div class="field">
          <label>Pesquisar</label>

          <input
            class="input"
            id="q"
            placeholder="Advogado, cliente, processo ou código..."
            value="${state.query}"
          >
        </div>

        <div class="field small">
          <label>Status</label>

          <select id="filterStatus">
            <option value="">Todos</option>

            ${Object.entries(statusLabel)
              .map(
                ([k, v]) =>
                  `<option
                    value="${k}"
                    ${
                      state.status === k
                        ? 'selected'
                        : ''
                    }
                  >
                    ${v}
                  </option>`
              )
              .join('')}
          </select>
        </div>

        <div class="field small">
          <label>Área</label>

          <select id="filterArea">
            <option value="">Todas</option>

            ${
              [
                'Previdenciário',
                'Trabalhista',
                'Servidor Público',
                'Cível',
                'Tributário',
                'Saúde'
              ]
                .map(
                  v =>
                    `<option ${
                      state.area === v
                        ? 'selected'
                        : ''
                    }>${v}</option>`
                )
                .join('')
            }
          </select>
        </div>

        <div class="field small">
          <label>Visualização</label>

          <select id="viewMode">
            <option value="table">Tabela</option>
            <option value="kanban">Kanban</option>
          </select>
        </div>

      </div>

      <div
        id="requestList"
        class="card"
      >
        ${tableRequests(rows)}
      </div>
      `
    );
  },

  advogados() {
    const names = [
      ...new Set(
        db.requests.map(
          r => r.advogado
        )
      )
    ];

    return (
      pageHead(
        'Advogados',
        'Relacionamento e histórico dos solicitantes.'
      ) +

      `
      <div class="grid two-col">

        ${
          names
            .map(n => {
              const rs =
                db.requests.filter(
                  r => r.advogado === n
                );

              const bill =
                rs.reduce(
                  (a, r) => a + r.valor,
                  0
                );

              const rec =
                rs.reduce(
                  (a, r) =>
                    a + r.recebido,
                  0
                );

              return `
                <div class="card">

                  <div class="profile-card">

                    <div class="avatar">
                      ${
                        n
                          .replace(
                            /[^A-Za-zÀ-ÿ]/g,
                            ''
                          )
                          .slice(0, 1) ||
                        'A'
                      }
                    </div>

                    <div class="person-meta">
                      <h3>${n}</h3>
                      <p>
                        ${
                          rs[0]?.origem ||
                          ''
                        }
                        · ${rs.length}
                        solicitações
                      </p>
                    </div>

                  </div>

                  <div class="card-body">

                    <div class="mini-stats">

                      <div class="mini-stat">
                        <strong>${rs.length}</strong>
                        <small>Solicitações</small>
                      </div>

                      <div class="mini-stat">
                        <strong>${money(
                          bill
                        )}</strong>
                        <small>Faturado</small>
                      </div>

                      <div class="mini-stat">
                        <strong>${money(
                          bill - rec
                        )}</strong>
                        <small>A receber</small>
                      </div>

                    </div>

                  </div>

                </div>
              `;
            })
            .join('')
        }

      </div>
      `
    );
  },

  clientes() {
    const names = [
      ...new Set(
        db.requests.map(
          r => r.cliente
        )
      )
    ];

    return (
      pageHead(
        'Clientes',
        'Clientes finais relacionados às demandas.'
      ) +

      `
      <div class="card">

        ${
          names.length
            ? `
              <div class="table-wrap">
                <table>

                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Processo</th>
                      <th>Solicitações</th>
                      <th>Valor</th>
                      <th>Recebido</th>
                    </tr>
                  </thead>

                  <tbody>

                    ${names
                      .map(n => {
                        const rs =
                          db.requests.filter(
                            r =>
                              r.cliente === n
                          );

                        return `
                          <tr
                            data-open="${rs[0].id}"
                          >
                            <td>
                              <strong>${n}</strong>
                            </td>

                            <td>
                              ${
                                rs[0]
                                  .processo ||
                                '—'
                              }
                            </td>

                            <td>
                              ${rs.length}
                            </td>

                            <td class="money">
                              ${money(
                                rs.reduce(
                                  (a, r) =>
                                    a + r.valor,
                                  0
                                )
                              )}
                            </td>

                            <td class="money">
                              ${money(
                                rs.reduce(
                                  (a, r) =>
                                    a +
                                    r.recebido,
                                  0
                                )
                              )}
                            </td>

                          </tr>
                        `;
                      })
                      .join('')}

                  </tbody>

                </table>
              </div>
            `
            : `
              <div class="empty">
                Nenhum cliente.
              </div>
            `
        }

      </div>
      `
    );
  },

  processos() {
    return (
      pageHead(
        'Processos',
        'Pesquisa e acompanhamento das demandas por processo.'
      ) +

      `
      <div class="card filters">

        <div class="field">
          <label>Pesquisar processo</label>

          <input
            class="input"
            id="processSearch"
            placeholder="Número do processo..."
          >
        </div>

      </div>

      <div
        id="processTable"
        class="card"
      >
        ${processTable('')}
      </div>
      `
    );
  },

  calculistas() {
    const names =
      db.calculistas
        .filter(c => c.ativo)
        .map(c => c.nome);

    return (
      pageHead(
        'Calculistas',
        'Distribuição e acompanhamento operacional.'
      ) +

      `
      <div class="grid two-col">

        ${
          names
            .map(n => {
              const rs =
                db.requests.filter(
                  r =>
                    r.calculista === n
                );

              const done =
                rs.filter(
                  r =>
                    r.status ===
                    'CONCLUÍDO'
                ).length;

              const active =
                rs.filter(
                  r =>
                    ![
                      'CONCLUÍDO',
                      'CANCELADO'
                    ].includes(r.status)
                ).length;

              return `
                <div class="card">

                  <div class="card-body">

                    <div
                      class="profile-card"
                      style="padding:0"
                    >

                      <div class="avatar">
                        ${n[0]}
                      </div>

                      <div class="person-meta">
                        <h3>${n}</h3>
                        <p>Calculista</p>
                      </div>

                    </div>

                    <div class="mini-stats">

                      <div class="mini-stat">
                        <strong>${active}</strong>
                        <small>Em andamento</small>
                      </div>

                      <div class="mini-stat">
                        <strong>${done}</strong>
                        <small>Concluídos</small>
                      </div>

                      <div class="mini-stat">
                        <strong>${rs.length}</strong>
                        <small>Total</small>
                      </div>

                    </div>

                  </div>

                </div>
              `;
            })
            .join('')
        }

      </div>
      `
    );
  },

  financeiro() {
    const billed =
      db.requests.reduce(
        (a, r) => a + r.valor,
        0
      );

    const rec =
      db.requests.reduce(
        (a, r) => a + r.recebido,
        0
      );

    const due =
      billed - rec;

    return (
      pageHead(
        'Financeiro',
        'Faturamento, recebimentos e contas a receber.'
      ) +

      `
      <div class="grid kpi-grid">

        ${kpi(
          'Faturado',
          money(billed),
          'Total das solicitações'
        )}

        ${kpi(
          'Recebido',
          money(rec),
          'Pagamentos registrados'
        )}

        ${kpi(
          'A receber',
          money(due),
          'Saldo em aberto'
        )}

        ${kpi(
          'Em atraso',
          money(
            db.requests
              .filter(
                r =>
                  daysTo(r.prazo) < 0 &&
                  r.valor > r.recebido
              )
              .reduce(
                (a, r) =>
                  a +
                  (r.valor -
                    r.recebido),
                0
              )
          ),
          'Prazos vencidos'
        )}

      </div>

      <div
        class="card"
        style="margin-top:16px"
      >

        <div class="card-head">
          <h2>Contas a receber</h2>
        </div>

        <div class="table-wrap">

          <table>

            <thead>
              <tr>
                <th>Solicitação</th>
                <th>Advogado</th>
                <th>Serviço</th>
                <th>Cobrado</th>
                <th>Recebido</th>
                <th>Saldo</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              ${
                db.requests
                  .filter(
                    r =>
                      r.valor >
                      r.recebido
                  )
                  .map(
                    r => `
                      <tr data-open="${r.id}">

                        <td>
                          <strong>
                            ${r.codigo}
                          </strong>
                        </td>

                        <td>
                          ${r.advogado}
                        </td>

                        <td>
                          ${r.tipo}
                        </td>

                        <td class="money">
                          ${money(r.valor)}
                        </td>

                        <td class="money">
                          ${money(
                            r.recebido
                          )}
                        </td>

                        <td class="money">
                          ${money(
                            r.valor -
                              r.recebido
                          )}
                        </td>

                        <td>
                          <span
                            class="status ${
                              daysTo(
                                r.prazo
                              ) < 0
                                ? 'atrasado'
                                : 'aguardando'
                            }"
                          >
                            ${
                              daysTo(
                                r.prazo
                              ) < 0
                                ? 'Em atraso'
                                : 'A receber'
                            }
                          </span>
                        </td>

                      </tr>
                    `
                  )
                  .join('')
              }

            </tbody>

          </table>

        </div>

      </div>
      `
    );
  },

  relatorios() {
    const areas = {};

    db.requests.forEach(
      r =>
        (areas[r.area] =
          (areas[r.area] || 0) +
          1)
    );

    const orig = {};

    db.requests.forEach(
      r =>
        (orig[r.origem] =
          (orig[r.origem] || 0) +
          1)
    );

    return (
      pageHead(
        'Relatórios',
        'Visões operacionais para produção, origem e financeiro.'
      ) +

      `
      <div class="grid two-col">

        <section class="card">

          <div class="card-head">
            <h2>Solicitações por área</h2>
          </div>

          <div class="card-body">

            ${
              Object.entries(areas)
                .map(
                  ([k, v]) => `
                    <div
                      style="
                        display:flex;
                        justify-content:space-between;
                        padding:11px 0;
                        border-bottom:1px solid var(--line);
                        font-size:13px
                      "
                    >
                      <span>${k}</span>
                      <strong>${v}</strong>
                    </div>
                  `
                )
                .join('')
            }

          </div>

        </section>

        <section class="card">

          <div class="card-head">
            <h2>Origem das solicitações</h2>
          </div>

          <div class="card-body">

            ${
              Object.entries(orig)
                .map(
                  ([k, v]) => `
                    <div
                      style="
                        display:flex;
                        justify-content:space-between;
                        padding:11px 0;
                        border-bottom:1px solid var(--line);
                        font-size:13px
                      "
                    >
                      <span>${k}</span>
                      <strong>${v}</strong>
                    </div>
                  `
                )
                .join('')
            }

          </div>

        </section>

      </div>

      <div
        class="notice"
        style="margin-top:16px"
      >
        Os gráficos avançados, exportação e indicadores históricos serão ligados ao Supabase na próxima etapa.
      </div>
      `
    );
  },

  configuracoes() {
    return (
      pageHead(
        'Configurações',
        'Cadastros e integrações do Gestão Computum.'
      ) +

      `
      <div class="grid two-col">

        <section class="card">

          <div class="card-head">
            <h2>Sistemas especializados</h2>

            <button
              class="btn"
              data-system
            >
              ＋ Adicionar
            </button>
          </div>

          <div class="card-body">

            <div class="alert-list">

              <div class="alert">
                <div class="mark"></div>

                <div>
                  <strong>
                    Abono Computum
                  </strong>

                  <small>
                    https://abono.computum.com.br
                  </small>
                </div>
              </div>

              <div class="alert">
                <div class="mark"></div>

                <div>
                  <strong>
                    Diferenças Computum
                  </strong>

                  <small>
                    https://diferencas.computum.com.br
                  </small>
                </div>
              </div>

              <div class="alert">
                <div class="mark"></div>

                <div>
                  <strong>
                    Saúde Computum
                  </strong>

                  <small>
                    https://saude.computum.com.br
                  </small>
                </div>
              </div>

            </div>

          </div>

        </section>

        <section class="card">

          <div class="card-head">
            <h2>Integrações</h2>
          </div>

          <div class="card-body">

            <div class="notice">
              <strong>Supabase:</strong>
              aguardando URL e chave pública do projeto.
            </div>

            <div
              class="notice"
              style="margin-top:10px"
            >
              <strong>Google Drive:</strong>
              integração preparada conceitualmente; requer OAuth/configuração da aplicação.
            </div>

          </div>

        </section>

      </div>
      `
    );
  }
};

function processTable(q) {
  const seen = new Map();

  db.requests.forEach(r => {
    if (
      q &&
      !r.processo
        .toLowerCase()
        .includes(
          q.toLowerCase()
        )
    ) {
      return;
    }

    if (!seen.has(r.processo)) {
      seen.set(
        r.processo,
        r
      );
    }
  });

  const rows = [
    ...seen.values()
  ];

  return rows.length
    ? `
      <div class="table-wrap">

        <table>

          <thead>
            <tr>
              <th>Processo</th>
              <th>Cliente</th>
              <th>Advogado</th>
              <th>Último serviço</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${
              rows
                .map(
                  r => `
                    <tr data-open="${r.id}">

                      <td>
                        <strong>
                          ${r.processo}
                        </strong>
                      </td>

                      <td>
                        ${r.cliente}
                      </td>

                      <td>
                        ${r.advogado}
                      </td>

                      <td>
                        ${r.tipo}
                      </td>

                      <td>
                        <span
                          class="status ${statusClass(
                            r.status
                          )}"
                        >
                          ${
                            statusLabel[
                              r.status
                            ]
                          }
                        </span>
                      </td>

                    </tr>
                  `
                )
                .join('')
            }

          </tbody>

        </table>

      </div>
    `
    : `
      <div class="empty">
        Nenhum processo encontrado.
      </div>
    `;
}

function newModal() {
  return `
    <div
      class="modal-backdrop"
      id="requestModal"
    >

      <div class="modal">

        <div class="modal-head">

          <h2>
            Nova solicitação
          </h2>

          <button
            class="close"
            data-close
          >
            ×
          </button>

        </div>

        <form id="requestForm">

          <div class="modal-body">

            <div
              class="notice"
              style="margin-bottom:16px"
            >
              Cadastro rápido: os dados podem ser complementados depois. Os documentos serão recebidos pelo Google Forms e organizados no Google Drive.
            </div>

            <div class="form-grid">

              <div class="field">
                <label>
                  Advogado *
                </label>

                <input
                  required
                  name="advogado"
                  class="input"
                  placeholder="Nome do advogado"
                >
              </div>

              <div class="field">
                <label>
                  Origem
                </label>

                <select name="origem">
                  <option>Indicação</option>
                  <option>Instagram</option>
                  <option>Site</option>
                  <option>WhatsApp</option>
                  <option>Cliente antigo</option>
                  <option>LinkedIn</option>
                  <option>Outro</option>
                </select>
              </div>

              <div class="field">
                <label>
                  Cliente *
                </label>

                <input
                  required
                  name="cliente"
                  class="input"
                  placeholder="Nome do cliente"
                >
              </div>

              <div class="field">
                <label>
                  CPF
                </label>

                <input
                  name="cpf"
                  class="input"
                  placeholder="Opcional"
                >
              </div>

              <div class="field">
                <label>
                  Número do processo
                </label>

                <input
                  name="processo"
                  class="input"
                  placeholder="0000000-00.0000.0.00.0000"
                >
              </div>

              <div class="field">
                <label>
                  Prazo
                </label>

                <input
                  type="date"
                  name="prazo"
                  class="input"
                >
              </div>

              <div class="field">
                <label>
                  Área *
                </label>

                <select
                  required
                  name="area"
                  id="newArea"
                >
                  <option value="">
                    Selecione
                  </option>

                  <option>
                    Previdenciário
                  </option>

                  <option>
                    Trabalhista
                  </option>

                  <option>
                    Servidor Público
                  </option>

                  <option>
                    Cível
                  </option>

                  <option>
                    Tributário
                  </option>

                  <option>
                    Saúde
                  </option>
                </select>
              </div>

              <div class="field">
                <label>
                  Tipo de serviço *
                </label>

                <select
                  required
                  name="tipo"
                  id="newTipo"
                >
                  <option value="">
                    Selecione a área primeiro
                  </option>
                </select>
              </div>

              <div class="field">
                <label>
                  Calculista
                </label>

                <select name="calculista">

                  <option value="">
                    Não atribuído
                  </option>

                  ${db.calculistas
                    .filter(c => c.ativo)
                    .map(
                      c =>
                        `<option value="${c.nome}">
                          ${c.nome}
                        </option>`
                    )
                    .join('')}

                </select>
              </div>

              <div class="field">
                <label>
                  Valor cobrado
                </label>

                <input
                  name="valor"
                  class="input"
                  inputmode="decimal"
                  placeholder="0,00"
                >
              </div>

              <div class="field">
                <label>
                  Prioridade
                </label>

                <select name="prioridade">
                  <option>Normal</option>
                  <option>Alta</option>
                  <option>Urgente</option>
                </select>
              </div>

              <div class="field">
                <label>
                  Tipo de entrega
                </label>

                <select name="entrega">
                  <option>
                    Cálculo
                  </option>

                  <option>
                    Cálculo + parecer
                  </option>

                  <option>
                    Apenas parecer
                  </option>

                  <option>
                    Conferência
                  </option>
                </select>
              </div>

              <div class="field full">
                <label>
                  Texto da solicitação
                </label>

                <textarea
                  name="descricao"
                  rows="4"
                  placeholder="Cole aqui a mensagem ou descreva o que o advogado solicitou..."
                ></textarea>
              </div>

              <div class="field full">
                <label>
                  Documento inicial
                </label>

                <input
                  type="file"
                  name="arquivo"
                  class="input"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                >
              </div>

            </div>

          </div>

          <div class="modal-foot">

            <button
              type="button"
              class="btn"
              data-close
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="btn btn-primary"
            >
              Criar solicitação
            </button>

          </div>

        </form>

      </div>

    </div>
  `;
}

const serviceMap = {
  'Previdenciário': [
    'Liquidação de sentença',
    'Revisão de RMI',
    'Atualização',
    'LOAS',
    'Outro'
  ],

  'Trabalhista': [
    'Liquidação',
    'Dano material',
    'Dano moral',
    'Atualização',
    'Outro'
  ],

  'Servidor Público': [
    'Abono de Permanência',
    'Verbas remuneratórias',
    '13º salário',
    'Férias',
    'Outro'
  ],

  'Cível': [
    'Dano material',
    'Dano moral',
    'Liquidação',
    'Atualização',
    'Outro'
  ],

  'Tributário': [
    'Diferenças',
    'Atualização',
    'Liquidação',
    'Outro'
  ],

  'Saúde': [
    'Plano de Saúde',
    'Dano material',
    'Dano moral',
    'Liquidação',
    'Outro'
  ]
};

function openNew() {
  $('#modalRoot').innerHTML =
    newModal();

  const area =
    $('#newArea');

  const tipo =
    $('#newTipo');

  area.addEventListener(
    'change',
    () => {
      tipo.innerHTML =
        '<option value="">Selecione</option>' +
        (
          serviceMap[
            area.value
          ] || []
        )
          .map(
            x =>
              `<option>${x}</option>`
          )
          .join('');
    }
  );

  $('#requestModal')
    .addEventListener(
      'click',
      e => {
        if (
          e.target.id ===
            'requestModal' ||
          e.target.matches(
            '[data-close]'
          )
        ) {
          closeModal();
        }
      }
    );

  $('#requestForm')
    .addEventListener(
      'submit',
      createRequest
    );
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
}

async function createRequest(e) {
  e.preventDefault();

  const f =
    new FormData(e.target);

  const submitButton =
    e.target.querySelector(
      'button[type="submit"]'
    );

  try {

    submitButton.disabled = true;
    submitButton.textContent =
      'Salvando...';

    const advogadoNome =
      String(
        f.get('advogado') || ''
      ).trim();

    const clienteNome =
      String(
        f.get('cliente') || ''
      ).trim();

    const cpf =
      String(
        f.get('cpf') || ''
      ).trim();

    const processoNumero =
      String(
        f.get('processo') || ''
      ).trim();

    const areaNome =
      String(
        f.get('area') || ''
      ).trim();

    const tipoNome =
      String(
        f.get('tipo') || ''
      ).trim();

    const origem =
      String(
        f.get('origem') || ''
      ).trim();

    const prioridadeLabel =
      String(
        f.get('prioridade') ||
          'Normal'
      ).trim();

    const calculistaNome =
      String(
        f.get('calculista') || ''
      ).trim();

    const entregaLabel =
      String(
        f.get('entrega') ||
          'Cálculo'
      ).trim();

    const descricao =
      String(
        f.get('descricao') || ''
      ).trim();

    const prazo =
      String(
        f.get('prazo') || ''
      ).trim();

    const valor =
      parseMoney(
        f.get('valor')
      );

    if (
      !advogadoNome ||
      !clienteNome ||
      !areaNome ||
      !tipoNome
    ) {
      throw new Error(
        'Preencha os campos obrigatórios.'
      );
    }

    /*
     * 1. LOCALIZA / CRIA O ADVOGADO
     */

    let advogado;

    const advogadoBusca =
      await supabaseClient
        .from('advogados')
        .select(
          'id, nome, origem'
        )
        .ilike(
          'nome',
          advogadoNome
        )
        .limit(1)
        .maybeSingle();

    if (advogadoBusca.error) {
      throw advogadoBusca.error;
    }

    advogado =
      advogadoBusca.data;

    if (!advogado) {

      const novoAdvogado =
        await supabaseClient
          .from('advogados')
          .insert({
            nome:
              advogadoNome,
            origem:
              origem || null
          })
          .select(
            'id, nome, origem'
          )
          .single();

      if (novoAdvogado.error) {
        throw novoAdvogado.error;
      }

      advogado =
        novoAdvogado.data;
    }

    /*
     * 2. LOCALIZA / CRIA O CLIENTE
     */

    let cliente = null;

    if (cpf) {

      const clienteCpf =
        await supabaseClient
          .from('clientes')
          .select(
            'id, nome, cpf'
          )
          .eq(
            'cpf',
            cpf
          )
          .limit(1)
          .maybeSingle();

      if (clienteCpf.error) {
        throw clienteCpf.error;
      }

      cliente =
        clienteCpf.data;
    }

    if (!cliente) {

      const clienteNomeBusca =
        await supabaseClient
          .from('clientes')
          .select(
            'id, nome, cpf'
          )
          .ilike(
            'nome',
            clienteNome
          )
          .limit(1)
          .maybeSingle();

      if (clienteNomeBusca.error) {
        throw clienteNomeBusca.error;
      }

      cliente =
        clienteNomeBusca.data;
    }

    if (!cliente) {

      const novoCliente =
        await supabaseClient
          .from('clientes')
          .insert({
            nome:
              clienteNome,
            cpf:
              cpf || null
          })
          .select(
            'id, nome, cpf'
          )
          .single();

      if (novoCliente.error) {
        throw novoCliente.error;
      }

      cliente =
        novoCliente.data;
    }

    /*
     * 3. LOCALIZA / CRIA O PROCESSO
     */

    let processo = null;

    if (processoNumero) {

      const processoBusca =
        await supabaseClient
          .from('processos')
          .select(
            'id, numero_processo, cliente_id'
          )
          .eq(
            'numero_processo',
            processoNumero
          )
          .limit(1)
          .maybeSingle();

      if (processoBusca.error) {
        throw processoBusca.error;
      }

      processo =
        processoBusca.data;

      if (!processo) {

        const novoProcesso =
          await supabaseClient
            .from('processos')
            .insert({
              numero_processo:
                processoNumero,
              cliente_id:
                cliente.id
            })
            .select(
              'id, numero_processo, cliente_id'
            )
            .single();

        if (novoProcesso.error) {
          throw novoProcesso.error;
        }

        processo =
          novoProcesso.data;
      }
    }

    /*
     * 4. LOCALIZA A ÁREA
     */

    const areaResult =
      await supabaseClient
        .from('areas_servico')
        .select(
          'id, nome'
        )
        .eq(
          'nome',
          areaNome
        )
        .limit(1)
        .maybeSingle();

    if (areaResult.error) {
      throw areaResult.error;
    }

    if (!areaResult.data) {
      throw new Error(
        `Área de serviço não encontrada: ${areaNome}`
      );
    }

    const area =
      areaResult.data;

    /*
     * 5. LOCALIZA / CRIA O TIPO DE SERVIÇO
     */

    const tipoResult =
      await supabaseClient
        .from('tipos_servico')
        .select(
          'id, nome, area_id'
        )
        .eq(
          'area_id',
          area.id
        )
        .eq(
          'nome',
          tipoNome
        )
        .limit(1)
        .maybeSingle();

    if (tipoResult.error) {
      throw tipoResult.error;
    }

    let tipo =
      tipoResult.data;

    if (!tipo) {

      const novoTipo =
        await supabaseClient
          .from('tipos_servico')
          .insert({
            area_id:
              area.id,
            nome:
              tipoNome
          })
          .select(
            'id, nome, area_id'
          )
          .single();

      if (novoTipo.error) {
        throw novoTipo.error;
      }

      tipo =
        novoTipo.data;
    }

    /*
     * 6. LOCALIZA O CALCULISTA
     *
     * Calculistas não possuem login.
     * Eles ficam na tabela public.calculistas.
     */

    let calculistaId = null;

    if (calculistaNome) {

      const calculistaResult =
        await supabaseClient
          .from('calculistas')
          .select(
            'id, nome, ativo'
          )
          .ilike(
            'nome',
            calculistaNome
          )
          .eq(
            'ativo',
            true
          )
          .limit(1)
          .maybeSingle();

      if (calculistaResult.error) {
        throw calculistaResult.error;
      }

      if (
        calculistaResult.data
      ) {
        calculistaId =
          calculistaResult.data.id;
      }
    }

    /*
     * 7. CONVERTE VALORES DO FORMULÁRIO
     */

    const prioridadeMap = {
      Normal: 'normal',
      Alta: 'alta',
      Urgente: 'urgente'
    };

    const entregaMap = {
      'Cálculo':
        'calculo',

      'Cálculo + parecer':
        'calculo_parecer',

      'Apenas parecer':
        'parecer',

      'Conferência':
        'conferencia'
    };

    const prioridade =
      prioridadeMap[
        prioridadeLabel
      ] || 'normal';

    const tipoEntrega =
      entregaMap[
        entregaLabel
      ] || 'calculo';

    /*
     * 8. GERA O CÓDIGO DA SOLICITAÇÃO
     */

    const {
      data: ultimaSolicitacao,
      error: ultimaError
    } =
      await supabaseClient
        .from('solicitacoes')
        .select('codigo')
        .like(
          'codigo',
          `CJ-${today.getFullYear()}-%`
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(1)
        .maybeSingle();

    if (ultimaError) {
      throw ultimaError;
    }

    let proximoNumero = 1;

    if (
      ultimaSolicitacao?.codigo
    ) {

      const partes =
        ultimaSolicitacao.codigo
          .split('-');

      const ultimoNumero =
        Number(
          partes[2]
        );

      if (
        Number.isFinite(
          ultimoNumero
        )
      ) {
        proximoNumero =
          ultimoNumero + 1;
      }
    }

    const codigo =
      `CJ-${today.getFullYear()}-${String(
        proximoNumero
      ).padStart(5, '0')}`;

    /*
     * 9. CRIA A SOLICITAÇÃO NO SUPABASE
     */

    const solicitacaoResult =
      await supabaseClient
        .from('solicitacoes')
        .insert({
          codigo,
          advogado_id:
            advogado.id,
          cliente_id:
            cliente.id,
          processo_id:
            processo?.id || null,
          area_id:
            area.id,
          tipo_servico_id:
            tipo.id,
          descricao:
            descricao || null,
          prazo:
            prazo || null,
          status:
            'NOVO',
          prioridade,
          calculista_id:
            calculistaId,
          revisor_id:
            null,
          tipo_entrega:
            tipoEntrega,
          valor_cobrado:
            valor,
          desconto:
            0,
          valor_final:
            valor,
          origem:
            origem || null,
          cliente_antigo:
            origem ===
            'Cliente antigo',
          created_by:
            currentUser?.id ||
            null
        })
        .select(
          'id, codigo'
        )
        .single();

    if (solicitacaoResult.error) {
      throw solicitacaoResult.error;
    }

    const solicitacao =
      solicitacaoResult.data;

    /*
     * 10. REGISTRA O PRIMEIRO EVENTO NO HISTÓRICO
     */

    const historicoResult =
      await supabaseClient
        .from(
          'historico_solicitacao'
        )
        .insert({
          solicitacao_id:
            solicitacao.id,
          usuario_id:
            currentUser?.id ||
            null,
          tipo_evento:
            'CRIACAO',
          descricao:
            'Solicitação criada.'
        });

    if (historicoResult.error) {
      console.error(
        'Solicitação criada, mas houve erro ao registrar o histórico:',
        historicoResult.error
      );
    }

    /*
     * 11. RECARREGA OS DADOS DO SUPABASE
     */

    const dadosCarregados =
      await carregarSolicitacoes();

    if (!dadosCarregados) {
      throw new Error(
        'A solicitação foi criada, mas não foi possível atualizar a tela.'
      );
    }

    /*
     * 12. FINALIZA
     */

    closeModal();

    state.view =
      'solicitacoes';

    render();

    showToast(
      `${solicitacao.codigo} criado com sucesso.`
    );

  } catch (error) {

    console.error(
      'Erro ao criar solicitação:',
      error
    );

    showToast(
      error?.message ||
      'Não foi possível criar a solicitação.'
    );

    const button =
      e.target.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled =
        false;

      button.textContent =
        'Criar solicitação';
    }
  }
}

function parseMoney(v) {
  return Number(
    String(v || '')
      .replace(/\./g, '')
      .replace(',', '.')
  ) || 0;
}

function serviceSystem(tipo) {
  if (
    tipo ===
    'Abono de Permanência'
  ) {
    return 'Abono Computum';
  }

  if (
    tipo ===
    'Plano de Saúde'
  ) {
    return 'Saúde Computum';
  }

  if (
    tipo ===
    'Diferenças'
  ) {
    return 'Diferenças Computum';
  }

  return '';
}

function openDetail(id) {

  const r =
    db.requests.find(
      x => x.id === id
    );

  if (!r) return;

  state.selected =
    id;

  $('#drawerRoot').innerHTML = `
    <div
      class="drawer-backdrop"
      id="drawerBackdrop"
    >

      <aside class="drawer">

        <div class="drawer-head">

          <div>

            <strong>
              ${r.codigo}
            </strong>

            <div
              class="muted"
              style="
                font-size:11px;
                margin-top:3px
              "
            >
              Detalhes da solicitação
            </div>

          </div>

          <button
            class="close"
            data-drawer-close
          >
            ×
          </button>

          ${isAdministrador() ? `
            <div class="actions" style="margin-left:auto;margin-right:10px">
              <button class="btn" data-edit-request="${r.id}">✎ Editar</button>
              <button class="btn" data-delete-request="${r.id}">Excluir</button>
            </div>
          ` : ''}

        </div>

        <div class="drawer-body">

          <h2 class="detail-title">
            ${r.tipo}
          </h2>

          <div class="detail-meta">

            <span
              class="status ${statusClass(
                r.status
              )}"
            >
              ${
                statusLabel[
                  r.status
                ]
              }
            </span>

            <span
              class="status ${
                r.prioridade ===
                'Urgente'
                  ? 'atrasado'
                  : 'novo'
              }"
            >
              ${r.prioridade}
            </span>

          </div>

          <div class="detail-grid">

            <div class="detail-box">
              <small>Advogado</small>
              <strong>
                ${r.advogado}
              </strong>
            </div>

            <div class="detail-box">
              <small>Cliente</small>
              <strong>
                ${r.cliente}
              </strong>
            </div>

            <div class="detail-box">
              <small>Processo</small>
              <strong>
                ${r.processo}
              </strong>
            </div>

            <div class="detail-box">
              <small>Prazo</small>
              <strong>
                ${fmtDate(r.prazo)}
              </strong>
            </div>

            <div class="detail-box">
              <small>Calculista</small>
              <strong>
                ${
                  r.calculista ||
                  'Não atribuído'
                }
              </strong>
            </div>

            <div class="detail-box">
              <small>Valor</small>
              <strong>
                ${money(r.valor)}
              </strong>
            </div>

            <div class="detail-box">
              <small>Recebido</small>
              <strong>
                ${money(r.recebido)}
              </strong>
            </div>

            <div class="detail-box">
              <small>Sistema</small>
              <strong>
                ${
                  r.sistema ||
                  'Nenhum vinculado'
                }
              </strong>
            </div>

          </div>

          <div
            class="card"
            style="margin-top:16px"
          >

            <div class="card-head">
              <h2>Solicitação</h2>
            </div>

            <div class="card-body">

              <div
                style="
                  font-size:13px;
                  line-height:1.65
                "
              >
                ${
                  r.descricao ||
                  'Sem descrição.'
                }
              </div>

            </div>

          </div>

          <div
            class="card"
            style="margin-top:16px"
          >

            <div class="card-head">

              <h2>
                Documentos e Google Drive
              </h2>

            </div>

            <div class="card-body">

              <div class="notice">
                Os documentos são recebidos pelo Google Forms e organizados automaticamente pelo Apps Script. A pasta da solicitação pode ser vinculada aqui para acesso direto.
              </div>

              <div class="actions" style="margin-top:14px">
                <button class="btn btn-primary" data-drive-form>📤 Enviar pelo Forms</button>
                <button class="btn" data-drive-link>🔗 Vincular pasta</button>
                <button class="btn" data-drive>📁 Abrir pasta no Drive</button>
              </div>

              <div class="mini-stats" style="margin-top:14px">
                <div class="mini-stat">
                  <strong>FORM</strong>
                  <small>Recebimento de PDFs, imagens e outros documentos permitidos.</small>
                </div>
                <div class="mini-stat">
                  <strong>MANUAL</strong>
                  <small>Vinculação de arquivos ou pastas já existentes no Drive.</small>
                </div>
                <div class="mini-stat">
                  <strong>SUPABASE</strong>
                  <small>Registro da referência, categoria, origem e histórico.</small>
                </div>
              </div>

            </div>

          </div>

          <div
            class="card"
            style="margin-top:16px"
          >

            <div class="card-head">
              <h2>Histórico</h2>
            </div>

            <div class="card-body">

              <div class="timeline">

                ${
                  (
                    r.historico ||
                    []
                  )
                    .map(
                      e => `
                        <div class="event">

                          <strong>
                            ${e[1]}
                          </strong>

                          <small>
                            ${e[0]}
                          </small>

                        </div>
                      `
                    )
                    .join('')
                }

              </div>

            </div>

          </div>

        </div>

      </aside>

    </div>
  `;

  $('#drawerBackdrop')
    .addEventListener(
      'click',
      e => {

        if (
          e.target.id ===
            'drawerBackdrop' ||
          e.target.matches(
            '[data-drawer-close]'
          )
        ) {
          closeDrawer();
        }

        if (e.target.matches('[data-drive]')) {
          if (r.drive) {
            window.open(r.drive, '_blank', 'noopener,noreferrer');
          } else {
            showToast('A pasta desta solicitação ainda não foi vinculada ao Google Drive.');
          }
        }

        if (e.target.matches('[data-drive-form]')) {
          abrirFormularioForms(r);
        }

        if (e.target.matches('[data-drive-link]')) {
          abrirVincularPastaModal(r);
        }
      }
    );
}


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function optionSelected(value, current) {
  return String(value || '') === String(current || '') ? ' selected' : '';
}


function entidadeNome(tipo, id) {
  if (tipo === 'advogado') return db.advogados.find(x => x.id === id)?.nome || 'Advogado';
  if (tipo === 'cliente') return db.clientes.find(x => x.id === id)?.nome || 'Cliente';
  if (tipo === 'processo') return db.processos.find(x => x.id === id)?.numero_processo || 'Processo';
  return 'Cadastro';
}

function quantidadeVinculos(tipo, id) {
  return db.requests.filter(r =>
    tipo === 'advogado' ? r.advogadoId === id :
    tipo === 'cliente' ? r.clienteId === id :
    tipo === 'processo' ? r.processoId === id : false
  ).length;
}

function abrirEdicaoCadastro(tipo, id, requestId = null) {
  if (!isAdministrador()) return;

  let registro = null;
  if (tipo === 'advogado') registro = db.advogados.find(x => x.id === id);
  if (tipo === 'cliente') registro = db.clientes.find(x => x.id === id);
  if (tipo === 'processo') registro = db.processos.find(x => x.id === id);
  if (!registro) {
    showToast('Cadastro não encontrado.');
    return;
  }

  const vinculos = quantidadeVinculos(tipo, id);
  const titulo = tipo === 'advogado' ? 'Editar advogado' : tipo === 'cliente' ? 'Editar cliente' : 'Editar processo';
  const aviso = vinculos > 1
    ? `Este cadastro está vinculado a ${vinculos} solicitações. A alteração será refletida em todas elas.`
    : 'A alteração será refletida nas solicitações que utilizam este cadastro.';

  let fields = '';
  if (tipo === 'advogado') {
    fields = `
      <div class="form-grid">
        <div class="field"><label>Nome *</label><input class="input" name="nome" required value="${escapeHtml(registro.nome || '')}"></div>
        <div class="field"><label>OAB</label><input class="input" name="oab" value="${escapeHtml(registro.oab || '')}"></div>
        <div class="field"><label>UF da OAB</label><input class="input" name="uf_oab" maxlength="2" value="${escapeHtml(registro.uf_oab || '')}"></div>
        <div class="field"><label>Escritório</label><input class="input" name="escritorio" value="${escapeHtml(registro.escritorio || '')}"></div>
        <div class="field"><label>Telefone</label><input class="input" name="telefone" value="${escapeHtml(registro.telefone || '')}"></div>
        <div class="field"><label>WhatsApp</label><input class="input" name="whatsapp" value="${escapeHtml(registro.whatsapp || '')}"></div>
        <div class="field"><label>E-mail</label><input class="input" type="email" name="email" value="${escapeHtml(registro.email || '')}"></div>
        <div class="field"><label>Origem</label><select class="input" name="origem"><option value="">Selecione</option>${['Instagram','Site','WhatsApp','Indicação','Cliente antigo','LinkedIn','Outro'].map(v => `<option value="${v}"${registro.origem === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field full"><label>Observações</label><textarea class="input" name="observacoes" rows="4">${escapeHtml(registro.observacoes || '')}</textarea></div>
      </div>`;
  } else if (tipo === 'cliente') {
    fields = `
      <div class="form-grid">
        <div class="field"><label>Nome *</label><input class="input" name="nome" required value="${escapeHtml(registro.nome || '')}"></div>
        <div class="field"><label>CPF</label><input class="input" name="cpf" value="${escapeHtml(registro.cpf || '')}"></div>
        <div class="field"><label>E-mail</label><input class="input" type="email" name="email" value="${escapeHtml(registro.email || '')}"></div>
        <div class="field"><label>Telefone</label><input class="input" name="telefone" value="${escapeHtml(registro.telefone || '')}"></div>
        <div class="field full"><label>Observações</label><textarea class="input" name="observacoes" rows="4">${escapeHtml(registro.observacoes || '')}</textarea></div>
      </div>`;
  } else {
    const clienteProcessoOptions = db.clientes.map(c => `<option value="${c.id}"${optionSelected(c.id, registro.cliente_id)}>${escapeHtml(c.nome)}${c.cpf ? ` — ${escapeHtml(c.cpf)}` : ''}</option>`).join('');
    fields = `
      <div class="form-grid">
        <div class="field full"><label>Número do processo *</label><input class="input" name="numero_processo" required value="${escapeHtml(registro.numero_processo || '')}"></div>
        <div class="field"><label>Cliente do processo</label><select class="input" name="cliente_id"><option value="">Sem cliente</option>${clienteProcessoOptions}</select></div>
        <div class="field"><label>Tribunal</label><input class="input" name="tribunal" value="${escapeHtml(registro.tribunal || '')}"></div>
        <div class="field"><label>Vara</label><input class="input" name="vara" value="${escapeHtml(registro.vara || '')}"></div>
        <div class="field"><label>Comarca</label><input class="input" name="comarca" value="${escapeHtml(registro.comarca || '')}"></div>
        <div class="field full"><label>Observações</label><textarea class="input" name="observacoes" rows="4">${escapeHtml(registro.observacoes || '')}</textarea></div>
      </div>`;
  }

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="entityEditModal">
      <div class="modal" style="max-width:900px">
        <div class="modal-head">
          <div><h2>${titulo}</h2><small class="muted">${escapeHtml(entidadeNome(tipo, id))}</small></div>
          <button class="close" data-close>×</button>
        </div>
        <form id="entityEditForm">
          <div class="modal-body">
            <div class="notice" style="margin-bottom:16px">${aviso}</div>
            ${fields}
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close>Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar cadastro</button>
          </div>
        </form>
      </div>
    </div>`;

  $('#entityEditModal').addEventListener('click', e => {
    if (e.target.id === 'entityEditModal' || e.target.matches('[data-close]')) closeModal();
  });
  $('#entityEditForm').addEventListener('submit', e => salvarEdicaoCadastro(e, tipo, id, requestId));
}


function abrirNovoProcessoParaSolicitacao(requestId, clienteId = null) {
  if (!isAdministrador()) return;

  const clienteOptions = db.clientes.map(c =>
    `<option value="${c.id}"${optionSelected(c.id, clienteId)}>${escapeHtml(c.nome)}${c.cpf ? ` — ${escapeHtml(c.cpf)}` : ''}</option>`
  ).join('');

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="newProcessModal">
      <div class="modal" style="max-width:760px">
        <div class="modal-head">
          <div><h2>Cadastrar processo</h2><small class="muted">Será vinculado à solicitação selecionada.</small></div>
          <button class="close" data-close>×</button>
        </div>
        <form id="newProcessForm">
          <div class="modal-body">
            <div class="notice" style="margin-bottom:16px">
              Informe o número correto do processo. Depois de salvar, ele ficará vinculado à solicitação.
            </div>
            <div class="form-grid">
              <div class="field full"><label>Número do processo *</label><input class="input" name="numero_processo" required placeholder="0000000-00.0000.0.00.0000"></div>
              <div class="field"><label>Cliente</label><select class="input" name="cliente_id"><option value="">Sem cliente</option>${clienteOptions}</select></div>
              <div class="field"><label>Tribunal</label><input class="input" name="tribunal"></div>
              <div class="field"><label>Vara</label><input class="input" name="vara"></div>
              <div class="field"><label>Comarca</label><input class="input" name="comarca"></div>
              <div class="field full"><label>Observações</label><textarea class="input" name="observacoes" rows="4"></textarea></div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close>Cancelar</button>
            <button type="submit" class="btn btn-primary">Cadastrar e vincular</button>
          </div>
        </form>
      </div>
    </div>`;

  $('#newProcessModal').addEventListener('click', e => {
    if (e.target.id === 'newProcessModal' || e.target.matches('[data-close]')) closeModal();
  });
  $('#newProcessForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const numero = String(f.get('numero_processo') || '').trim();
    const button = e.target.querySelector('button[type="submit"]');
    if (!numero) {
      showToast('Informe o número do processo.');
      return;
    }
    button.disabled = true;
    button.textContent = 'Salvando...';

    const existing = await supabaseClient
      .from('processos')
      .select('id, numero_processo')
      .eq('numero_processo', numero)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      console.error(existing.error);
      showToast('Não foi possível verificar o processo.');
      button.disabled = false;
      button.textContent = 'Cadastrar e vincular';
      return;
    }

    let processo = existing.data;
    if (processo) {
      const confirma = window.confirm(`O processo ${numero} já existe. Deseja vinculá-lo a esta solicitação?`);
      if (!confirma) {
        button.disabled = false;
        button.textContent = 'Cadastrar e vincular';
        return;
      }
    } else {
      const criado = await supabaseClient.from('processos').insert({
        numero_processo: numero,
        cliente_id: f.get('cliente_id') || null,
        tribunal: String(f.get('tribunal') || '').trim() || null,
        vara: String(f.get('vara') || '').trim() || null,
        comarca: String(f.get('comarca') || '').trim() || null,
        observacoes: String(f.get('observacoes') || '').trim() || null
      }).select('id, numero_processo').single();
      if (criado.error) {
        console.error(criado.error);
        showToast('Não foi possível cadastrar o processo.');
        button.disabled = false;
        button.textContent = 'Cadastrar e vincular';
        return;
      }
      processo = criado.data;
    }

    const update = await supabaseClient.from('solicitacoes').update({
      processo_id: processo.id,
      updated_at: new Date().toISOString()
    }).eq('id', requestId);

    if (update.error) {
      console.error(update.error);
      showToast('O processo foi salvo, mas não foi possível vinculá-lo à solicitação.');
      button.disabled = false;
      button.textContent = 'Cadastrar e vincular';
      return;
    }

    await supabaseClient.from('historico_solicitacao').insert({
      solicitacao_id: requestId,
      usuario_id: currentUser?.id || null,
      tipo_evento: 'EDICAO',
      descricao: `Processo ${processo.numero_processo} vinculado à solicitação pelo administrador.`
    });

    closeModal();
    await carregarSolicitacoes();
    showToast('Processo vinculado à solicitação.');
    openDetail(requestId);
  });
}

async function salvarEdicaoCadastro(e, tipo, id, requestId = null) {
  e.preventDefault();
  const f = new FormData(e.target);
  const button = e.target.querySelector('button[type="submit"]');
  let changes;

  if (tipo === 'advogado') {
    changes = {
      nome: String(f.get('nome') || '').trim(),
      oab: String(f.get('oab') || '').trim() || null,
      uf_oab: String(f.get('uf_oab') || '').trim().toUpperCase() || null,
      escritorio: String(f.get('escritorio') || '').trim() || null,
      telefone: String(f.get('telefone') || '').trim() || null,
      whatsapp: String(f.get('whatsapp') || '').trim() || null,
      email: String(f.get('email') || '').trim() || null,
      origem: String(f.get('origem') || '').trim() || null,
      observacoes: String(f.get('observacoes') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
  } else if (tipo === 'cliente') {
    changes = {
      nome: String(f.get('nome') || '').trim(),
      cpf: String(f.get('cpf') || '').trim() || null,
      email: String(f.get('email') || '').trim() || null,
      telefone: String(f.get('telefone') || '').trim() || null,
      observacoes: String(f.get('observacoes') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
  } else {
    changes = {
      numero_processo: String(f.get('numero_processo') || '').trim(),
      cliente_id: f.get('cliente_id') || null,
      tribunal: String(f.get('tribunal') || '').trim() || null,
      vara: String(f.get('vara') || '').trim() || null,
      comarca: String(f.get('comarca') || '').trim() || null,
      observacoes: String(f.get('observacoes') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
  }

  if (!changes.nome && (tipo === 'advogado' || tipo === 'cliente')) {
    showToast('Informe o nome.');
    return;
  }
  if (!changes.numero_processo && tipo === 'processo') {
    showToast('Informe o número do processo.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Salvando...';

  const tabela = tipo === 'advogado' ? 'advogados' : tipo === 'cliente' ? 'clientes' : 'processos';
  const { error } = await supabaseClient.from(tabela).update(changes).eq('id', id);
  if (error) {
    console.error(`Erro ao editar ${tipo}:`, error);
    showToast(error.code === '23505' ? 'Já existe um cadastro com esse identificador.' : 'Não foi possível salvar o cadastro.');
    button.disabled = false;
    button.textContent = 'Salvar cadastro';
    return;
  }

  await carregarSolicitacoes();
  closeModal();
  showToast('Cadastro atualizado. As solicitações relacionadas foram atualizadas.');

  if (requestId) {
    const atual = db.requests.find(x => x.id === requestId);
    if (atual) openDetail(requestId);
  } else {
    render();
  }
}

function editRequestModal(r) {
  const areaOptions = db.areas.filter(a => a.ativo !== false).map(a =>
    `<option value="${a.id}"${optionSelected(a.id, r.areaId)}>${a.nome}</option>`
  ).join('');
  const tipoOptions = db.tipos.filter(t => t.ativo !== false && (!r.areaId || t.area_id === r.areaId)).map(t =>
    `<option value="${t.id}"${optionSelected(t.id, r.tipoId)}>${t.nome}</option>`
  ).join('');
  const advogadoOptions = db.advogados.filter(a => a.ativo !== false).map(a =>
    `<option value="${a.id}"${optionSelected(a.id, r.advogadoId)}>${a.nome}${a.oab ? ` — OAB ${a.oab}${a.uf_oab ? '/' + a.uf_oab : ''}` : ''}</option>`
  ).join('');
  const clienteOptions = db.clientes.map(c =>
    `<option value="${c.id}"${optionSelected(c.id, r.clienteId)}>${c.nome}${c.cpf ? ` — ${c.cpf}` : ''}</option>`
  ).join('');
  const processoOptions = db.processos.map(p =>
    `<option value="${p.id}"${optionSelected(p.id, r.processoId)}>${p.numero_processo}</option>`
  ).join('');
  const calcOptions = db.calculistas.filter(c => c.ativo !== false).map(c =>
    `<option value="${c.id}"${optionSelected(c.id, r.calculistaId)}>${c.nome}</option>`
  ).join('');

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="editRequestModal">
      <div class="modal" style="max-width:900px">
        <div class="modal-head">
          <div>
            <h2>Editar solicitação</h2>
            <small class="muted">${r.codigo}</small>
          </div>
          <button class="close" data-close>×</button>
        </div>
        <form id="editRequestForm">
          <div class="modal-body">
            <div class="notice" style="margin-bottom:16px">
              As alterações são salvas na mesma solicitação e ficarão disponíveis imediatamente para o calculista. A alteração também será registrada no histórico.
            </div>
            <div class="form-grid">
              <div class="field">
                <label>Advogado</label>
                <div class="select-with-action">
                  <select class="input" name="advogado_id">${advogadoOptions}</select>
                  ${r.advogadoId ? `<button type="button" class="entity-edit-link" data-edit-entity="advogado" data-entity-id="${r.advogadoId}" data-request-id="${r.id}" title="Editar cadastro do advogado">✎ Editar cadastro</button>` : ''}
                </div>
              </div>
              <div class="field">
                <label>Cliente</label>
                <div class="select-with-action">
                  <select class="input" name="cliente_id">${clienteOptions}</select>
                  ${r.clienteId ? `<button type="button" class="entity-edit-link" data-edit-entity="cliente" data-entity-id="${r.clienteId}" data-request-id="${r.id}" title="Editar cadastro do cliente">✎ Editar cadastro</button>` : ''}
                </div>
              </div>
              <div class="field">
                <label>Processo</label>
                <div class="select-with-action">
                  <select class="input" name="processo_id"><option value="">Sem processo</option>${processoOptions}</select>
                  ${r.processoId ? `<button type="button" class="entity-edit-link" data-edit-entity="processo" data-entity-id="${r.processoId}" data-request-id="${r.id}" title="Editar cadastro do processo">✎ Editar cadastro</button>` : `<button type="button" class="entity-edit-link" data-create-process-for-request="${r.id}" title="Cadastrar processo para esta solicitação">＋ Cadastrar processo</button>`}
                </div>
              </div>
              <div class="field"><label>Área</label><select class="input" name="area_id" id="editArea">${areaOptions}</select></div>
              <div class="field"><label>Tipo de serviço</label><select class="input" name="tipo_servico_id" id="editTipo">${tipoOptions}</select></div>
              <div class="field"><label>Calculista</label><select class="input" name="calculista_id"><option value="">Não atribuído</option>${calcOptions}</select></div>
              <div class="field"><label>Status</label><select class="input" name="status">
                ${Object.entries(statusLabel).map(([v,l]) => `<option value="${v}"${optionSelected(v,r.status)}>${l}</option>`).join('')}
              </select></div>
              <div class="field"><label>Prioridade</label><select class="input" name="prioridade">
                <option value="normal"${r.prioridade === 'Normal' ? ' selected' : ''}>Normal</option>
                <option value="alta"${r.prioridade === 'Alta' ? ' selected' : ''}>Alta</option>
                <option value="urgente"${r.prioridade === 'Urgente' ? ' selected' : ''}>Urgente</option>
              </select></div>
              <div class="field"><label>Prazo</label><input class="input" type="date" name="prazo" value="${r.prazo || ''}"></div>
              <div class="field"><label>Valor cobrado</label><input class="input" name="valor_cobrado" inputmode="decimal" value="${Number(r.valor || 0).toFixed(2).replace('.', ',')}"></div>
              <div class="field"><label>Origem</label><select class="input" name="origem">
                ${['Indicação','Instagram','Site','WhatsApp','Cliente antigo','LinkedIn','Outro'].map(v => `<option${r.origem === v ? ' selected' : ''}>${v}</option>`).join('')}
              </select></div>
              <div class="field"><label>Tipo de entrega</label><select class="input" name="tipo_entrega">
                ${[['calculo','Cálculo'],['calculo_parecer','Cálculo + parecer'],['parecer','Apenas parecer'],['conferencia','Conferência'],['outro','Outro']].map(([v,l]) => `<option value="${v}"${String(r.tipoEntrega || '') === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select></div>
              <div class="field full"><label>Descrição / observações</label><textarea class="input" name="descricao" rows="5">${r.descricao || ''}</textarea></div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close>Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar alterações</button>
          </div>
        </form>
      </div>
    </div>`;

  const area = $('#editArea');
  const tipo = $('#editTipo');
  area.addEventListener('change', () => {
    tipo.innerHTML = '<option value="">Selecione</option>' + db.tipos.filter(t => t.ativo !== false && t.area_id === area.value).map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  });
  $('#editRequestModal').addEventListener('click', e => {
    if (e.target.id === 'editRequestModal' || e.target.matches('[data-close]')) closeModal();
  });

  // Ações dos cadastros relacionados: listeners diretos no modal.
  // Mantemos também a delegação global como fallback, mas o listener direto
  // garante que o clique funcione mesmo após a reconstrução do modal.
  $('#editRequestModal').querySelectorAll('[data-edit-entity]').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdministrador()) return;
      abrirEdicaoCadastro(
        button.dataset.editEntity,
        button.dataset.entityId,
        button.dataset.requestId || r.id
      );
    });
  });

  $('#editRequestModal').querySelectorAll('[data-create-process-for-request]').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdministrador()) return;
      abrirNovoProcessoParaSolicitacao(
        button.dataset.createProcessForRequest,
        button.dataset.clienteId || r.clienteId || null
      );
    });
  });

  $('#editRequestForm').addEventListener('submit', e => updateRequest(e, r));
}

async function updateRequest(e, r) {
  e.preventDefault();
  const f = new FormData(e.target);
  const button = e.target.querySelector('button[type="submit"]');
  const valor = parseMoney(f.get('valor_cobrado'));
  const changes = {
    advogado_id: f.get('advogado_id') || null,
    cliente_id: f.get('cliente_id') || null,
    processo_id: f.get('processo_id') || null,
    area_id: f.get('area_id') || null,
    tipo_servico_id: f.get('tipo_servico_id') || null,
    calculista_id: f.get('calculista_id') || null,
    status: f.get('status') || 'NOVO',
    prioridade: f.get('prioridade') || 'normal',
    prazo: f.get('prazo') || null,
    valor_cobrado: valor,
    valor_final: valor,
    origem: f.get('origem') || null,
    tipo_entrega: f.get('tipo_entrega') || 'calculo',
    descricao: String(f.get('descricao') || '').trim(),
    cliente_antigo: f.get('origem') === 'Cliente antigo',
    updated_at: new Date().toISOString()
  };
  button.disabled = true;
  button.textContent = 'Salvando...';
  const { error } = await supabaseClient.from('solicitacoes').update(changes).eq('id', r.id);
  if (error) {
    console.error('Erro ao editar solicitação:', error);
    showToast('Não foi possível salvar as alterações.');
    button.disabled = false;
    button.textContent = 'Salvar alterações';
    return;
  }
  const descricaoHistorico = 'Solicitação editada pelo administrador.';
  await supabaseClient.from('historico_solicitacao').insert({ solicitacao_id: r.id, usuario_id: currentUser?.id || null, tipo_evento: 'EDICAO', descricao: descricaoHistorico });
  closeModal();
  await carregarSolicitacoes();
  showToast('Solicitação atualizada. O calculista verá os dados atualizados.');
  openDetail(r.id);
  if (state.view === 'solicitacoes') render();
}

async function excluirSolicitacao(r) {
  const confirmacao = window.confirm(`Excluir definitivamente a solicitação ${r.codigo}?\n\nOs registros relacionados, como histórico, pagamentos, retrabalhos e arquivos vinculados ao registro serão removidos conforme as regras do banco.\n\nEsta ação não pode ser desfeita.`);
  if (!confirmacao) return;
  const segunda = window.confirm(`Confirma novamente a exclusão de ${r.codigo}?`);
  if (!segunda) return;
  const { error } = await supabaseClient.from('solicitacoes').delete().eq('id', r.id);
  if (error) {
    console.error('Erro ao excluir solicitação:', error);
    showToast('Não foi possível excluir a solicitação.');
    return;
  }
  closeDrawer();
  state.selected = null;
  await carregarSolicitacoes();
  render();
  showToast(`${r.codigo} excluída.`);
}

function closeDrawer() {
  $('#drawerRoot').innerHTML = '';
}

function bindView() {
  // A navegação e os controles dinâmicos usam delegação de eventos.
  // Isso evita registrar novos listeners a cada renderização.
}

function initEventDelegation() {
  const content = $('#content');
  const menu = $('#sidebar');

  if (menu && !menu.dataset.eventsReady) {
    menu.dataset.eventsReady = 'true';
    menu.addEventListener('click', event => {
      const button = event.target.closest('.nav-item[data-view]');
      if (!button || !menu.contains(button)) return;
      event.preventDefault();
      nav(button.dataset.view);
    });
  }

  const drawerRoot = $('#drawerRoot');
  if (drawerRoot && !drawerRoot.dataset.eventsReady) {
    drawerRoot.dataset.eventsReady = 'true';
    drawerRoot.addEventListener('click', event => {
      const editButton = event.target.closest('[data-edit-request]');
      if (editButton && drawerRoot.contains(editButton)) {
        const r = db.requests.find(x => x.id === editButton.dataset.editRequest);
        if (r && isAdministrador()) editRequestModal(r);
        return;
      }

      const deleteButton = event.target.closest('[data-delete-request]');
      if (deleteButton && drawerRoot.contains(deleteButton)) {
        const r = db.requests.find(x => x.id === deleteButton.dataset.deleteRequest);
        if (r && isAdministrador()) excluirSolicitacao(r);
        return;
      }
    });
  }

  // Ações de edição/cadastro de entidades são delegadas ao documento.
  // Isso continua funcionando mesmo quando #modalRoot troca seu innerHTML.
  if (!document.documentElement.dataset.entityActionsReady) {
    document.documentElement.dataset.entityActionsReady = 'true';
    document.addEventListener('click', event => {
      const entityButton = event.target.closest('[data-edit-entity]');
      if (entityButton) {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdministrador()) return;
        const entityType = entityButton.dataset.editEntity;
        const entityId = entityButton.dataset.entityId;
        const requestId = entityButton.dataset.requestId || null;
        abrirEdicaoCadastro(entityType, entityId, requestId);
        return;
      }

      const createProcessButton = event.target.closest('[data-create-process-for-request]');
      if (createProcessButton) {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdministrador()) return;
        abrirNovoProcessoParaSolicitacao(
          createProcessButton.dataset.createProcessForRequest,
          createProcessButton.dataset.clienteId || null
        );
      }
    });
  }

  if (!content || content.dataset.eventsReady) return;
  content.dataset.eventsReady = 'true';

  content.addEventListener('click', event => {
    const tutorial = event.target.closest('[data-tutorial]');
    if (tutorial) {
      const panel = tutorial.closest('#content')?.querySelector('[data-tutorial-panel]');
      if (panel) {
        panel.hidden = !panel.hidden;
        tutorial.classList.toggle('active', !panel.hidden);
      }
      return;
    }

    const newButton = event.target.closest('[data-new]');
    if (newButton) {
      openNew();
      return;
    }

    const viewLink = event.target.closest('[data-view-link]');
    if (viewLink) {
      nav(viewLink.dataset.viewLink);
      return;
    }

    const calcButton = event.target.closest('[data-open-calculista]');
    if (calcButton) {
      openCalculistaDetail(calcButton.dataset.openCalculista);
      return;
    }

    const openButton = event.target.closest('[data-open]');
    if (openButton) {
      openDetail(openButton.dataset.open);
      return;
    }

    const editButton = event.target.closest('[data-edit-request]');
    if (editButton) {
      const r = db.requests.find(x => x.id === editButton.dataset.editRequest);
      if (r && isAdministrador()) editRequestModal(r);
      return;
    }

    const deleteButton = event.target.closest('[data-delete-request]');
    if (deleteButton) {
      const r = db.requests.find(x => x.id === deleteButton.dataset.deleteRequest);
      if (r && isAdministrador()) excluirSolicitacao(r);
      return;
    }

    const systemButton = event.target.closest('[data-system]');
    if (systemButton) {
      showToast('Cadastro de sistemas será conectado ao Supabase.');
    }
  });

  content.addEventListener('input', event => {
    const q = event.target.closest('#q');
    if (q) {
      state.query = q.value;
      clearTimeout(queryRenderTimer);
      queryRenderTimer = setTimeout(() => render(), 120);
      return;
    }

    const processSearch = event.target.closest('#processSearch');
    if (processSearch) {
      const table = $('#processTable');
      if (table) table.innerHTML = processTable(processSearch.value);
    }
  });

  content.addEventListener('change', event => {
    const status = event.target.closest('#filterStatus');
    if (status) {
      state.status = status.value;
      render();
      return;
    }

    const area = event.target.closest('#filterArea');
    if (area) {
      state.area = area.value;
      render();
      return;
    }

    const viewMode = event.target.closest('#viewMode');
    if (viewMode) {
      const list = $('#requestList');
      if (!list) return;

      if (viewMode.value === 'kanban') {
        list.innerHTML = kanban();
      } else {
        let rows = db.requests.filter(r =>
          (!state.query || `${r.codigo} ${r.advogado} ${r.cliente}`.toLowerCase().includes(state.query.toLowerCase())) &&
          (!state.status || r.status === state.status) &&
          (!state.area || r.area === state.area)
        );
        list.innerHTML = tableRequests(rows);
      }
    }
  });
}

function kanban() {

  const cols = [
    ['NOVO', 'Novas'],
    ['EM_CÁLCULO', 'Em cálculo'],
    ['EM_REVISÃO', 'Em revisão'],
    ['ENVIADO', 'Enviadas']
  ];

  return `
    <div class="kanban">

      ${
        cols
          .map(
            ([s, l]) => `
              <div class="kanban-col">

                <div class="kanban-head">
                  <span>${l}</span>
                  <span>
                    ${
                      db.requests.filter(
                        r =>
                          r.status === s
                      ).length
                    }
                  </span>
                </div>

                ${
                  db.requests
                    .filter(
                      r =>
                        r.status === s
                    )
                    .map(
                      r => `
                        <div
                          class="kanban-card"
                          data-open="${r.id}"
                        >

                          <strong>
                            ${r.codigo}
                          </strong>

                          <small>
                            ${r.tipo}
                            <br>
                            ${r.advogado}
                            <br>
                            Prazo:
                            ${fmtDate(
                              r.prazo
                            )}
                          </small>

                        </div>
                      `
                    )
                    .join('')
                }

              </div>
            `
          )
          .join('')
      }

    </div>
  `;
}

$('#menuBtn').addEventListener(
  'click',
  () =>
    $('#sidebar').classList.toggle(
      'open'
    )
);

initEventDelegation();

(async function iniciarAplicacao() {

  const autenticado =
    await carregarSessao();

  if (!autenticado) return;

  const dadosCarregados =
    await carregarSolicitacoes();

  if (!dadosCarregados) return;

  render();

})();
