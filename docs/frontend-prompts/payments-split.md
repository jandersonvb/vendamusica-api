# Prompt de integração — Pagamentos com Split (Pagar.me)

> Cole no Cursor do projeto **frontend**. Descreve a API de pagamento split
> já pronta no backend VendaMusica e o que precisa existir na UI.

---

## Contexto

O backend implementa **split de pagamento**: numa compra, o dinheiro é dividido
automaticamente pelo gateway (Pagar.me) entre o **vendedor** e a **plataforma**.
O vendedor **não cria conta no Pagar.me** — ele só informa CPF/CNPJ + dados
bancários no nosso app e a plataforma o cadastra como "recebedor" via API.

Há dois fluxos a integrar: **(A) onboarding do vendedor** (dados bancários + KYC)
e **(B) checkout do comprador** (pagar com split).

Base URL: `${API_URL}/api`. Todas as rotas abaixo exigem `Authorization: Bearer <jwt>`.
Valores monetários são **inteiros em centavos** (ex.: `12990` = R$ 129,90).

---

## A) Onboarding do vendedor (dados bancários + status KYC)

Um vendedor só pode receber pedidos depois de cadastrar dados bancários **e** ser
aprovado no KYC do gateway. Bloqueie a publicação/venda enquanto não estiver `active`.

### A1. Cadastrar dados bancários
`POST /payments/recipients`

```jsonc
// request body
{
  "name": "Maria Souza",
  "email": "maria@email.com",
  "document": "12345678900",      // CPF (11) ou CNPJ (14), só dígitos
  "bankCode": "341",               // código do banco (ex.: 341 = Itaú)
  "agency": "1234",
  "account": "56789",
  "accountType": "checking"        // checking | savings
}
```
```jsonc
// response
{ "id": "re_xxx", "status": "pending", "kycUrl": null }
```

### A2. Status + saldo do vendedor (tela "Minha conta de recebimento")
`GET /payments/recipients/me`

```jsonc
// não conectou ainda
{ "connected": false, "status": null, "balance": null }

// conectado
{
  "connected": true,
  "status": "active",          // pending | active | refused | suspended | unknown
  "kycUrl": null,              // se != null, abrir esse link p/ completar KYC
  "balance": {
    "available": 45000,        // disponível p/ saque (centavos)
    "waitingFunds": 12990,     // aguardando liquidação
    "transferred": 230000      // já transferido p/ o banco
  }
}
```

**UI esperada:**
- Form de dados bancários (A1) na configuração do vendedor.
- Badge de status do recebedor:
  - `pending` → "Em análise" (amarelo) — pode anunciar, mas avise que recebimento libera após aprovação.
  - `active` → "Apto a receber" (verde).
  - `refused` → "Cadastro recusado" (vermelho) — pedir para revisar dados/reenviar.
  - `suspended` → "Recebimento suspenso" (vermelho) — contatar suporte.
- Se `kycUrl != null`, botão "Completar verificação" abrindo o link.
- Card de saldo (available / waitingFunds / transferred) no dashboard do vendedor.

---

## B) Checkout do comprador (pagar com split)

O fluxo de checkout já existia (preview, frete, cupom). A novidade: ao finalizar,
o backend cria a cobrança real e devolve um **`checkoutUrl`** — uma página de
pagamento hospedada pelo Pagar.me (cartão/Pix/boleto). **Redirecione o comprador
para esse `checkoutUrl`.** Não colete dado de cartão na nossa UI.

### B1. Preview (já integrado — sem mudança)
`POST /checkout/preview` → retorna `total`, `serviceFee`, `pixDiscount`, etc.

### B2. Finalizar compra
`POST /checkout`

```jsonc
// request body
{
  "listingId": "uuid",
  "addressId": "uuid",
  "shippingMethod": "standard",   // standard | express | pickup
  "paymentMethod": "credit_card", // pix | credit_card | boleto | pix_installments
  "couponCode": "BEMVINDO10",     // opcional
  "installments": 3                // só p/ credit_card
}
```
```jsonc
// response (Order criado, status "pending")
{
  "id": "uuid",
  "total": 145880,
  "commission": 12990,
  "sellerAmount": 116910,
  "status": "pending",
  "checkoutUrl": "https://checkout.pagar.me/...",  // <- REDIRECIONE para cá
  "pagarmeOrderId": "or_xxx"
  // ...demais campos do pedido
}
```

**UI esperada:**
1. Ao receber a resposta, se `checkoutUrl != null` → `window.location.href = checkoutUrl`
   (ou abrir em nova aba). É lá que o comprador paga.
2. Em ambiente **mock** (`PAYMENTS_MODE=mock` no backend), `checkoutUrl` vem `null` —
   nesse caso, use o botão de pagamento simulado: `POST /orders/:id/pay`.
3. Configure no Pagar.me a `success_url` (já é o `FRONTEND_URL`). Faça uma rota
   de retorno tipo `/pedidos/:id/sucesso` que faz polling em `GET /orders/:id`
   até `status === "paid"`.

### B3. Acompanhar status do pedido
`GET /orders/:id` → o `status` muda de `pending` para:
- `paid` — pagamento confirmado (via webhook do gateway).
- `failed` — pagamento recusado.
- `refunded` — estornado/chargeback (o anúncio volta a ficar disponível).

O frontend **não** confirma pagamento; quem confirma é o webhook no backend.
Trate a tela de retorno como "aguardando confirmação" com polling/refresh.

---

## Resumo das rotas

| Método | Rota | Uso |
|---|---|---|
| POST | `/payments/recipients` | Vendedor cadastra dados bancários |
| GET | `/payments/recipients/me` | Status KYC + saldo do vendedor |
| POST | `/checkout/preview` | Resumo de valores (já existia) |
| POST | `/checkout` | Finaliza → retorna `checkoutUrl` p/ redirect |
| GET | `/orders/:id` | Acompanha status (pending→paid) |
| POST | `/orders/:id/pay` | **Só em mock** — simula pagamento |

## Regras de negócio que a UI deve respeitar
- Vendedor com `status != active` pode anunciar, mas avise sobre o recebimento.
- Comprador não compra o próprio anúncio (backend já bloqueia, mas esconda o botão).
- Comissão da plataforma é 10% do item (configurável no backend) — já vem calculada
  em `commission`/`sellerAmount`, não recalcule no front.
- Frete vai pro vendedor; taxas de serviço/proteção e descontos ficam com a plataforma.
