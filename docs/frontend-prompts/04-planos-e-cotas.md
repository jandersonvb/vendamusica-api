# Prompt 4 — Planos, assinatura e cotas

> Cole no chat do projeto **frontend** (`vendamusica-web`). Faça os Prompts 1 a 3 antes.

---

## Contexto

É daqui que vem a receita: **o vendedor assina um plano** para ter vitrine. O
modelo é o do NexAtlas Sales — o que separa um plano do outro é quantidade de
anúncios, quantidade de fotos, vídeo e posição na busca.

Ainda **não há cobrança automática**: assinar inicia o teste de 30 dias e
registra o plano. A cobrança entra depois que o preço for validado com as lojas.
Não construa tela de cartão de crédito agora.

Base URL: `${API_URL}/api`.

## A) Página pública de planos (`/planos`)

`GET /plans?audience=store` (público; `audience` = `store` | `personal`, opcional)

```jsonc
[{
  "slug": "store-pro",
  "name": "Loja Pro",
  "description": "Prioridade na busca, vídeo no anúncio e lista de quem procura.",
  "priceCents": 14900,
  "billingPeriod": "monthly",
  "listingLimit": 150,        // null = ilimitado
  "photoLimit": 15,
  "allowsVideo": true,
  "highlightHome": false,
  "seesWantedList": true,
  "searchPriority": 20,
  "audience": "store",
  "trialDays": 30,
  "sortOrder": 2
}]
```

Planos hoje: **Grátis** (R$ 0 · 5 anúncios · 8 fotos), **Loja Start**
(R$ 79/mês · 30 · 10), **Loja Pro** (R$ 149/mês · 150 · 15 · vídeo · prioridade ·
lista de quem procura), **Loja Premium** (R$ 299/mês · ilimitado · 20 · destaque
na home).

⚠️ Monte a tabela **a partir da resposta da API**, não com valores no código —
os preços são hipótese e vão mudar depois da conversa com as lojas.

Ordene por `sortOrder`. Marque o Pro como "Mais escolhido". Destaque
`trialDays` ("30 dias grátis"). Acima da tabela, use o contador real de demanda
do Prompt 3 ("37 pessoas procurando instrumentos agora").

## B) Assinar

`POST /plans/subscribe` (auth)
```jsonc
{ "planSlug": "store-pro" }
```

Regras que o backend aplica (trate as mensagens de erro na UI):
- plano de loja só para conta com `accountType: "store"` → 400
- o teste de 30 dias vale **só na primeira assinatura**; trocar de plano não
  reinicia o período

`DELETE /plans/me` cancela (o vendedor volta ao plano grátis).

Se a conta ainda é pessoa física e a pessoa escolhe um plano de loja, leve-a
antes para o formulário de loja (Prompt 5) — lá ela vira `accountType: "store"`.

## C) Meu plano (`/painel/plano` ou aba na conta)

`GET /plans/me` (auth)
```jsonc
{
  "plan": { "slug": "store-pro", "name": "Loja Pro", "priceCents": 14900,
            "listingLimit": 150, "photoLimit": 15, "allowsVideo": true,
            "highlightHome": false, "seesWantedList": true, "searchPriority": 20 },
  "subscription": { "status": "active",        // trialing | active | canceled | expired
                    "trialEndsAt": null,
                    "currentPeriodEnd": "2026-10-15T23:57:09.286Z",
                    "trialDaysLeft": null },
  "usage": { "listings": 4, "listingLimit": 150 }
}
```

`subscription: null` = está no plano grátis.

Mostrar: nome do plano, barra de uso (`usage.listings / usage.listingLimit`,
"ilimitado" quando `listingLimit` é `null`), data de renovação e, quando
`status: "trialing"`, uma faixa: **"Seu teste termina em X dias"**
(`trialDaysLeft`).

Quando o uso passar de 80% da cota, mostrar aviso com link para upgrade.

## D) Cotas no formulário de anúncio

O backend recusa o que passa do plano, com **403** e mensagem pronta em
português. Trate os três casos e mostre um link "Ver planos":

| Situação | Mensagem que volta |
|---|---|
| Passou da cota | `Seu plano (Grátis) permite 5 anúncios publicados. Faça upgrade para publicar mais.` |
| Fotos demais | `Seu plano (Grátis) permite até 8 fotos por anúncio` |
| Vídeo sem plano | `Vídeo no anúncio está disponível a partir do plano Pro` |

Melhor ainda: **antecipe**. Antes de abrir o formulário, chame `GET /plans/me` e:
- limite o uploader a `plan.photoLimit` fotos
- esconda (ou mostre com cadeado) o campo de vídeo quando `allowsVideo` é `false`
- se `usage.listings >= listingLimit`, mostre a tela de upgrade em vez do
  formulário

Rascunho **não consome cota** — só o anúncio publicado. Deixe isso claro na UI
("salvar como rascunho" sempre disponível).

## Critérios de aceite

- [ ] A tabela de planos vem da API (mudar preço no banco muda a página)
- [ ] O uploader respeita `photoLimit` antes de o usuário tentar enviar
- [ ] Faixa de teste aparece com os dias restantes corretos
- [ ] Erro 403 de cota mostra mensagem + botão "Ver planos", nunca erro genérico
