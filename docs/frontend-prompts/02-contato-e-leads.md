# Prompt 2 — Contato com o vendedor e painel de contatos (leads)

> Cole no chat do projeto **frontend** (`vendamusica-web`). Faça o Prompt 1 antes.

---

## Por que isso importa

Na vitrine, o produto que a plataforma vende para o lojista é **contato**. Se a
loja não enxerga quantas pessoas chegaram até ela pelo VendaMúsica, ela cancela
o plano no terceiro mês. Por isso **todo clique em contato é registrado**, e o
painel mostra esse número.

Base URL: `${API_URL}/api`.

## A) Revelar o contato (e registrar o lead)

O telefone e o WhatsApp **não vêm junto com o anúncio**. Eles só chegam quando o
usuário clica, através de:

`GET /listings/:id/contact?channel=whatsapp` (ou `channel=phone`)
Autenticação **opcional** — se houver token, manda; se não houver, funciona igual.

```jsonc
// resposta
{
  "sellerName": "Casa do Músico BH",
  "whatsapp": "5531999998888",     // preenchido só se channel=whatsapp
  "phone": null,                    // preenchido só se channel=phone
  "suggestedMessage": "Olá! Tenho interesse no anúncio \"Fender Stratocaster Player Sunburst\" que vi no VendaMúsica."
}
```

Para a página da loja (contato fora de um anúncio):
`GET /sellers/:id/contact?channel=whatsapp` — mesmo formato.

### Comportamento esperado

**Botão "Chamar no WhatsApp":**
1. chama o endpoint com `channel=whatsapp`
2. abre `https://wa.me/${whatsapp}?text=${encodeURIComponent(suggestedMessage)}`
   em nova aba

⚠️ Abrir a nova aba **de forma síncrona no clique** (Safari/iOS bloqueia
`window.open` depois de um `await`). Padrão: abrir `window.open('', '_blank')`
antes do fetch e depois setar `.location.href`; ou usar um `<a>` cujo href é
preenchido após um primeiro clique.

**Botão "Ver telefone":** chama com `channel=phone` e revela o número no lugar
do botão (com opção de copiar).

**Botão "Conversar pelo chat":** abre o chat interno e registra o lead:

`POST /leads` (auth opcional)
```jsonc
{ "listingId": "uuid", "channel": "chat", "source": "listing_page" }
```

`channel`: `whatsapp` | `phone` | `chat` | `email` | `store_page` | `wanted`.
`source`: texto livre curto (`listing_page`, `store_page`, `search`).
Use `sellerId` em vez de `listingId` quando o contato partir da página da loja.

Não registre lead quando o próprio vendedor clica no seu anúncio — o backend já
ignora esse caso, mas evite a chamada.

## B) Painel de contatos do vendedor

Tela nova em `/painel` (ou aba "Contatos"), alimentada por:

`GET /dashboard/overview` (auth) — já existe, mas **mudou**: as métricas de
vendas e faturamento sumiram e entraram as de contato.

```jsonc
{
  "listings": { "total": 4, "active": 4, "draft": 0, "pending_review": 0,
                "rejected": 0, "paused": 0, "sold": 0 },
  "views": { "total": 1280 },
  "leads": {
    "last30Days": 49,
    "previous30Days": 31,
    "changePercent": 58.1,          // null quando não há período anterior
    "byChannel": [ { "channel": "whatsapp", "count": 16 },
                   { "channel": "chat", "count": 14 } ],
    "conversionPercent": 3.8         // leads ÷ visualizações
  },
  "series": [ { "date": "2026-08-17", "leads": 0 }, ... ],   // 30 dias
  "topListings": [ { "listingId": "uuid", "title": "...", "image": "...",
                     "views": 320, "leads": 12 } ],
  "pendingMessages": 2,
  "plan": { "slug": "store-pro", "name": "Loja Pro", "listingLimit": 150,
            "photoLimit": 15, "allowsVideo": true, "seesWantedList": true },
  "subscription": { "status": "active", "trialEndsAt": null,
                    "currentPeriodEnd": "2026-10-15T23:57:09.286Z",
                    "trialDaysLeft": null },
  "usage": { "listings": 4, "listingLimit": 150 },
  "demand": { "total": 2, "byCategory": [ { "category": "Guitarras", "count": 1 } ],
              "canSeeList": true }
}
```

Lista dos contatos recebidos:
`GET /dashboard/leads?limit=30` (ou `GET /leads/me`)

```jsonc
[{
  "id": "uuid",
  "channel": "whatsapp",
  "source": "listing_page",
  "createdAt": "2026-09-15T18:20:00.000Z",
  "listing": { "id": "uuid", "title": "...", "images": ["..."] },
  "visitor": { "id": "uuid", "name": "Carlos M.", "avatar": null,
               "city": "Belo Horizonte", "state": "MG" }   // null se deslogado
}]
```

Série própria, com período ajustável: `GET /leads/me/summary?days=30`
(mesmo formato do bloco `leads` + `series` + `topListings`).

### Layout sugerido do painel

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Contatos    │ Visualiza-  │ Conversão   │ Anúncios    │
│ 49  ↑58%    │ ções 1.280  │ 3,8%        │ 4 / 150     │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌──────────────────────────┬──────────────────────────┐
│ Contatos por dia (linha) │ Por canal (donut)        │
└──────────────────────────┴──────────────────────────┘
┌──────────────────────────┬──────────────────────────┐
│ Anúncios que mais geram  │ Últimos contatos         │
│ contato (top 5)          │ (lista com data e canal) │
└──────────────────────────┴──────────────────────────┘
```

O texto "↑58% em relação aos 30 dias anteriores" só aparece se
`changePercent !== null`. Se `last30Days === 0`, mostrar estado vazio com dica:
"Anúncios com foto boa e preço na descrição recebem mais contatos."

## Critérios de aceite

- [ ] Nenhum número de telefone/WhatsApp aparece no HTML antes do clique
- [ ] O clique no WhatsApp abre o app com a mensagem sugerida (testar no celular)
- [ ] Todo botão de contato gera um registro que aparece em "Últimos contatos"
- [ ] O painel não menciona mais vendas, faturamento ou ticket médio
