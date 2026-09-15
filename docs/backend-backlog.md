# Backlog de Backend — VendaMusica

Inventário das features de backend necessárias para suportar as telas do marketplace.
Legenda: ✅ pronto · ⚠️ parcial · 🆕 novo · 🟢 pequeno · 🟡 médio · 🔴 grande

> Estratégia: rodar tudo local em **mock** (sem custo). Partes 🔴 que dependem de
> serviço externo (Correios, gateway de pagamento real, OAuth) ficam mockadas por ora.

## Ordem de implementação (roadmap)

| # | Feature | Tamanho | Status |
|---|---------|---------|--------|
| A | Tipo de conta (role) | 🟢 | Pulado (modelo C2C; vender exige só dados bancários) |
| B | Anúncio enriquecido (marca, modelo, ano, cor, tags, aceita-troca, rascunho, views, specs) + filtros | 🟡 | **✅ Concluída** |
| C | Favoritos | 🟢 | **✅ Concluída** |
| D | Avaliações / ratings | 🟡 | **✅ Concluída** |
| E | Perfil de loja (nome fantasia, verificado, seguir, stats) | 🟡 | **✅ Concluída** |
| F | Visualizações + métricas do dashboard | 🟡 | **✅ Concluída** |
| G | Propostas / negociação no chat | 🟡 | **✅ Concluída** |
| H | Checkout single-item (endereço, frete mock, cupom, pagamento mock, preço negociado) | 🔴 | **✅ Concluída** |
| I | Reset de senha / login social | 🟡 | A fazer |

## Detalhe por domínio

### 1. Identidade & Conta
- ✅ Cadastro / login / `/me`
- 🆕 Reset de senha (tokens + email) 🟡
- 🆕 Login social Google/Facebook (OAuth) 🟡
- 🆕 Verificação de vendedor ("Loja verificada") 🟡

### 2. Anúncio enriquecido (Feature B)
- ✅ CRUD básico + upload de imagens
- 🆕 Campos: brand, model, year, color, tags, acceptsTrade, allowsPickup, zipCode,
  installments, includedItems, specifications, comparePrice (preço "de") 🟡
- 🆕 Status rascunho (draft) 🟢
- 🆕 Contador de visualizações (views) 🟡
- 🆕 Produtos relacionados 🟡

### 3. Categorias
- 🆕 Taxonomia + subcategorias + contagem por categoria 🟡

### 4. Busca avançada
- ✅ Filtros básicos + paginação
- 🆕 Full-text (título/marca/modelo/tags), filtro por marca, ordenação, facet counts,
  "mais buscados" 🟡

### 5. Favoritos (Feature C)
- 🆕 Modelo Favorite + add/remover/listar + flag isFavorited 🟢

### 6. Avaliações & Reputação (Feature D)
- 🆕 Modelo Review + agregação (nota média/total) + % positivas 🟡

### 7. Perfil de Loja (Feature E)
- 🆕 Dados da loja (nome, logo, banner, desde, tempo de resposta, políticas) 🟡
- 🆕 Seguidores (seguir/deixar de seguir) 🟢
- 🆕 Stats agregados (total de vendas, nota) 🟡

### 8. Dashboard & Analytics (Feature F)
- ⚠️ Meus anúncios / meus pedidos
- 🆕 Métricas (vendas/mês, views, mensagens pendentes, ticket médio) 🟡
- 🆕 Série temporal pra gráficos + donut de status 🟡

### 9. Notificações
- 🆕 Modelo Notification + listar + contagem não-lidas 🟢

### 10. Negociação / Propostas (Feature G)
- ✅ Chat em tempo real
- ✅ Modelo Offer (valor, status, contraproposta) + eventos socket
- ✅ Read receipts + presença online

### 10b. Chat estilo Messenger (Feature G2) — **✅ Concluída**
- ✅ Presença online (`user:online`/`user:offline`) + `users:online`
- ✅ Typing indicators (`typing:start`/`typing:stop`)
- ✅ Recibos por mensagem: entregue (`deliveredAt`) + lido (`readAt`) → ✓✓
- ✅ Paginação por cursor (infinite scroll) + `GET /conversations/unread/count`
- ✅ Mídia (imagem/áudio/arquivo) via `POST /conversations/:id/media`
- ✅ Reply (`replyToMessageId`), editar, apagar (para todos), reações (emoji)
- ✅ Busca textual na conversa
- Prompt de integração: `docs/frontend-prompts/chat-messenger.md`

### 11. Carrinho & Checkout (Feature H)
- ⚠️ Criar pedido simples (mock)
- 🆕 Carrinho, endereços, frete, cupons, métodos de pagamento, taxa de serviço,
  proteção ao comprador, status estendido 🔴

### 11b. Split de pagamento (Pagar.me) — **✅ Concluída**
- ✅ Porta `PaymentGateway` + adapters `PagarmeGateway`/`MockGateway` (troca de gateway = 1 linha)
- ✅ Split real conectado ao checkout (vendedor + plataforma somam o total)
- ✅ Comissão única via `PLATFORM_COMMISSION_RATE` (default 10%) — fim do 5% vs 10%
- ✅ Onboarding do vendedor como recebedor + status KYC (`recipientStatus`) + saldo
- ✅ Webhook ampliado: paid/failed/refunded/chargeback + `recipient.updated`
- ✅ `PAYMENTS_MODE=mock` mantém dev local sem custo
- Prompt de integração: `docs/frontend-prompts/payments-split.md`

### 12. Home / Vitrine
- 🆕 Endpoints de vitrine (destaques, lojas recomendadas, mais buscados),
  stats da plataforma, newsletter 🟢

### 13. Frete / CEP
- 🆕 Lookup de CEP (ViaCEP) + cálculo de frete 🔴
