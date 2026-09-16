# Backlog de Backend — VendaMusica (modelo vitrine)

> **Virada de modelo (set/2026):** o projeto deixou de ser marketplace com
> checkout e virou **vitrine por assinatura**, no estilo do NexAtlas Sales.
> A plataforma não intermedia o pagamento do instrumento: o comprador fala
> direto com o vendedor e quem paga a plataforma é o vendedor, pelo plano.
> O código de checkout/carrinho/pedidos/split está no commit `eee83ba`.

Legenda: ✅ pronto · ⚠️ parcial · 🆕 a fazer · 🟢 pequeno · 🟡 médio · 🔴 grande

## Pronto

| Domínio | O que existe |
|---|---|
| Identidade | Cadastro/login/JWT, `accountType` (personal \| store), documento, admin |
| Anúncio | CRUD, preço opcional ("sob consulta"), vídeo, fotos por plano, specs |
| Ciclo do anúncio | draft → pending_review → active/rejected · paused · sold |
| Curadoria | Fila de aprovação, aprovar/recusar com motivo, verificar vendedor |
| Busca | Filtros + `accountType`, `verifiedOnly`; ordem: destaque > plano > critério |
| Planos | 4 planos em banco, cota de anúncios/fotos, vídeo, prioridade, trial 30d |
| Procura-se | CRUD, cruzamento automático com anúncios, resumo público, lista paga |
| Leads | Registro por canal, painel com série de 30 dias, top anúncios, conversão |
| Loja | Perfil por id e por slug, endereço/horário/site, seguir, lojas em destaque |
| Avaliação | Exige conversa prévia no chat (sem transação para comprovar) |
| Chat | Tempo real, mídia, reações, reply, propostas de preço, recibos |
| Denúncia | Aberta a visitante, fila e resolução no admin |

## Próximos passos

| # | Item | Tam. | Por quê |
|---|---|---|---|
| 1 | **Validar preço dos planos com 5-10 lojas** | — | Antes de codar cobrança. Os preços atuais são hipótese |
| 2 | Cobrança de assinatura (Asaas recorrente) | 🔴 | Recuperar `AsaasClient` do commit `eee83ba` |
| 3 | Destaque pago do anúncio (boost) | 🟡 | `isFeatured`/`featuredUntil` já existem no schema; falta compra e expiração |
| 4 | Notificação de match do Procura-se (e-mail) | 🟡 | Hoje o match é criado, mas ninguém é avisado |
| 5 | Recuperação de senha + e-mails transacionais | 🟡 | Buraco antigo, independe do modelo |
| 6 | Uploads na S3 (SDK já instalado) | 🟡 | Hoje grava em disco local |
| 7 | Categorias e marcas como tabela | 🟡 | Hoje texto livre; trava SEO e filtro por tipo |
| 8 | Busca full-text (Postgres ou Meilisearch) | 🟡 | `contains` não escala |
| 9 | Páginas de SEO por cidade/categoria | 🟡 | Principal fonte de tráfego orgânico |
| 10 | Geolocalização da loja ("perto de mim") | 🟡 | Pede lat/lng no cadastro da loja |
| 11 | Histórico de preços (a partir de `soldAt`) | 🔴 | Diferencial de longo prazo; depende de volume |
| 12 | Extrair `Store` do `User` | 🟡 | Só quando a loja precisar de mais de um usuário |

## Prompts de integração do frontend

Um por frente, em `docs/frontend-prompts/`, na ordem:

1. `01-remover-checkout.md` — tirar carrinho/checkout/pedidos, CTA de contato
2. `02-contato-e-leads.md` — botões de contato e painel de contatos
3. `03-procura-se.md` — desejo de compra e demanda
4. `04-planos-e-cotas.md` — planos, assinatura, cotas
5. `05-loja-curadoria-moderacao.md` — loja, aprovação, denúncia, admin

## Contas do seed

| Conta | E-mail | Senha |
|---|---|---|
| Loja (plano Pro) | `loja.demo@vendamusica.com` | `demo123456` |
| Pessoa física (grátis) | `vendedor.demo@vendamusica.com` | `demo123456` |
| Admin | `admin@vendamusica.com` | `demo123456` |

Banco local: `docker compose up -d` — Postgres na porta **5433** do host
(a 5432 costuma estar ocupada por outro projeto).
