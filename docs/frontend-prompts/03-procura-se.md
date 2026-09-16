# Prompt 3 — "Procura-se" (desejo de compra)

> Cole no chat do projeto **frontend** (`vendamusica-web`). Faça os Prompts 1 e 2 antes.

---

## A ideia

Inspirado no "Cadastrar desejo de compra" do NexAtlas Sales. O comprador
registra o que está procurando ("quero uma Stratocaster até R$ 5.000 em MG") e a
plataforma cruza com os anúncios. Isso resolve dois problemas de uma vez:

1. **Comprador:** é avisado quando o instrumento aparece, em vez de ficar voltando
2. **Vendedor:** vê que existe demanda real — é o argumento que vende o plano
   ("37 pessoas estão procurando o que você vende")

Base URL: `${API_URL}/api`.

## A) Comprador: criar e gerenciar procuras

`POST /wanted` (auth)
```jsonc
{
  "title": "Procuro Stratocaster até R$ 5.000",   // obrigatório, 3-120 chars
  "category": "Guitarras",                          // obrigatório
  "brand": "Fender",                                // opcional
  "model": "Player Stratocaster",                   // opcional
  "maxPrice": 500000,                               // opcional, centavos
  "condition": "seminovo",                          // opcional: novo|seminovo|usado
  "city": "Belo Horizonte",                         // opcional
  "state": "MG",                                    // opcional, 2 letras
  "description": "De preferência sunburst."         // opcional, até 1000
}
```

A resposta já vem com os anúncios que casaram:
```jsonc
{
  "id": "uuid", "title": "...", "status": "active",
  "matches": [ { "id": "uuid", "listingId": "uuid",
                 "listing": { "id": "uuid", "title": "...", "price": 749000,
                              "images": ["..."], "city": "...", "state": "MG",
                              "sellerId": "uuid" } } ]
}
```

- `GET /wanted/me` — minhas procuras (traz `_count.matches`)
- `GET /wanted/:id` — uma procura com todos os matches
- `PATCH /wanted/:id` — editar; aceita também `status`: `active` | `fulfilled` | `archived`
- `DELETE /wanted/:id` — arquiva
- `GET /wanted/me/matches` — **todos** os anúncios novos que casaram com as minhas
  procuras (é a tela de "novidades"; a chamada marca tudo como visto)

### Telas

**`/procuro` (privada)** — lista das minhas procuras, cada card com:
título, filtros resumidos ("Fender · até R$ 5.000 · MG"), contador
`X instrumentos encontrados`, botões *Ver resultados*, *Editar*, *Já encontrei*
(vira `status: "fulfilled"`).

**Formulário** — pode ser um modal, reaproveitando os selects de categoria,
marca, condição e estado que já existem no formulário de anúncio.

**Ponto de entrada mais importante:** quando a **busca não retorna resultado**,
mostrar no lugar do vazio:

```
Não encontramos "Stratocaster sunburst" agora.
[ Avise-me quando aparecer ]   ← abre o formulário já preenchido
                                  com o termo, categoria e filtros da busca
```

Esse é o momento de maior intenção — é aqui que a maior parte das procuras vai
nascer. Vale também um card na home e um item no menu da conta.

## B) Vendedor: ver a demanda

**Resumo público** (não precisa de login) — use na home e na página de planos:

`GET /wanted/demand?category=&city=&state=`
```jsonc
{ "total": 37, "byCategory": [ { "category": "Guitarras", "count": 12 } ] }
```

Na home: *"37 pessoas estão procurando instrumentos agora."*
Na página de planos: *"12 pessoas procuram guitarras. Assine para falar com elas."*

**Demanda que casa com o que eu vendo** (auth) — bloco do painel:

`GET /wanted/demand/for-me`
```jsonc
{ "total": 2, "byCategory": [ { "category": "Guitarras", "count": 1 } ],
  "canSeeList": true }
```

**Lista de quem procura** (auth) — a parte paga:

`GET /wanted/demand/list?category=&city=&state=&page=1&limit=20`

Sem plano que libere (`free` e `store-start`):
```jsonc
{ "locked": true, "total": 4, "data": [],
  "message": "Faça upgrade para ver quem está procurando e falar direto com essas pessoas." }
```

Com plano Pro ou Premium:
```jsonc
{ "locked": false, "total": 4, "page": 1, "limit": 20,
  "data": [ { "id": "uuid", "title": "Procuro Strato até 8 mil",
              "category": "Guitarras", "brand": "Fender", "maxPrice": 800000,
              "city": "Belo Horizonte", "state": "MG",
              "description": "...", "createdAt": "...",
              "user": { "id": "uuid", "name": "Carlos M.", "avatar": null,
                        "city": "Belo Horizonte", "state": "MG" } } ] }
```

### Como mostrar o bloqueio

Quando `locked: true`, renderize a lista **borrada com o total por cima** — o
vendedor precisa ver que a demanda existe para querer pagar:

```
┌────────────────────────────────────────┐
│  ░░░░░░░░░ (4 cards borrados) ░░░░░░░  │
│                                        │
│     🔒 4 pessoas procurando agora      │
│     [ Ver quem são — planos ]          │
└────────────────────────────────────────┘
```

Não mostre nome nem cidade real no HTML quando estiver bloqueado (o backend já
não envia — não tente reconstruir).

Para falar com quem procura, use o chat interno e registre o lead com
`POST /leads { "sellerId": "<id de quem procura>", "channel": "wanted" }`.

## Critérios de aceite

- [ ] Busca sem resultado oferece criar a procura, já preenchida
- [ ] "Já encontrei" muda o status e some da lista ativa
- [ ] Vendedor no plano grátis vê o total borrado, nunca os dados de contato
- [ ] O contador da home vem de `/wanted/demand`, sem número inventado
