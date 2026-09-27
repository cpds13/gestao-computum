/* Gestão Computum — primeira versão de frontend.
   O armazenamento local abaixo é apenas modo protótipo.
   Em produção, substituir a camada store por Supabase e o upload por Google Drive.
*/

const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  googleDriveFolderId: '',
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
    const usuarios = usuariosResult.data || [];
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
      const calculista = usuarioMap.get(solicitacao.calculista_id);
      const revisor = usuarioMap.get(solicitacao.revisor_id);
      const sistema = sistemaMap.get(solicitacao.area_id);

      return {
        id: solicitacao.id,
        codigo: solicitacao.codigo,
        advogado: advogado?.nome || 'Não informado',
        cliente: cliente?.nome || 'Não informado',
        processo: processo?.numero_processo || 'Não informado',
        area: area?.nome || 'Não informado',
        tipo: tipo?.nome || 'Não informado',
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

const state = { view:'dashboard', query:'', status:'', area:'', selected:null };
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = s => s ? new Date(s+'T12:00:00').toLocaleDateString('pt-BR') : '—';
const today = new Date();
const daysTo = s => s ? Math.ceil((new Date(s+'T12:00:00') - new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000) : 9999;
const statusLabel = {NOVO:'Novo', ANALISE:'Análise', AGUARDANDO_DOCUMENTOS:'Aguardando documentos', EM_CÁLCULO:'Em cálculo', EM_REVISÃO:'Em revisão', ENVIADO:'Enviado', AGUARDANDO_PAGAMENTO:'Aguardando pagamento', CONCLUÍDO:'Concluído', IMPUGNADO:'Impugnado', PAUSADO:'Pausado', CANCELADO:'Cancelado'};
const statusClass = s => ({NOVO:'novo',EM_CÁLCULO:'calculo',EM_REVISÃO:'revisao',ENVIADO:'enviado',CONCLUÍDO:'concluido',AGUARDANDO_DOCUMENTOS:'aguardando',AGUARDANDO_PAGAMENTO:'aguardando',IMPUGNADO:'atrasado'}[s] || 'novo');

function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2600); }
function nav(view){ state.view=view; state.query=''; render(); if(window.innerWidth<801) $('#sidebar').classList.remove('open'); }
function activeNav(){ $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view)); }

function render(){
  activeNav();
  const titles={dashboard:'Dashboard',solicitacoes:'Solicitações',advogados:'Advogados',clientes:'Clientes',processos:'Processos',calculistas:'Calculistas',financeiro:'Financeiro',relatorios:'Relatórios',configuracoes:'Configurações'};
  $('#breadcrumb').textContent=titles[state.view]||'Dashboard';
  const fn = views[state.view] || views.dashboard;
  $('#content').innerHTML = fn();
  bindView();
}

function pageHead(title, sub, action='') { return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div>${action?`<div class="actions">${action}</div>`:''}</div>`; }
function kpi(label,value,sub){return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`}
function requestRow(r){return `<tr data-open="${r.id}"><td><strong>${r.codigo}</strong></td><td>${r.advogado}</td><td>${r.cliente}</td><td>${r.tipo}</td><td>${r.calculista||'<span class="muted">Não atribuído</span>'}</td><td>${fmtDate(r.prazo)}</td><td><span class="status ${statusClass(r.status)}">${statusLabel[r.status]||r.status}</span></td><td class="money">${money(r.valor)}</td></tr>`}
function tableRequests(rows){ if(!rows.length)return `<div class="empty">Nenhuma solicitação encontrada.</div>`; return `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Advogado</th><th>Cliente</th><th>Serviço</th><th>Calculista</th><th>Prazo</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows.map(requestRow).join('')}</tbody></table></div>`; }

const views = {
 dashboard(){
   const open=db.requests.filter(r=>!['CONCLUÍDO','CANCELADO'].includes(r.status)).length;
   const recv=db.requests.reduce((a,r)=>a+(r.recebido||0),0), billed=db.requests.reduce((a,r)=>a+(r.valor||0),0);
   const due=db.requests.reduce((a,r)=>a+Math.max(0,(r.valor||0)-(r.recebido||0)),0);
   const retr=2;
   const attention=db.requests.filter(r=>daysTo(r.prazo)<=3 && !['CONCLUÍDO','CANCELADO'].includes(r.status));
   return pageHead(`Boa noite, ${currentProfile?.nome || 'Usuário'}`,'Visão geral da operação de cálculos judiciais.','<button class="btn btn-primary" data-new>＋ Nova solicitação</button>')+
   `<div class="grid kpi-grid">${kpi('Em aberto',open,'Solicitações não concluídas')}${kpi('A receber',money(due),'Saldo das demandas')}${kpi('Recebido',money(recv),'Acumulado no protótipo')}${kpi('Retrabalhos',retr,'Ocorrências recentes')}</div>`+
   `<div class="section-grid"><section class="card"><div class="card-head"><h2>Solicitações recentes</h2><button class="kpi-link" data-view-link="solicitacoes">Ver todas</button></div>${tableRequests(db.requests.slice(0,6))}</section><section class="card"><div class="card-head"><h2>Precisam de atenção</h2></div><div class="card-body"><div class="alert-list">${attention.length?attention.map(r=>`<div class="alert ${daysTo(r.prazo)<0?'danger':'warning'}" data-open="${r.id}"><div class="mark"></div><div><strong>${r.codigo} · ${r.tipo}</strong><small>${daysTo(r.prazo)<0?'Atrasado':daysTo(r.prazo)===0?'Vence hoje':`Vence em ${daysTo(r.prazo)} dias`} · ${r.advogado}</small></div></div>`).join(''):`<div class="empty">Nenhuma pendência urgente.</div>`}</div></div></section></div>`;
 },
 solicitacoes(){
   let rows=db.requests.filter(r=>(!state.query || `${r.codigo} ${r.advogado} ${r.cliente} ${r.processo} ${r.tipo}`.toLowerCase().includes(state.query.toLowerCase())) && (!state.status||r.status===state.status) && (!state.area||r.area===state.area));
   return pageHead('Solicitações',`${rows.length} demanda(s) encontrada(s).`,'<button class="btn btn-primary" data-new>＋ Nova solicitação</button>')+
   `<div class="card filters"><div class="field"><label>Pesquisar</label><input class="input" id="q" placeholder="Advogado, cliente, processo ou código..." value="${state.query}"></div><div class="field small"><label>Status</label><select id="filterStatus"><option value="">Todos</option>${Object.entries(statusLabel).map(([k,v])=>`<option value="${k}" ${state.status===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field small"><label>Área</label><select id="filterArea"><option value="">Todas</option>${['Previdenciário','Trabalhista','Servidor Público','Cível','Tributário','Saúde'].map(v=>`<option ${state.area===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field small"><label>Visualização</label><select id="viewMode"><option value="table">Tabela</option><option value="kanban">Kanban</option></select></div></div><div id="requestList" class="card">${tableRequests(rows)}</div>`;
 },
 advogados(){
   const names=[...new Set(db.requests.map(r=>r.advogado))];
   return pageHead('Advogados','Relacionamento e histórico dos solicitantes.')+`<div class="grid two-col">${names.map(n=>{const rs=db.requests.filter(r=>r.advogado===n), bill=rs.reduce((a,r)=>a+r.valor,0), rec=rs.reduce((a,r)=>a+r.recebido,0);return `<div class="card"><div class="profile-card"><div class="avatar">${n.replace(/[^A-Za-zÀ-ÿ]/g,'').slice(0,1)||'A'}</div><div class="person-meta"><h3>${n}</h3><p>${rs[0].origem} · ${rs.length} solicitações</p></div></div><div class="card-body"><div class="mini-stats"><div class="mini-stat"><strong>${rs.length}</strong><small>Solicitações</small></div><div class="mini-stat"><strong>${money(bill)}</strong><small>Faturado</small></div><div class="mini-stat"><strong>${money(bill-rec)}</strong><small>A receber</small></div></div></div></div>`}).join('')}</div>`;
 },
 clientes(){
   const names=[...new Set(db.requests.map(r=>r.cliente))];
   return pageHead('Clientes','Clientes finais relacionados às demandas.')+`<div class="card">${names.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Processo</th><th>Solicitações</th><th>Valor</th><th>Recebido</th></tr></thead><tbody>${names.map(n=>{const rs=db.requests.filter(r=>r.cliente===n);return `<tr data-open="${rs[0].id}"><td><strong>${n}</strong></td><td>${rs[0].processo||'—'}</td><td>${rs.length}</td><td class="money">${money(rs.reduce((a,r)=>a+r.valor,0))}</td><td class="money">${money(rs.reduce((a,r)=>a+r.recebido,0))}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">Nenhum cliente.</div>`}</div>`;
 },
 processos(){
   return pageHead('Processos','Pesquisa e acompanhamento das demandas por processo.')+`<div class="card filters"><div class="field"><label>Pesquisar processo</label><input class="input" id="processSearch" placeholder="Número do processo..."></div></div><div id="processTable" class="card">${processTable('')}</div>`;
 },
 calculistas(){
   const names=['Patrick','João']; return pageHead('Calculistas','Distribuição e acompanhamento operacional.')+`<div class="grid two-col">${names.map(n=>{const rs=db.requests.filter(r=>r.calculista===n);const done=rs.filter(r=>r.status==='CONCLUÍDO').length;const active=rs.filter(r=>!['CONCLUÍDO','CANCELADO'].includes(r.status)).length;return `<div class="card"><div class="card-body"><div class="profile-card" style="padding:0"><div class="avatar">${n[0]}</div><div class="person-meta"><h3>${n}</h3><p>Calculista</p></div></div><div class="mini-stats"><div class="mini-stat"><strong>${active}</strong><small>Em andamento</small></div><div class="mini-stat"><strong>${done}</strong><small>Concluídos</small></div><div class="mini-stat"><strong>${rs.length}</strong><small>Total</small></div></div></div></div>`}).join('')}</div>`;
 },
 financeiro(){
   const billed=db.requests.reduce((a,r)=>a+r.valor,0), rec=db.requests.reduce((a,r)=>a+r.recebido,0), due=billed-rec;
   return pageHead('Financeiro','Faturamento, recebimentos e contas a receber.')+`<div class="grid kpi-grid">${kpi('Faturado',money(billed),'Total das solicitações')}${kpi('Recebido',money(rec),'Pagamentos registrados')}${kpi('A receber',money(due),'Saldo em aberto')}${kpi('Em atraso',money(db.requests.filter(r=>daysTo(r.prazo)<0 && r.valor>r.recebido).reduce((a,r)=>a+(r.valor-r.recebido),0)),'Prazos vencidos')}</div><div class="card" style="margin-top:16px"><div class="card-head"><h2>Contas a receber</h2></div><div class="table-wrap"><table><thead><tr><th>Solicitação</th><th>Advogado</th><th>Serviço</th><th>Cobrado</th><th>Recebido</th><th>Saldo</th><th>Status</th></tr></thead><tbody>${db.requests.filter(r=>r.valor>r.recebido).map(r=>`<tr data-open="${r.id}"><td><strong>${r.codigo}</strong></td><td>${r.advogado}</td><td>${r.tipo}</td><td class="money">${money(r.valor)}</td><td class="money">${money(r.recebido)}</td><td class="money">${money(r.valor-r.recebido)}</td><td><span class="status ${daysTo(r.prazo)<0?'atrasado':'aguardando'}">${daysTo(r.prazo)<0?'Em atraso':'A receber'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
 },
 relatorios(){
   const areas={}; db.requests.forEach(r=>areas[r.area]=(areas[r.area]||0)+1); const orig={}; db.requests.forEach(r=>orig[r.origem]=(orig[r.origem]||0)+1);
   return pageHead('Relatórios','Visões operacionais para produção, origem e financeiro.')+`<div class="grid two-col"><section class="card"><div class="card-head"><h2>Solicitações por área</h2></div><div class="card-body">${Object.entries(areas).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--line);font-size:13px"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div></section><section class="card"><div class="card-head"><h2>Origem das solicitações</h2></div><div class="card-body">${Object.entries(orig).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--line);font-size:13px"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div></section></div><div class="notice" style="margin-top:16px">Os gráficos avançados, exportação e indicadores históricos serão ligados ao Supabase na próxima etapa.</div>`;
 },
 configuracoes(){
   return pageHead('Configurações','Cadastros e integrações do Gestão Computum.')+`<div class="grid two-col"><section class="card"><div class="card-head"><h2>Sistemas especializados</h2><button class="btn" data-system>＋ Adicionar</button></div><div class="card-body"><div class="alert-list"><div class="alert"><div class="mark"></div><div><strong>Abono Computum</strong><small>https://abono.computum.com.br</small></div></div><div class="alert"><div class="mark"></div><div><strong>Diferenças Computum</strong><small>https://diferencas.computum.com.br</small></div></div><div class="alert"><div class="mark"></div><div><strong>Saúde Computum</strong><small>https://saude.computum.com.br</small></div></div></div></div></section><section class="card"><div class="card-head"><h2>Integrações</h2></div><div class="card-body"><div class="notice"><strong>Supabase:</strong> aguardando URL e chave pública do projeto.</div><div class="notice" style="margin-top:10px"><strong>Google Drive:</strong> integração preparada conceitualmente; requer OAuth/configuração da aplicação.</div></div></section></div>`;
 }
};

function processTable(q){const seen=new Map();db.requests.forEach(r=>{if(q && !r.processo.toLowerCase().includes(q.toLowerCase()))return;if(!seen.has(r.processo))seen.set(r.processo,r)});const rows=[...seen.values()];return rows.length?`<div class="table-wrap"><table><thead><tr><th>Processo</th><th>Cliente</th><th>Advogado</th><th>Último serviço</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr data-open="${r.id}"><td><strong>${r.processo}</strong></td><td>${r.cliente}</td><td>${r.advogado}</td><td>${r.tipo}</td><td><span class="status ${statusClass(r.status)}">${statusLabel[r.status]}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">Nenhum processo encontrado.</div>`}

function newModal(){
  return `<div class="modal-backdrop" id="requestModal"><div class="modal"><div class="modal-head"><h2>Nova solicitação</h2><button class="close" data-close>×</button></div><form id="requestForm"><div class="modal-body"><div class="notice" style="margin-bottom:16px">Cadastro rápido: os dados podem ser complementados depois. O upload para o Google Drive será conectado quando a integração OAuth estiver configurada.</div><div class="form-grid"><div class="field"><label>Advogado *</label><input required name="advogado" class="input" placeholder="Nome do advogado"></div><div class="field"><label>Origem</label><select name="origem"><option>Indicação</option><option>Instagram</option><option>Site</option><option>WhatsApp</option><option>Cliente antigo</option><option>LinkedIn</option><option>Outro</option></select></div><div class="field"><label>Cliente *</label><input required name="cliente" class="input" placeholder="Nome do cliente"></div><div class="field"><label>CPF</label><input name="cpf" class="input" placeholder="Opcional"></div><div class="field"><label>Número do processo</label><input name="processo" class="input" placeholder="0000000-00.0000.0.00.0000"></div><div class="field"><label>Prazo</label><input type="date" name="prazo" class="input"></div><div class="field"><label>Área *</label><select required name="area" id="newArea"><option value="">Selecione</option><option>Previdenciário</option><option>Trabalhista</option><option>Servidor Público</option><option>Cível</option><option>Tributário</option><option>Saúde</option></select></div><div class="field"><label>Tipo de serviço *</label><select required name="tipo" id="newTipo"><option value="">Selecione a área primeiro</option></select></div><div class="field"><label>Calculista</label><select name="calculista"><option value="">Não atribuído</option><option>Patrick</option><option>João</option></select></div><div class="field"><label>Valor cobrado</label><input name="valor" class="input" inputmode="decimal" placeholder="0,00"></div><div class="field"><label>Prioridade</label><select name="prioridade"><option>Normal</option><option>Alta</option><option>Urgente</option></select></div><div class="field"><label>Tipo de entrega</label><select name="entrega"><option>Cálculo</option><option>Cálculo + parecer</option><option>Apenas parecer</option><option>Conferência</option></select></div><div class="field full"><label>Texto da solicitação</label><textarea name="descricao" rows="4" placeholder="Cole aqui a mensagem ou descreva o que o advogado solicitou..."></textarea></div><div class="field full"><label>Documento inicial</label><input type="file" name="arquivo" class="input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"></div></div></div><div class="modal-foot"><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Criar solicitação</button></div></form></div></div>`;
}

const serviceMap={
 'Previdenciário':['Liquidação de sentença','Revisão de RMI','Atualização','LOAS','Outro'],
 'Trabalhista':['Liquidação','Dano material','Dano moral','Atualização','Outro'],
 'Servidor Público':['Abono de Permanência','Verbas remuneratórias','13º salário','Férias','Outro'],
 'Cível':['Dano material','Dano moral','Liquidação','Atualização','Outro'],
 'Tributário':['Diferenças','Atualização','Liquidação','Outro'],
 'Saúde':['Plano de Saúde','Dano material','Dano moral','Liquidação','Outro']
};

function openNew(){ $('#modalRoot').innerHTML=newModal(); const area=$('#newArea'), tipo=$('#newTipo'); area.addEventListener('change',()=>{tipo.innerHTML='<option value="">Selecione</option>'+(serviceMap[area.value]||[]).map(x=>`<option>${x}</option>`).join('')}); $('#requestModal').addEventListener('click',e=>{if(e.target.id==='requestModal'||e.target.matches('[data-close]')) closeModal()}); $('#requestForm').addEventListener('submit',createRequest); }
function closeModal(){ $('#modalRoot').innerHTML=''; }
function createRequest(e){ e.preventDefault(); const f=new FormData(e.target); const num=db.requests.length+158; const r={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),codigo:`CJ-${today.getFullYear()}-${String(num).padStart(5,'0')}`,advogado:f.get('advogado'),cliente:f.get('cliente'),processo:f.get('processo')||'Não informado',area:f.get('area'),tipo:f.get('tipo'),status:'NOVO',prioridade:f.get('prioridade'),calculista:f.get('calculista'),revisor:'',prazo:f.get('prazo'),valor:parseMoney(f.get('valor')),recebido:0,origem:f.get('origem'),sistema:serviceSystem(f.get('tipo')),descricao:f.get('descricao'),data:new Date().toISOString().slice(0,10),drive:'',historico:[[new Date().toLocaleString('pt-BR'), 'Solicitação criada']]}; db.requests.unshift(r);db.save();closeModal();showToast(`${r.codigo} criado com sucesso.`);state.view='solicitacoes';render(); }
function parseMoney(v){return Number(String(v||'').replace(/\./g,'').replace(',','.'))||0}
function serviceSystem(tipo){if(tipo==='Abono de Permanência')return 'Abono Computum';if(tipo==='Plano de Saúde')return 'Saúde Computum';if(tipo==='Diferenças')return 'Diferenças Computum';return '';}

function openDetail(id){ const r=db.requests.find(x=>x.id===id); if(!r)return; state.selected=id; $('#drawerRoot').innerHTML=`<div class="drawer-backdrop" id="drawerBackdrop"><aside class="drawer"><div class="drawer-head"><div><strong>${r.codigo}</strong><div class="muted" style="font-size:11px;margin-top:3px">Detalhes da solicitação</div></div><button class="close" data-drawer-close>×</button></div><div class="drawer-body"><h2 class="detail-title">${r.tipo}</h2><div class="detail-meta"><span class="status ${statusClass(r.status)}">${statusLabel[r.status]}</span><span class="status ${r.prioridade==='Urgente'?'atrasado':'novo'}">${r.prioridade}</span></div><div class="detail-grid"><div class="detail-box"><small>Advogado</small><strong>${r.advogado}</strong></div><div class="detail-box"><small>Cliente</small><strong>${r.cliente}</strong></div><div class="detail-box"><small>Processo</small><strong>${r.processo}</strong></div><div class="detail-box"><small>Prazo</small><strong>${fmtDate(r.prazo)}</strong></div><div class="detail-box"><small>Calculista</small><strong>${r.calculista||'Não atribuído'}</strong></div><div class="detail-box"><small>Valor</small><strong>${money(r.valor)}</strong></div><div class="detail-box"><small>Recebido</small><strong>${money(r.recebido)}</strong></div><div class="detail-box"><small>Sistema</small><strong>${r.sistema||'Nenhum vinculado'}</strong></div></div><div class="card" style="margin-top:16px"><div class="card-head"><h2>Solicitação</h2></div><div class="card-body"><div style="font-size:13px;line-height:1.65">${r.descricao||'Sem descrição.'}</div></div></div><div class="card" style="margin-top:16px"><div class="card-head"><h2>Google Drive</h2><button class="btn" data-drive>📁 Abrir pasta</button></div><div class="card-body"><div class="notice">A pasta privada do Google Drive será vinculada nesta etapa da integração.</div></div></div><div class="card" style="margin-top:16px"><div class="card-head"><h2>Histórico</h2></div><div class="card-body"><div class="timeline">${(r.historico||[]).map(e=>`<div class="event"><strong>${e[1]}</strong><small>${e[0]}</small></div>`).join('')}</div></div></div></div></aside></div>`; $('#drawerBackdrop').addEventListener('click',e=>{if(e.target.id==='drawerBackdrop'||e.target.matches('[data-drawer-close]'))closeDrawer();if(e.target.matches('[data-drive]'))showToast('Integração Google Drive ainda não configurada.')}); }
function closeDrawer(){ $('#drawerRoot').innerHTML=''; }

function bindView(){
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
  $$('[data-view-link]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.viewLink)));
  $$('[data-new]').forEach(b=>b.addEventListener('click',openNew));
  $$('[data-open]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.open)));
  const q=$('#q'); if(q) q.addEventListener('input',()=>{state.query=q.value;render()});
  const fs=$('#filterStatus'); if(fs)fs.addEventListener('change',()=>{state.status=fs.value;render()});
  const fa=$('#filterArea'); if(fa)fa.addEventListener('change',()=>{state.area=fa.value;render()});
  const ps=$('#processSearch'); if(ps)ps.addEventListener('input',()=>{$('#processTable').innerHTML=processTable(ps.value);$$('[data-open]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.open))) });
  const vm=$('#viewMode'); if(vm)vm.addEventListener('change',()=>{ if(vm.value==='kanban') $('#requestList').innerHTML=kanban(); else {let rows=db.requests.filter(r=>(!state.query||`${r.codigo} ${r.advogado} ${r.cliente}`.toLowerCase().includes(state.query.toLowerCase())) && (!state.status||r.status===state.status)&&(!state.area||r.area===state.area));$('#requestList').innerHTML=tableRequests(rows);$$('[data-open]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.open)));} });
  $$('[data-system]').forEach(b=>b.addEventListener('click',()=>showToast('Cadastro de sistemas será conectado ao Supabase.')));
}

function kanban(){const cols=[['NOVO','Novas'],['EM_CÁLCULO','Em cálculo'],['EM_REVISÃO','Em revisão'],['ENVIADO','Enviadas']];return `<div class="kanban">${cols.map(([s,l])=>`<div class="kanban-col"><div class="kanban-head"><span>${l}</span><span>${db.requests.filter(r=>r.status===s).length}</span></div>${db.requests.filter(r=>r.status===s).map(r=>`<div class="kanban-card" data-open="${r.id}"><strong>${r.codigo}</strong><small>${r.tipo}<br>${r.advogado}<br>Prazo: ${fmtDate(r.prazo)}</small></div>`).join('')}</div>`).join('')}</div>`}

$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));

(async function iniciarAplicacao() {
  const autenticado = await carregarSessao();

  if (!autenticado) return;

  render();
})();
