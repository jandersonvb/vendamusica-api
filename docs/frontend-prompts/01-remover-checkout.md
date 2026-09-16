# Prompt 1 — Virar o app para vitrine (remover compra na plataforma)

> Cole no chat do projeto **frontend** (`vendamusica-web`). Este é o primeiro de
> 5 prompts. Faça na ordem: 1 → 2 → 3 → 4 → 5.

---

## Contexto

O VendaMúsica deixou de ser marketplace com checkout e virou **vitrine**: a
plataforma não intermedia mais o pagamento do instrumento. O comprador encontra
o anúncio e fala **direto** com o vendedor (WhatsApp, telefone ou chat interno).
Quem paga a plataforma é o vendedor, por um plano de assinatura.

O backend já foi migrado. **As rotas de carrinho, checkout, pedidos, endereços e
pagamento não existem mais** — qualquer chamada para elas dá 404.

Base URL: `${API_URL}/api`. Valores em **centavos** (`749000` = R$ 7.490,00).

## O que REMOVER

Páginas (apagar o arquivo e qualquer link/rota para elas):
- `src/app/(public)/carrinho/page.tsx`
- `src/app/(private)/checkout/[listingId]/page.tsx`
- `src/app/(private)/conta/pedidos/page.tsx`
- `src/app/(private)/pedidos/[id]/sucesso/page.tsx`

Também remover:
- Ícone/contador de carrinho no header
- Qualquer store/contexto de carrinho (Zustand) e hooks `useCart`, `useCheckout`,
  `useOrders`, `useAddresses`
- Serviços/clients de API: `cart`, `checkout`, `orders`, `addresses`, `payments`
- Menu "Meus pedidos" e "Meus endereços" na área da conta
- Tela de dados bancários / conta de recebimento do vendedor
- Textos de frete, cupom, parcelamento e "compra garantida" (não existem mais)

## O que MUDA no anúncio

`price` agora é **opcional** (`number | null`). Quando vier `null`, mostrar
**"Sob consulta"** no lugar do preço — é comum em anúncio de loja.

O campo `installments` deixou de existir. Existe agora `videoUrl: string | null`
(link de YouTube): se vier preenchido, mostrar o vídeo na galeria do anúncio.

O objeto `seller` dentro do anúncio **não traz mais e-mail nem telefone** (isso
era um vazamento de dados). Ele traz:

```jsonc
{
  "id": "uuid",
  "name": "Rodrigo Alves",
  "avatar": null,
  "city": "Belo Horizonte",
  "state": "MG",
  "accountType": "store",        // "store" = loja · "personal" = pessoa física
  "storeName": "Casa do Músico BH",
  "storeSlug": "casa-do-musico-bh",
  "isVerified": true,
  "ratingAverage": 5,
  "ratingCount": 2,
  "followersCount": 3
}
```

Em `GET /listings/:id` vem também:

```jsonc
"contact": { "whatsapp": true, "phone": false, "chat": true }
```

Isso diz **quais botões de contato mostrar**. O número em si só vem no clique —
isso está no Prompt 2.

## O que muda no CTA

Onde hoje existe **"Comprar agora" / "Adicionar ao carrinho"**, passa a existir
um bloco de contato com o vendedor:

```
┌──────────────────────────────────┐
│  R$ 7.490,00                     │
│  ou "Sob consulta"               │
│                                  │
│  [ Chamar no WhatsApp ]  ← verde │
│  [ Ver telefone        ]         │
│  [ Conversar pelo chat ]         │
│                                  │
│  🛡️ Negocie sempre com cuidado.  │
│     Veja nossas dicas.           │
└──────────────────────────────────┘
```

Mostrar cada botão só se a flag correspondente em `contact` for `true`.
O botão de chat continua indo para o chat interno que já existe.

Como a plataforma não garante mais o pagamento, incluir um aviso discreto de
segurança perto do CTA (link para uma página estática "Dicas de segurança":
desconfie de preço muito abaixo do mercado, prefira ver o instrumento
pessoalmente, não faça Pix antecipado para desconhecido).

## Página de busca / filtros

Dois filtros novos (query string em `GET /listings`):
- `accountType=store` ou `personal` → "Só lojas" / "Só pessoa física"
- `verifiedOnly=true` → "Só vendedores verificados"

Filtros que **saíram**: parcelamento e frete.

A ordenação da vitrine já vem pronta do backend (destaque pago → plano do
vendedor → critério escolhido). O front só passa `sort` como já fazia.

## Critérios de aceite

- [ ] Nenhuma rota do front chama `/cart`, `/checkout`, `/orders`, `/addresses` ou `/payments`
- [ ] Anúncio sem preço mostra "Sob consulta" sem quebrar layout
- [ ] O bloco de contato aparece no lugar do botão de compra
- [ ] `npm run build` passa sem erro de tipo (remover os tipos órfãos)
