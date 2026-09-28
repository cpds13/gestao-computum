# Gestão Computum — Modelo de documentos: Google Forms + vinculação manual

## Status da decisão

**V9 — Forms + Apps Script + vínculo da pasta no Gestão Computum.**

A integração direta pela Google Drive API continua fora do escopo. A automação usa o Google Forms e o Google Apps Script, sem Google Cloud/OAuth no frontend. O Gestão Computum usará duas portas de entrada para documentos:

1. **Google Forms** — recebimento de arquivos enviados pelo formulário.
2. **Manual** — registro/vinculação de arquivos ou pastas que já existem no Google Drive.

As duas formas alimentam a mesma área de documentos da solicitação.

## Estrutura prevista no Drive

```text
Computum/
└── Gestão/
    └── CJ-2026-xxxxx/
        ├── 01 - Documentos recebidos/
        ├── 02 - Cálculos/
        ├── 03 - Parecer/
        └── 04 - Retrabalho/
```

A criação e a movimentação dos arquivos são feitas pelo Google Forms + Google Apps Script. O Gestão Computum mantém o vínculo da pasta para acesso direto.

## Fluxo 1 — Google Forms

Dentro da solicitação haverá uma ação **Enviar pelo Forms**.

O formulário deverá receber, no mínimo:

- Código da solicitação (`CJ-AAAA-NNNNN`);
- Tipo/categoria do documento;
- Upload de arquivo;
- Observação opcional.

O Forms será utilizado como canal de recebimento. Os arquivos enviados ficam no Google Drive associado ao formulário.

### Tipos de arquivo

O formulário deverá ser configurado para aceitar, conforme a necessidade operacional:

- PDF;
- imagens (PNG/JPG/JPEG);
- outros formatos apenas se forem necessários.

O limite de tamanho e quantidade será definido na criação do formulário.

## Fluxo 2 — Vinculação manual

Para um arquivo ou pasta que já esteja no Drive:

```text
Solicitação
  → Documentos
  → Adicionar manualmente
  → Nome
  → Categoria
  → Link do Drive
  → Salvar
```

Não será feito upload pelo navegador do Gestão nessa primeira versão.

## Lista unificada

Independentemente da origem, o Gestão deverá exibir os documentos em uma única lista:

| Documento | Categoria | Origem | Ação |
|---|---|---|---|
| CNIS.pdf | Documentos recebidos | FORM | Abrir |
| Print-INSS.png | Prints | FORM | Abrir |
| Memória.xlsx | Cálculos | MANUAL | Abrir |
| Laudo.pdf | Parecer | MANUAL | Abrir |

A origem deve ser registrada como:

- `FORM`
- `MANUAL`

## Relação com o Supabase

O Supabase continua sendo a fonte dos dados estruturados do Gestão Computum.

O banco registra referências aos documentos, não o conteúdo binário do arquivo.

Estrutura já existente:

- `pastas_drive` — referência da pasta da solicitação;
- `arquivos` — referência de cada arquivo;
- `solicitacoes.google_drive_folder_id`;
- `solicitacoes.google_drive_url`.

## Regra importante

O Gestão Computum **não deve armazenar credenciais Google, senhas ou tokens OAuth** no frontend.

Como a API automática foi retirada do escopo da V8, não haverá OAuth do Google Drive nesta etapa.

## Próxima implementação

1. Criar o Google Form oficial do Gestão Computum.
2. Configurar upload de PDF e imagens.
3. Definir a planilha de respostas do Forms.
4. Definir como o código `CJ-AAAA-NNNNN` será informado no formulário.
5. Implementar no Gestão a abertura do formulário para a solicitação.
6. Implementar o cadastro manual de pasta/arquivo.
7. Ajustar a tabela `arquivos` para registrar a origem (`FORM` ou `MANUAL`) e, se necessário, o identificador da resposta do Forms.
8. Testar o fluxo completo com uma solicitação real de teste.
