# Gestão Computum

Primeira versão do frontend do sistema de gestão de solicitações de cálculos judiciais.

## Arquitetura planejada

- Frontend: GitHub Pages
- Domínio: `gestao.computum.com.br`
- Banco/Auth: Supabase
- Documentos: Google Drive privado
- Sistemas especializados: URLs configuráveis, como Abono, Diferenças e Saúde Computum

## Estado atual

Esta entrega é um **protótipo funcional de frontend**, com dados de demonstração persistidos no `localStorage` do navegador.

Funcionalidades já demonstradas:

- Dashboard
- Solicitações
- Filtros
- Nova solicitação
- Cadastro rápido
- Visualização em tabela
- Visualização Kanban
- Detalhes da solicitação
- Advogados
- Clientes
- Processos
- Calculistas
- Financeiro
- Relatórios
- Configurações
- Vínculo conceitual com sistemas especializados
- Estrutura conceitual para Google Drive

## Próxima etapa

Substituir o `localStorage` por Supabase e implementar:

1. Supabase Auth
2. PostgreSQL com RLS
3. CRUD real
4. Google Drive OAuth
5. Upload e vinculação de arquivos
6. Histórico real
7. Financeiro real
8. Retrabalhos
9. Permissões por perfil
10. Deploy no GitHub Pages + domínio personalizado

## Importante

Não colocar chaves privadas no frontend. No GitHub Pages, somente a chave pública/anon do Supabase poderá aparecer no código, sempre protegida pelas políticas RLS. Credenciais OAuth e segredos deverão permanecer em backend/Edge Functions ou configuração segura apropriada.
