# Gestão Computum

Sistema web de gestão operacional de solicitações de cálculos judiciais.

O Gestão Computum **não é um motor de cálculo**. Ele controla a operação da demanda: entrada, advogado, cliente, processo, área, tipo de serviço, calculista, prazo, documentos, produção, revisão, entrega, financeiro, retrabalho e histórico.

## Estado atual — V44

A V44 consolida as funcionalidades validadas até 29/09/2026 e inclui a ampliação dos Tipos de Serviço, cópia rápida do código e histórico financeiro de solicitações concluídas.

### Arquitetura

- **Frontend:** HTML, CSS e JavaScript estáticos
- **Hospedagem:** GitHub Pages
- **Repositório:** `cpds13/gestao-computum`
- **Domínio:** `https://gestao.computum.com.br`
- **Banco/Auth:** Supabase
- **Banco:** PostgreSQL
- **Autenticação:** Supabase Auth
- **Documentos:** Google Forms + Google Apps Script + Google Drive privado
- **Sistemas especializados:** aplicações independentes acessadas por vínculo/URL

### Perfis

- **Administrador:** controla o ciclo administrativo, revisão, entrega, financeiro e configurações.
- **Calculista:** trabalha nas solicitações atribuídas em **Minha produção**.
- **Administrador + Calculista:** um mesmo usuário pode exercer as duas funções.

O vínculo entre conta de acesso e cadastro de calculista é mantido por `public.calculistas.usuario_id`.

## Fluxo operacional validado

```text
NOVO
  ↓
ANÁLISE / conferência
  ↓
AGUARDANDO DOCUMENTOS (quando necessário)
  ↓
EM CÁLCULO
  ↓
EM REVISÃO
  ├── Devolver para cálculo → EM CÁLCULO
  └── Aprovar
          ↓
       ENVIADO
          ↓
Registrar entrega
          ↓
AGUARDANDO PAGAMENTO
          ↓
Recebimentos parciais ou total
          ↓
CONCLUÍDO
```

O calculista não encerra financeiramente a solicitação. O `CONCLUÍDO` é alcançado pelo fluxo financeiro administrativo.

## Funcionalidades validadas

### Solicitações

- criação e edição;
- advogado, cliente e processo;
- área e tipo de serviço;
- atribuição de calculista;
- prazo e prioridade;
- valor cobrado;
- histórico;
- exclusão administrativa com registros relacionados conforme as regras do banco.

### Tipo de Serviço

O tipo é carregado dinamicamente do Supabase de acordo com a Área.

Para `Outro`:

- aparece o campo de especificação;
- limite de 100 caracteres;
- valor armazenado em `solicitacoes.tipo_servico_outro`;
- a exibição utiliza `Outro — [especificação]`.

Na área **Tributário**, estão cadastrados:

- `Atualização`
- `Cálculo tributário`
- `Rest. acima TETO`
- `Recomposição IR`

Os cadastros existentes de áreas e tipos são preservados.

### Produção e revisão

- painel **Minha produção**;
- solicitações atribuídas ao calculista;
- `NOVO → EM CÁLCULO → EM REVISÃO`;
- devolução pelo revisor com justificativa;
- aprovação pelo administrador;
- administrador que também é calculista pode atuar nas duas funções.

### Entrega e financeiro

Após a aprovação, a solicitação pode passar de `ENVIADO` para `AGUARDANDO_PAGAMENTO`.

O financeiro suporta:

- valor do serviço;
- múltiplos recebimentos;
- recebimentos parciais;
- saldo pendente;
- conta de recebimento;
- forma de pagamento;
- recibo;
- link do recibo no Drive;
- conclusão somente quando o saldo chega a zero.

Exemplo:

```text
Valor:       R$ 5.000,00
1º pagamento R$ 3.000,00
2º pagamento R$ 1.000,00
Saldo:       R$ 1.000,00
             ↓
3º pagamento R$ 1.000,00
             ↓
Saldo:       R$ 0,00
             ↓
CONCLUÍDO
```

### Retrabalhos

O Dashboard consulta a tabela `public.retrabalhos` para apresentar a quantidade real de retrabalhos. O número não é mais fixo no frontend.

### Documentos

O fluxo atualmente utilizado é:

1. **Google Forms** para recebimento;
2. **Google Apps Script** para organização;
3. **Google Drive privado** como armazenamento;
4. **Gestão Computum** para vincular e abrir a pasta da solicitação.

Estrutura:

```text
Computum
└── Gestão
    └── CJ-2026-xxxxx
        ├── 01 - Documentos recebidos
        ├── 02 - Cálculos
        ├── 03 - Parecer
        ├── 04 - Retrabalho
        └── 05 - Financeiro
```

O `05 - Financeiro` é utilizado para documentos de recibo e outros documentos financeiros.

Não há dependência de Google Cloud ou cartão para o fluxo Forms + Apps Script adotado.

## Banco e migrations

Migrations incluídas no projeto:

- `001_initial_schema.sql` — estrutura inicial;
- `002_calculistas.sql` — cadastro operacional de calculistas;
- `003_documentos_forms_manual.sql` — origem dos documentos e vínculo com Forms;
- `004_calculistas_usuarios.sql` — vínculo calculista/usuário;
- `005_encerramento_financeiro.sql` — dados de recebimento e recibo;
- `006_tipo_servico_detalhamento.sql` — `tipo_servico_outro` e tipos Tributário.

As migrations devem ser executadas conforme o estado atual do projeto Supabase, evitando reaplicar alterações já executadas sem necessidade.

## Sistemas especializados

- `abono.computum.com.br`
- `diferencas.computum.com.br`
- `saude.computum.com.br`

O Gestão permanece separado desses sistemas. A integração inicial é por vínculo/URL.

## Documentação

- `docs/MANUAL_DO_SISTEMA.md` — manual operacional oficial;
- `docs/GESTAO_COMPUTUM_ESPECIFICACAO.md` — especificação funcional;
- `docs/GOOGLE_DRIVE_FORMS.md` — fluxo de documentos por Forms/Apps Script/Drive.

A documentação deve ser atualizada sempre que uma etapa funcional for validada.

## Segurança

Nunca colocar no frontend:

- `service_role` key;
- senhas;
- client secret do Google;
- tokens privados;
- outros segredos de backend.

O Google Drive deve permanecer privado/restrito.

## Histórico de versões

### V44
- Ampliação dos Tipos de Serviço de Servidor Público e Saúde.
- `Outro` continua com detalhamento de até 100 caracteres.
- Cópia rápida do código das solicitações pelo ícone `⧉`.
- Histórico financeiro separado de Contas a receber.

### V42
- correção do fluxo de **Tipo de Serviço**;
- `Outro` exibido por último;
- abertura do campo de especificação com limite de 100 caracteres;
- preservação dos tipos cadastrados no Supabase;
- conclusão financeira com múltiplos recebimentos validada.

### V39
- correção da relação Área → Tipo de Serviço.

### V38
- recebimentos parciais e múltiplos pagamentos.

### V37
- `ENVIADO → AGUARDANDO_PAGAMENTO`.

### V36
- Tipo de Serviço dinâmico;
- `tipo_servico_outro`;
- tipos Tributário adicionais.

### V29
- encerramento financeiro e dados de recibo.

### V24
- fluxo administrativo de revisão e devolução.

### V23
- administrador também pode atuar como calculista.

### V22
- manual interno e Minha produção.

