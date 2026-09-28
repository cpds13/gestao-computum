# Gestão Computum

Sistema web de gestão operacional de solicitações de cálculos judiciais.

O Gestão Computum **não é um motor de cálculo**. Ele controla a operação da demanda: entrada, advogado, cliente, processo, serviço, calculista, prazo, documentos, andamento, financeiro, retrabalho e histórico.

## Arquitetura atual

- **Frontend:** HTML, CSS e JavaScript estáticos
- **Hospedagem:** GitHub Pages
- **Repositório:** `cpds13/gestao-computum`
- **Domínio:** `https://gestao.computum.com.br`
- **Banco/Auth:** Supabase
- **Banco:** PostgreSQL
- **Autenticação:** Supabase Auth
- **Documentos:** Google Drive privado — integração ainda pendente
- **Sistemas especializados:** links configuráveis para aplicações Computum independentes

## Estado da V6 — baseline funcional

A V6 consolida o que foi implementado e testado até 27/09/2026.

### Autenticação

- Login por Supabase Auth.
- Perfil administrativo carregado de `public.usuarios`.
- Usuário administrativo atual: `gestao@computum.com.br`.
- O registro em `public.usuarios` utiliza o mesmo UUID do usuário em `auth.users`.
- A senha permanece exclusivamente no Supabase Auth; não existe senha no frontend.

### Banco e segurança

O banco utiliza PostgreSQL/Supabase com RLS habilitado nas tabelas operacionais.

O acesso da aplicação ocorre como usuário autenticado (`authenticated`).

### Solicitações

A criação de uma solicitação já é persistida no Supabase.

O fluxo atual:

```text
Formulário
   ↓
Localiza/cria advogado
   ↓
Localiza/cria cliente
   ↓
Localiza/cria processo (quando informado)
   ↓
Localiza área
   ↓
Localiza/cria tipo de serviço
   ↓
Localiza calculista
   ↓
Gera código CJ-AAAA-NNNNN
   ↓
Insere em public.solicitacoes
   ↓
Registra evento em public.historico_solicitacao
   ↓
Recarrega dados do Supabase
```

### Código das solicitações

O padrão adotado é:

```text
CJ-2026-00001
CJ-2026-00002
CJ-2026-00003
...
```

### Calculistas

Calculistas são pessoas que executam os cálculos, mas **não são usuários de login do sistema**.

Eles ficam na tabela `public.calculistas`.

Cadastro atual:

- Patrick
- Ana Clara
- Ericka

O campo de calculista do formulário é carregado do Supabase e grava `solicitacoes.calculista_id` apontando para `public.calculistas`.

### Testes realizados

Foram realizados testes reais contra o Supabase:

- Login administrativo: **OK**
- Carregamento do perfil administrativo: **OK após criação do registro em `public.usuarios`**
- Criação de solicitação: **OK**
- Geração de código: **OK**
- Criação rápida de advogado: **OK**
- Criação rápida de cliente: **OK**
- Criação de processo: suportada pelo fluxo
- Registro de histórico: implementado
- Cadastro de calculistas: **OK**
- Vinculação de Patrick à solicitação: **OK**

Solicitações de teste existentes no banco no momento da V6:

- `CJ-2026-00001` — criada antes da tabela própria de calculistas; aparece sem calculista atribuído.
- `CJ-2026-00002` — criada com **Patrick** atribuído corretamente.

Esses registros são dados de teste e poderão ser removidos posteriormente.

## Estrutura principal do banco

- `usuarios`
- `advogados`
- `clientes`
- `processos`
- `areas_servico`
- `tipos_servico`
- `sistemas_especializados`
- `calculistas`
- `solicitacoes`
- `pastas_drive`
- `arquivos`
- `retrabalhos`
- `pagamentos`
- `historico_solicitacao`

## Google Drive — próxima etapa

A integração com Google Drive ainda **não está implementada**.

A arquitetura prevista é:

```text
Computum
└── Gestão
    └── CJ-2026-00001
        ├── 01 - Documentos recebidos
        ├── 02 - Cálculos
        ├── 03 - Parecer
        └── 04 - Retrabalho
```

O banco deverá armazenar referências às pastas e arquivos, enquanto os documentos permanecerão no Drive privado.

A autenticação do Google deverá ser implementada sem colocar credenciais privadas ou segredos no frontend.

## Sistemas especializados

O Gestão permanece separado dos sistemas especializados, como:

- `abono.computum.com.br`
- `diferencas.computum.com.br`
- `saude.computum.com.br`

A integração inicial será por vínculo/URL. Integrações automáticas poderão ser desenvolvidas posteriormente.

## Próximas versões planejadas

### V7 — Google Drive

- autenticação Google;
- criação de pasta da solicitação;
- subpastas padronizadas;
- upload do documento inicial;
- registro em `arquivos`;
- registro em `pastas_drive`;
- abertura da pasta pelo detalhe da solicitação.

### V8 — Painel completo da solicitação

- documentos;
- andamento;
- histórico;
- dados financeiros;
- ações da demanda;
- links para sistemas especializados.

### V9 — Workflow

- alteração de status;
- atribuição/reatribuição de calculista;
- revisão;
- prazos;
- histórico automático das alterações.

### V10 — Financeiro

- pagamentos parciais;
- saldo;
- forma de pagamento;
- comprovantes;
- situação financeira.

### V11 — Retrabalho e impugnação

- abertura de retrabalho;
- motivo;
- responsável;
- prazo;
- cobrança;
- histórico.

### V12 — Relatórios

- produção;
- prazos;
- produtividade;
- origem;
- faturamento;
- recebimentos;
- retrabalhos.

## Segurança

Nunca colocar no frontend:

- `service_role` key;
- senha de usuário;
- client secret do Google;
- tokens privados;
- qualquer segredo de backend.

A chave pública do Supabase pode ser utilizada no navegador, desde que o banco esteja protegido por RLS e as políticas sejam configuradas adequadamente.

## V8 — documentos: Google Forms + manual

A V8 define o modelo de documentos sem integração automática com a Google Drive API.

- **Google Forms:** canal de recebimento de PDFs e imagens.
- **Manual:** vinculação de arquivos/pastas já existentes no Drive.
- **Supabase:** registra referências, categoria, origem e histórico.
- **Google Drive:** continua sendo o armazenamento privado dos documentos.

Detalhamento: `docs/GOOGLE_DRIVE_FORMS.md`.

A migration `003_documentos_forms_manual.sql` documenta a alteração prevista no banco, mas **não deve ser executada ainda**; os campos finais serão validados após a criação do formulário.


## V9 — Google Forms + Apps Script

O recebimento de documentos utiliza o Google Forms e um Apps Script vinculado à planilha de respostas. Os arquivos são organizados automaticamente em `Computum/Gestão/CJ-2026-xxxxx/01 - Documentos recebidos`, com subpastas padrão para Cálculos, Parecer e Retrabalho. O frontend possui ação para abrir o Forms e vincular a pasta privada do Drive à solicitação. Não há dependência de Google Cloud ou cartão.
