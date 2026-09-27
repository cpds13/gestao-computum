# Gestão Computum — Especificação Completa do Projeto

## 1. Visão geral

O **Gestão Computum** será um sistema web para controle operacional de solicitações de cálculos judiciais feitas por advogados.

O sistema não será um motor de cálculo. Sua finalidade será controlar a operação completa:

- entrada da solicitação;
- advogado e cliente;
- processo;
- tipo de serviço;
- documentos recebidos;
- responsável pelo cálculo;
- revisão;
- prazo;
- envio;
- cobrança;
- pagamentos;
- retrabalhos;
- impugnações;
- histórico;
- origem do cliente;
- vínculo com sistemas especializados;
- organização dos documentos no Google Drive.

### URL planejada

`https://gestao.computum.com.br`

O sistema fará parte do ecossistema Computum, mas será independente dos sistemas especializados de cálculo.

---

# 2. Ecossistema Computum

Foi definido que o Gestão não incorporará o ContadJus.

O ContadJus é um sistema separado.

Também existem ou poderão existir aplicações especializadas em subdomínios diferentes:

- `abono.computum.com.br`
- `diferencas.computum.com.br`
- `saude.computum.com.br`
- outros sistemas futuros.

O Gestão será a aplicação administrativa/operacional que controla os trabalhos.

### Conceito

**Gestão Computum**
- controla o trabalho;
- controla clientes;
- controla advogados;
- controla processos;
- controla prazos;
- controla financeiro;
- controla retrabalho;
- controla documentos.

**Sistemas especializados**
- executam cálculos ou atividades específicas.

Exemplo:

```text
Gestão
  ↓
Solicitação: Abono de Permanência
  ↓
Sistema vinculado: Abono Computum
  ↓
Abrir sistema especializado
```

Inicialmente, a integração entre sistemas será apenas por URL/vínculo. Uma integração automática poderá ser desenvolvida posteriormente.

---

# 3. Arquitetura tecnológica definida

## Frontend

**GitHub Pages**

O aplicativo será uma aplicação web estática, inicialmente baseada em HTML/CSS/JavaScript.

O GitHub Pages hospedará a interface.

## Backend / banco

**Supabase**

Será usado para:

- PostgreSQL;
- autenticação;
- API;
- regras de acesso;
- Row Level Security;
- dados estruturados;
- histórico;
- usuários;
- solicitações;
- financeiro;
- retrabalho.

O projeto poderá começar no plano gratuito.

## Documentos

**Google Drive privado**

O Google Drive será o repositório dos documentos dos processos:

- PDFs;
- imagens;
- sentenças;
- acórdãos;
- decisões;
- planilhas;
- cálculos;
- pareceres;
- documentos recebidos.

Não será necessário tornar as pastas públicas.

A ideia é autorizar o sistema a acessar uma área privada do Drive por meio da conta do usuário.

## Domínio

O domínio principal é:

`computum.com.br`

O Gestão deverá funcionar como:

`gestao.computum.com.br`

A infraestrutura conceitual:

```text
gestao.computum.com.br
        ↓
   GitHub Pages
        ↓
     Supabase
        ↓
Google Drive privado
```

---

# 4. Princípio importante: banco ≠ documentos

Foi decidido que o Supabase não será utilizado como depósito principal dos documentos.

O banco guardará informações estruturadas e referências aos arquivos.

Exemplo:

```text
Solicitação CJ-2026-00157
    |
    ├── Advogado
    ├── Cliente
    ├── Processo
    ├── Serviço
    ├── Status
    ├── Valor
    ├── Calculista
    └── Google Drive
             |
             ├── sentença.pdf
             ├── acórdão.pdf
             ├── calculo.xlsx
             └── parecer.pdf
```

Vantagens:

- os documentos permanecem sob controle do proprietário;
- não é necessário migrar o acervo existente;
- o Google Drive continua sendo o arquivo principal;
- o banco fica pequeno;
- é possível vincular pastas já existentes;
- o sistema pode criar novas pastas quando necessário.

---

# 5. Google Drive

O sistema deverá trabalhar com pastas privadas.

Não é necessário tornar o Drive público.

A ideia é permitir:

### Criar pasta

Ao criar uma solicitação:

> Criar pasta no Google Drive

Estrutura sugerida:

```text
Computum
└── Gestão
    └── CJ-2026-00157
        ├── 01 - Documentos recebidos
        ├── 02 - Cálculos
        ├── 03 - Parecer
        └── 04 - Retrabalho
```

A estrutura poderá ser ajustada posteriormente.

### Vincular pasta existente

Também será possível:

> Vincular pasta existente

Isso é importante porque já existe um acervo de documentos.

O usuário poderá selecionar uma pasta que já existe no Drive e vinculá-la à solicitação, sem mover arquivos.

---

# 6. Objetivo operacional

O sistema deverá acompanhar a demanda desde a chegada do pedido até a conclusão financeira.

Fluxo principal:

```text
NOVO
  ↓
ANÁLISE
  ↓
AGUARDANDO DOCUMENTOS
  ↓
EM CÁLCULO
  ↓
EM REVISÃO
  ↓
ENVIADO
  ↓
AGUARDANDO PAGAMENTO
  ↓
CONCLUÍDO
```

Fluxos alternativos:

```text
ENTREGUE
  ↓
IMPUGNAÇÃO
  ↓
RETRABALHO
  ↓
NOVA ENTREGA
```

Também haverá:

- pausado;
- cancelado;
- aguardando informação;
- outros estados configuráveis.

---

# 7. Cadastro de solicitação

A solicitação será o objeto central do sistema.

## Dados do advogado

- nome;
- OAB;
- UF da OAB;
- escritório;
- telefone;
- WhatsApp;
- e-mail;
- origem;
- observações.

## Dados do cliente

- nome;
- CPF;
- e-mail;
- telefone;
- observações.

## Dados do processo

- número do processo;
- tribunal;
- vara;
- comarca;
- cliente;
- observações.

O processo poderá ser opcional, pois pode existir:

- orçamento;
- consulta;
- análise preliminar;
- trabalho extrajudicial;
- solicitação ainda sem número.

---

# 8. Origem do advogado/cliente

O sistema deverá registrar de onde veio a oportunidade.

Opções inicialmente previstas:

- Instagram;
- site;
- WhatsApp;
- indicação;
- cliente antigo;
- LinkedIn;
- outro.

Isso permitirá relatórios como:

- solicitações por origem;
- faturamento por origem;
- quantidade de novos clientes;
- recorrência.

---

# 9. Classificação dos serviços

Foi decidido não usar um único campo genérico para o tipo de cálculo.

Haverá uma hierarquia:

```text
ÁREA
  ↓
TIPO DE SERVIÇO
```

## Áreas iniciais

- Previdenciário;
- Trabalhista;
- Servidor Público;
- Cível;
- Tributário;
- Consumidor;
- Saúde;
- Outro.

## Exemplos de serviços

### Previdenciário
- liquidação;
- revisão de RMI;
- atualização;
- LOAS;
- outros.

### Servidor Público
- abono de permanência;
- verbas remuneratórias;
- 13º;
- férias;
- outros.

### Cível
- dano material;
- dano moral;
- liquidação;
- atualização;
- outros.

### Saúde
- plano de saúde;
- outros.

A estrutura será configurável.

---

# 10. Sistemas especializados

Foi decidido criar uma tabela de sistemas especializados.

Exemplos:

```text
Abono Computum
https://abono.computum.com.br

Diferenças Computum
https://diferencas.computum.com.br

Saúde Computum
https://saude.computum.com.br
```

O sistema especializado será vinculado ao tipo de serviço.

Exemplo:

```text
Área:
Servidor Público

Tipo:
Abono de Permanência

Sistema especializado:
Abono Computum

[Abrir sistema ↗]
```

Assim, ao escolher o tipo de serviço, o sistema poderá mostrar automaticamente o sistema correspondente.

A integração automática entre sistemas fica como possibilidade futura.

---

# 11. Cadastro de sistemas especializados

Tabela conceitual:

```text
sistemas_especializados
```

Campos:

- id;
- nome;
- URL;
- área;
- descrição;
- ativo;
- ícone opcional;
- ordem.

O vínculo com os tipos de serviço poderá ser feito por relacionamento.

---

# 12. Solicitação: conteúdo

A solicitação terá:

- descrição;
- texto enviado pelo advogado;
- prazo;
- prioridade;
- observações.

Prioridades:

- normal;
- alta;
- urgente.

O cadastro deverá ser rápido.

A ideia é que o usuário consiga registrar uma demanda com poucas informações e complementá-la depois.

Exemplo:

```text
Advogado: João
Processo: 000123...
Tipo: Liquidação
Prazo: 30/09
Valor: R$ 800
Arquivo: sentença.pdf
```

Depois os demais campos podem ser preenchidos.

O sistema deve reduzir trabalho administrativo, não aumentar.

---

# 13. Arquivos

A solicitação poderá receber:

- PDF;
- JPG;
- PNG;
- DOCX;
- XLSX;
- outros.

Categorias:

- documento recebido;
- sentença;
- acórdão;
- decisão;
- planilha;
- cálculo;
- parecer;
- imagem;
- outros.

Os arquivos físicos ficarão no Google Drive.

---

# 14. Controle do cálculo

O Gestão não realizará o cálculo.

Ele registrará o trabalho.

Campos:

- sistema utilizado;
- calculista;
- revisor;
- data de início;
- data de conclusão;
- data de envio;
- tipo de entrega.

Tipos de entrega:

- cálculo;
- cálculo + parecer;
- apenas parecer;
- conferência;
- outro.

Também será possível abrir o sistema especializado associado.

---

# 15. Financeiro

O sistema terá controle financeiro completo.

## Na solicitação

- valor cobrado;
- desconto;
- valor final;
- condição de pagamento.

Exemplo:

```text
Valor: R$ 1.000,00
Desconto: R$ 100,00
Total: R$ 900,00
```

## Pagamentos

Não será utilizado apenas um campo "pago".

Uma solicitação poderá ter vários pagamentos.

Exemplo:

```text
Serviço: R$ 1.500

Pagamento 1: R$ 500
Pagamento 2: R$ 500
Pagamento 3: R$ 500
```

O sistema calcula:

- total cobrado;
- total recebido;
- saldo;
- situação financeira.

Formas de pagamento:

- PIX;
- transferência;
- dinheiro;
- cartão;
- outro.

---

# 16. Retrabalho

Retrabalho será tratado como entidade própria.

Motivos:

- impugnação;
- esclarecimento;
- erro identificado;
- novo documento;
- alteração da sentença;
- atualização;
- solicitação do advogado;
- outro.

Campos:

- solicitação original;
- tipo;
- motivo;
- descrição;
- responsável;
- data de solicitação;
- data de início;
- data de conclusão;
- data de envio;
- cobrado;
- valor cobrado;
- valor final;
- status;
- observações.

Exemplo:

```text
Cálculo original: R$ 800

Retrabalho 1:
Impugnação
Não cobrado

Retrabalho 2:
Atualização
R$ 200
```

O sistema poderá calcular:

- faturamento original;
- faturamento de retrabalhos;
- retrabalho não cobrado;
- quantidade de retrabalhos;
- motivos mais frequentes.

---

# 17. Histórico

Será mantido um histórico de eventos.

Tabela:

```text
historico_solicitacao
```

Exemplo:

```text
26/09 09:15
Solicitação criada

26/09 09:18
Documento sentença.pdf anexado

26/09 09:30
Patrick atribuído

27/09 08:12
Cálculo iniciado

28/09 16:40
Cálculo concluído

28/09 17:05
Enviado ao advogado

03/10 10:15
Pagamento recebido
```

O histórico deve registrar:

- usuário;
- tipo de evento;
- descrição;
- data e hora.

---

# 18. Banco de dados proposto

## usuarios

```text
id
nome
email
perfil
ativo
created_at
```

Perfis iniciais:

- administrador;
- calculista;
- revisor;
- administrativo.

A autenticação será feita pelo Supabase Auth.

---

## advogados

```text
id
nome
oab
uf_oab
escritorio
telefone
whatsapp
email
origem
observacoes
ativo
created_at
updated_at
```

---

## clientes

```text
id
nome
cpf
email
telefone
observacoes
created_at
updated_at
```

---

## processos

```text
id
numero_processo
tribunal
vara
comarca
cliente_id
observacoes
created_at
updated_at
```

---

## areas_servico

```text
id
nome
ativo
ordem
```

---

## tipos_servico

```text
id
area_id
nome
ativo
ordem
```

---

## sistemas_especializados

```text
id
nome
url
area_id
descricao
ativo
ordem
```

O relacionamento entre sistemas e serviços poderá ser expandido posteriormente se um sistema atender vários serviços.

---

## solicitacoes

```text
id
codigo

advogado_id
cliente_id
processo_id

area_id
tipo_servico_id

descricao
prazo
status
prioridade

calculista_id
revisor_id

tipo_entrega

data_solicitacao
data_inicio
data_conclusao
data_envio

valor_cobrado
desconto
valor_final

origem
cliente_antigo

google_drive_folder_id
google_drive_url

observacoes

created_by
created_at
updated_at
```

Código sugerido:

`CJ-2026-000157`

---

## arquivos

```text
id
solicitacao_id
retrabalho_id
nome
categoria
mime_type
tamanho
google_drive_file_id
google_drive_url
uploaded_by
created_at
```

---

## pastas_drive

```text
id
solicitacao_id
google_drive_folder_id
google_drive_url
nome_pasta
created_at
```

---

## retrabalhos

```text
id
solicitacao_id

tipo
motivo
descricao

responsavel_id

data_solicitacao
data_inicio
data_conclusao
data_envio

cobrado
valor_cobrado
valor_final

status

observacoes

created_at
updated_at
```

---

## pagamentos

```text
id
solicitacao_id
retrabalho_id

data_pagamento
valor
forma_pagamento

observacao
created_by
created_at
```

---

## historico_solicitacao

```text
id
solicitacao_id
usuario_id
tipo_evento
descricao
data_hora
```

---

# 19. Por que não criar uma tabela financeira genérica

Foi decidido não criar uma tabela chamada simplesmente `financeiro`.

O financeiro será construído a partir de:

```text
SOLICITAÇÕES
+
PAGAMENTOS
+
RETRABALHOS
```

Isso permite diferentes visões:

### Faturamento
Quanto foi contratado.

### Recebimento
Quanto efetivamente entrou.

### A receber
Quanto ainda falta.

### Retrabalho
Quanto foi produzido sem cobrança.

Evita duplicação de informação.

---

# 20. Segurança

Como o sistema poderá conter dados de processos e dados pessoais, a arquitetura deverá utilizar **Row Level Security (RLS)** no Supabase.

Acesso inicial:

- administrador;
- posteriormente outros usuários.

Cada perfil deverá ter permissões adequadas.

O sistema não deverá depender de informações expostas publicamente.

---

# 21. Telas planejadas

## Dashboard

Indicadores:

- solicitações abertas;
- a receber;
- recebido no mês;
- retrabalhos;
- atrasados;
- prazos próximos;
- aguardando documentos.

Também terá lista de solicitações recentes.

---

## Solicitações

Filtros:

- pesquisa;
- status;
- área;
- tipo;
- advogado;
- calculista;
- período;
- origem;
- pago/não pago.

Visualizações:

- lista;
- tabela;
- Kanban.

Status sugeridos para Kanban:

```text
NOVO
EM CÁLCULO
EM REVISÃO
ENVIADO
```

---

## Nova solicitação

Blocos:

1. Solicitante
2. Cliente
3. Processo
4. Serviço
5. Solicitação
6. Documentos
7. Valores
8. Responsáveis

A tela deverá ser especialmente boa no celular.

---

## Detalhes da solicitação

Cabeçalho:

- código;
- serviço;
- status;
- advogado;
- cliente;
- processo.

Abas:

- Resumo;
- Documentos;
- Cálculo;
- Financeiro;
- Retrabalhos;
- Histórico.

---

## Advogados

Mostrar:

- quantidade de solicitações;
- faturamento;
- recebido;
- a receber;
- última solicitação;
- histórico.

---

## Clientes

Mostrar:

- processos;
- solicitações;
- valores;
- histórico.

---

## Processos

Busca pelo número do processo.

Ao abrir:

- cliente;
- advogado;
- solicitações;
- retrabalhos;
- documentos.

---

## Calculistas

Controle operacional:

- trabalhos atribuídos;
- em andamento;
- concluídos;
- atrasados;
- retrabalhos.

Não será usado como ranking de desempenho.

---

## Financeiro

Indicadores:

- faturamento;
- recebimentos;
- a receber;
- atrasados.

Listas:

- contas a receber;
- recebimentos;
- pagamentos.

---

## Relatórios

Produção:

- por período;
- por calculista;
- por área;
- por serviço.

Financeiro:

- faturamento;
- recebimento;
- inadimplência;
- ticket médio.

Origem:

- Instagram;
- site;
- indicação;
- cliente antigo;
- outros.

Retrabalho:

- quantidade;
- motivos;
- cobrado;
- não cobrado.

---

## Configurações

Cadastros:

- áreas;
- tipos de serviço;
- sistemas especializados;
- usuários;
- status;
- formas de pagamento;
- integração Google Drive.

---

# 22. Dashboard conceitual

Exemplo:

```text
┌──────────────┐ ┌──────────────┐
│ 12           │ │ R$ 8.450     │
│ Em aberto    │ │ A receber    │
└──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ R$ 14.200    │ │ 5            │
│ Recebido     │ │ Retrabalhos  │
└──────────────┘ └──────────────┘
```

Área de atenção:

- cálculos atrasados;
- prazos próximos;
- documentos pendentes;
- retrabalhos.

---

# 23. Identidade visual

Foram fornecidos dois projetos existentes para servir de base:

1. `calculojus.app.br`
2. `saude.computum.com.br`

Foi decidido criar um **Computum Design System v1**.

Não será uma cópia integral de nenhum projeto.

Será uma combinação da identidade institucional do CálculoJus com os componentes de aplicação do Saúde Computum.

---

# 24. Identidade visual do CálculoJus

Elementos identificados no projeto:

### Cores

- Azul-marinho: `#172B46`
- Terracota: `#A85F43`
- Creme: `#F3E9DC`
- Cinza: `#6F747A`
- Linhas: `#DEDBD6`
- Fundo suave: `#F8F5F1`

### Tipografia

- títulos: Georgia;
- texto: Arial.

### Características

- estética editorial/jurídica;
- bastante espaço em branco;
- bordas discretas;
- cantos pouco arredondados;
- hierarquia visual clara;
- detalhe vertical terracota na identidade.

---

# 25. Identidade visual do Saúde Computum

Elementos identificados:

### Cores

- fundo: `#F4F7F9`
- branco para cards;
- azul petróleo: `#0C5967`
- azul secundário: `#087F91`
- bordas: `#D8E2E6`

### Tipografia

- `system-ui`.

### Componentes

- cards;
- tabelas;
- abas;
- KPIs;
- formulários;
- alertas;
- estados;
- bordas arredondadas.

Essa estrutura é particularmente adequada ao Gestão.

---

# 26. Computum Design System v1

Componentes que deverão ser padronizados:

1. Cores;
2. Fontes;
3. Botões;
4. Inputs;
5. Selects;
6. Cards;
7. Tabelas;
8. Badges;
9. Status;
10. Alertas;
11. Modais;
12. Menu lateral;
13. Dashboard;
14. Responsividade;
15. Ícones;
16. Espaçamentos;
17. Bordas;
18. Sombras.

Objetivo:

```text
Design System Computum
        |
        ├── Gestão
        ├── Abono
        ├── Diferenças
        ├── Saúde
        └── futuros sistemas
```

Cada sistema pode ter finalidade diferente, mas todos deverão parecer parte da mesma família.

---

# 27. Responsividade

O sistema será desenvolvido com foco em:

- computador;
- tablet;
- celular.

O cadastro de solicitação deverá funcionar muito bem no celular.

A interface desktop poderá utilizar menu lateral.

No celular:

- menu compacto;
- navegação adaptada;
- cards empilhados;
- tabelas adaptadas;
- ações principais acessíveis.

---

# 28. Filosofia de UX

O sistema não deve parecer um ERP pesado.

A experiência deve ser:

- limpa;
- profissional;
- objetiva;
- rápida;
- adequada a trabalho jurídico;
- com poucas ações para registrar uma demanda;
- detalhada quando o usuário quiser aprofundar.

A ação principal deverá estar sempre acessível:

> **+ Nova solicitação**

---

# 29. Fluxo completo

Fluxo principal:

```text
ADVOGADO ENVIA PEDIDO
        ↓
NOVA SOLICITAÇÃO
        ↓
CADASTRO RÁPIDO
        ↓
DOCUMENTOS
        ↓
CLASSIFICAÇÃO
        ↓
SISTEMA ESPECIALIZADO
        ↓
ATRIBUIÇÃO
        ↓
CÁLCULO
        ↓
REVISÃO
        ↓
ENTREGA
        ↓
PAGAMENTO
        ↓
CONCLUÍDO
```

Fluxo de retrabalho:

```text
ENTREGUE
   ↓
IMPUGNAÇÃO
   ↓
RETRABALHO
   ↓
NOVA ENTREGA
```

---

# 30. Métricas futuras

O banco foi pensado para permitir:

### Produção

- cálculos concluídos;
- cálculos por período;
- cálculos por área;
- cálculos por serviço;
- cálculos por responsável.

### Financeiro

- faturamento;
- recebimento;
- saldo;
- inadimplência;
- ticket médio.

### Clientes

- novos advogados;
- clientes recorrentes;
- origem das demandas;
- faturamento por advogado.

### Retrabalho

- quantidade;
- motivo;
- custo operacional;
- cobrado;
- não cobrado.

### Operação

- tempo entre solicitação e início;
- tempo de execução;
- prazo;
- atraso;
- volume por responsável.

---

# 31. Evolução futura

O sistema poderá posteriormente receber:

- notificações;
- alertas de prazo;
- modelos de mensagens;
- geração de recibos;
- relatórios PDF;
- integração mais profunda com Google Drive;
- integração entre Gestão e sistemas especializados;
- preenchimento automático de dados;
- leitura de PDFs;
- classificação automática;
- automações;
- portal para advogados.

Essas funcionalidades não fazem parte da primeira versão obrigatoriamente.

A arquitetura deverá apenas evitar impedir sua implementação futura.

---

# 32. Escopo da primeira versão

A primeira versão funcional deverá priorizar:

### Autenticação
- login;
- usuários;
- perfis.

### Cadastros
- advogados;
- clientes;
- processos;
- áreas;
- tipos de serviço;
- sistemas especializados.

### Operação
- nova solicitação;
- listagem;
- filtros;
- status;
- atribuição;
- prazo;
- detalhes.

### Documentos
- integração com Google Drive;
- criação/vinculação de pasta;
- referência aos arquivos.

### Financeiro
- valor;
- pagamentos;
- saldo;
- status financeiro.

### Retrabalho
- criação;
- cobrança;
- responsável;
- status.

### Histórico
- eventos e alterações.

### Dashboard
- indicadores básicos;
- pendências;
- solicitações recentes.

---

# 33. Fora do escopo inicial

Não faz parte da primeira versão:

- cálculo matemático;
- ContadJus;
- motor previdenciário;
- motor trabalhista;
- motor de saúde;
- motor de abono;
- armazenamento principal de documentos no Supabase;
- portal completo para advogados;
- automação avançada entre todos os sistemas.

Esses sistemas continuam independentes.

---

# 34. Princípio arquitetural final

O Gestão Computum será o **centro administrativo da operação**, não o centro matemático de todos os cálculos.

```text
                 GESTÃO COMPUTUM
                       |
       ┌───────────────┼────────────────┐
       |               |                |
   Operação        Financeiro       Documentos
       |                                |
       |                            Google Drive
       |
       ├── Abono Computum
       ├── Diferenças Computum
       ├── Saúde Computum
       └── outros sistemas
```

Isso permite crescer o ecossistema sem transformar o Gestão em um sistema monolítico.

---

# 35. Próxima etapa

Após esta especificação, a sequência recomendada é:

### Etapa 1 — Design System
Formalizar CSS, cores, fontes, componentes e responsividade.

### Etapa 2 — Banco Supabase
Criar tabelas, relacionamentos, índices, constraints e RLS.

### Etapa 3 — Autenticação
Login e perfis.

### Etapa 4 — Dashboard
Primeira tela visual.

### Etapa 5 — Solicitações
Cadastro, listagem, filtros e detalhes.

### Etapa 6 — Google Drive
Autorização, criação/vinculação de pastas e arquivos.

### Etapa 7 — Financeiro
Cobrança e pagamentos.

### Etapa 8 — Retrabalho
Controle completo.

### Etapa 9 — Relatórios
Indicadores e gráficos.

### Etapa 10 — Integrações
Vínculo e, futuramente, integração com os sistemas especializados.

---

# 36. Decisões já tomadas

As seguintes decisões são consideradas definidas:

- [x] Nome: Gestão Computum
- [x] Subdomínio: `gestao.computum.com.br`
- [x] GitHub Pages como frontend/hospedagem
- [x] Supabase como banco/backend
- [x] Google Drive privado para documentos
- [x] Não tornar pastas do Drive públicas
- [x] Possibilidade de vincular pastas existentes
- [x] ContadJus não será incorporado
- [x] Sistemas especializados permanecem independentes
- [x] URL dos sistemas especializados será cadastrável
- [x] Tipos de serviço poderão apontar para sistemas especializados
- [x] Financeiro será baseado em serviços + pagamentos + retrabalhos
- [x] Pagamentos múltiplos serão permitidos
- [x] Retrabalho será entidade própria
- [x] Histórico será registrado
- [x] Usuários terão perfis
- [x] RLS será considerado desde o início
- [x] Interface será responsiva
- [x] CálculoJus e Saúde Computum serão referências para o Design System
- [x] Gestão não será um motor de cálculo
- [x] Primeira versão priorizará operação e controle

---

# 37. Resumo executivo

O **Gestão Computum** será uma plataforma web privada para administrar a operação de cálculos judiciais.

O advogado solicita um trabalho. O usuário registra a demanda, classifica o serviço, vincula advogado, cliente e processo, recebe documentos pelo Google Drive, atribui o responsável, acompanha o prazo, registra a execução, entrega o resultado, controla cobrança e pagamento e registra eventuais retrabalhos ou impugnações.

O sistema será independente dos motores de cálculo e poderá apontar para aplicações especializadas como:

- Abono Computum;
- Diferenças Computum;
- Saúde Computum;
- futuros sistemas.

A arquitetura será:

```text
GitHub Pages
      ↓
gestao.computum.com.br
      ↓
Supabase
      ↓
Google Drive privado
```

O projeto será construído dentro de uma identidade visual comum aos produtos Computum, tomando como referências os projetos existentes do CálculoJus e do Saúde Computum.

O objetivo final é que o Gestão seja o **painel central da operação de cálculos judiciais**, mantendo separados os sistemas responsáveis pelos cálculos propriamente ditos.
