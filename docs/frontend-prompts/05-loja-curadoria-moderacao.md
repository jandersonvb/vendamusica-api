# Prompt 5 — Perfil de loja, curadoria do anúncio e moderação

> Cole no chat do projeto **frontend** (`vendamusica-web`). Faça os Prompts 1 a 4 antes.

---

Base URL: `${API_URL}/api`. Três frentes: (A) a conta de loja, (B) o novo ciclo
de vida do anúncio com aprovação, (C) denúncia e telas de administrador.

## A) Conta de loja

O cadastro (`POST /auth/register`) aceita agora:
```jsonc
{ "email": "...", "name": "...", "password": "...",
  "accountType": "store",              // "personal" (padrão) | "store"
  "storeName": "Casa do Músico BH",
  "whatsapp": "5531999998888" }        // só dígitos, com DDI+DDD
```

Coloque a escolha **pessoa física / loja** no cadastro (dois cards). Loja pede
nome da loja; pessoa física não.

Editar a loja: `PATCH /sellers/me` (auth) — campos: `accountType`, `storeName`,
`storeSlug` (a-z, 0-9 e hífen, único), `storeBanner`, `storeAddress`,
`storeHours`, `storeWebsite`, `whatsapp` (só dígitos), `publicPhone`,
`document` (CPF 11 ou CNPJ 14 dígitos), `avatar`, `bio`, `city`, `state`.

Slug repetido devolve **409** com `Esse endereço de loja já está em uso`.

Perfil público: `GET /sellers/:id` **ou** `GET /sellers/slug/:slug` (novo — use
para a URL bonita `/loja/casa-do-musico-bh`):

```jsonc
{
  "id": "uuid", "name": "Rodrigo Alves", "accountType": "store",
  "storeName": "Casa do Músico BH", "storeSlug": "casa-do-musico-bh",
  "storeAddress": "Av. Afonso Pena, 1500 - Centro, Belo Horizonte/MG",
  "storeHours": "Seg a Sex 9h-18h · Sáb 9h-13h",
  "storeWebsite": "https://casadomusicobh.com.br",
  "storeBanner": "...", "isVerified": true, "bio": "...",
  "contact": { "whatsapp": true, "phone": true, "chat": true },
  "stats": { "listingsCount": 4, "soldCount": 0, "followersCount": 3,
             "ratingAverage": 5, "ratingCount": 2, "positivePercent": 100 }
}
```

Na página da loja: banner, selo "Loja verificada" quando `isVerified`, endereço,
horário, site, os mesmos botões de contato do Prompt 2 (usando
`GET /sellers/:id/contact`) e a lista de anúncios
(`GET /listings?sellerId=<id>`).

Lojas em destaque na home: `GET /sellers/featured?limit=8` (ordenadas por plano).

⚠️ **Avaliação mudou:** só quem já conversou pelo chat com o vendedor pode
avaliar. `POST /reviews` devolve **403** com
`Você só pode avaliar um vendedor com quem já conversou pelo chat`. Só mostre o
botão "Avaliar" para quem tem conversa com aquele vendedor.

## B) Ciclo de vida do anúncio (com curadoria)

`status` agora pode ser: `draft` · `pending_review` · `active` · `rejected` ·
`paused` · `sold` · `deleted`.

Quem **não é verificado** publica em `pending_review` e espera aprovação; quem é
verificado vai direto para `active`. O anúncio recusado traz `rejectionReason`
com o texto do administrador.

Rotas (todas auth, dono do anúncio):

| Ação | Rota |
|---|---|
| Criar | `POST /listings` (`status: "draft"` para rascunho; qualquer outra coisa tenta publicar) |
| Editar | `PATCH /listings/:id` (`status` aqui aceita só `paused` e `draft`) |
| Publicar | `POST /listings/:id/publish` |
| Tirar do ar | `POST /listings/:id/unpublish` (volta a rascunho e libera cota) |
| Marcar vendido | `POST /listings/:id/sold` |
| Excluir | `DELETE /listings/:id` |

Em "Meus anúncios" (`GET /listings/me`, que agora traz também `plan` e `usage`),
mostrar um selo por status:

- `pending_review` → 🕓 **Em análise** — "Seu anúncio está na fila de aprovação"
- `rejected` → ⚠️ **Recusado** — mostrar `rejectionReason` + botão *Corrigir e reenviar*
  (que edita e chama `publish` de novo)
- `paused` → ⏸ **Pausado**, com botão *Publicar*
- `sold` → ✅ **Vendido**
- `active` → 🟢 **No ar**, com contadores `_count.leads` e `_count.favoritedBy`

**Importante:** pergunte "Vendeu esse instrumento?" depois de uns dias no ar. Sem
checkout, o botão *Marcar como vendido* é a única forma de a plataforma saber que
a vitrine funcionou — e é o dado que vai virar histórico de preços depois.

## C) Denúncia (qualquer visitante)

`POST /listings/:id/report` (auth opcional)
```jsonc
{ "reason": "golpe", "details": "Pede Pix antecipado e não aceita ver pessoalmente" }
```
`reason`: `golpe` | `produto_proibido` | `anuncio_duplicado` | `preco_enganoso` |
`ja_vendido` | `outro`.

Link discreto "Denunciar anúncio" no rodapé da página do anúncio, abrindo modal
com os motivos.

## D) Área de administrador (`/admin`)

Só para usuário com `isAdmin` (o `/auth/me` devolve o campo). Quem não é admin
recebe **403** — esconda o menu.

| Tela | Rota |
|---|---|
| Fila de aprovação | `GET /admin/listings/pending?page=1&limit=20` |
| Aprovar | `POST /admin/listings/:id/approve` |
| Recusar | `POST /admin/listings/:id/reject` body `{ "reason": "Fotos não mostram o instrumento" }` (mín. 5 caracteres) |
| Verificar vendedor | `POST /admin/sellers/:id/verify` body `{ "verified": true }` |
| Denúncias | `GET /admin/reports?status=open` |
| Resolver denúncia | `POST /admin/reports/:id/resolve` body `{ "removeListing": true }` |

A fila de aprovação precisa ser rápida de operar: card com foto grande, dados do
anúncio, dados do vendedor (nome, tipo de conta, se é verificado, desde quando) e
dois botões — *Aprovar* e *Recusar* (com motivo). Atalhos de teclado ajudam.

Aprovar um anúncio dispara automaticamente o cruzamento com as procuras do
Prompt 3 — não precisa fazer nada no front.

## Critérios de aceite

- [ ] Cadastro deixa escolher pessoa física ou loja
- [ ] `/loja/<slug>` funciona pela rota de slug
- [ ] Anúncio em análise e recusado aparecem com selo e motivo
- [ ] Botão "Avaliar" só aparece para quem tem conversa com o vendedor
- [ ] Menu de admin invisível para quem não é admin
