# V55 — Navegação mobile

## Correção
Em telas com largura inferior a 801px, o menu lateral agora é fechado sempre que um item de navegação é tocado. Isso inclui o caso em que o usuário toca no **Dashboard** enquanto já está no Dashboard.

## Comportamento esperado
1. Abrir o menu lateral.
2. Tocar em qualquer item.
3. O menu fecha imediatamente.
4. Se a tela for diferente, a navegação ocorre normalmente.
5. Se a tela for a mesma, a tela permanece aberta e o menu continua fechado.

## Escopo
A alteração não modifica permissões, autenticação, Supabase, Edge Functions ou fluxo operacional. Não há nova migration.
