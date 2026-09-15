# Prompt de integração — Chat estilo Messenger (Feature G2)

Cole no Claude do **vendamusica-web**. O backend já está implementado e testado (build + boot OK).

---

## Contexto

O chat do marketplace foi expandido para o nível "Messenger/WhatsApp", **mantendo** o que já existe (conversas por anúncio + propostas/Offers). Foram adicionados: presença online, typing, recibos entregue/lido (✓✓), paginação por cursor, mídia, reply, editar, apagar e reações. Preciso integrar isso no frontend.

- Base URL: `http://localhost:3001/api`
- Auth: `Authorization: Bearer <accessToken>` (JWT) em todas as rotas.
- WebSocket: socket.io no namespace `/chat` em `http://localhost:3001/chat`, autenticando com `{ auth: { token: accessToken } }`.
- IDs de conversa/mensagem/usuário são **string (UUID)**.

## ⚠️ Mudanças que quebram o que existe hoje

1. **`GET /conversations/:id/messages` mudou o formato de resposta.** Antes retornava um array de mensagens (ordem asc). Agora retorna paginação por cursor:
   ```json
   { "messages": [ ...MensagemMaisAntiga→MaisNova ], "hasMore": true, "nextCursor": "<uuid|null>" }
   ```
   Para carregar mensagens **mais antigas** (scroll pra cima), chame de novo com `?cursor=<nextCursor>&take=30` e faça **prepend** do resultado.

2. **`GET /conversations` agora ordena por `lastMessageAt`** (atividade) e cada conversa traz campos novos: `lastMessage` (objeto formatado, não mais o registro cru), `unread` (bool), `unreadCount` (number), `otherParty` ({id,name,avatar}), `online` (bool).

3. O objeto de **mensagem** agora tem um formato padronizado (ver "Shape da mensagem").

## Endpoints REST

| Método | Rota | Body / Query | Descrição |
|---|---|---|---|
| GET | `/conversations` | — | Lista conversas (ordenadas por atividade, com unreadCount/online/otherParty) |
| POST | `/conversations` | `{ listingId }` | Cria/recupera conversa do anúncio |
| GET | `/conversations/unread/count` | — | `{ count }` total de não lidas (badge global) |
| GET | `/conversations/:id/messages` | `?cursor&take` | Mensagens paginadas (cursor) |
| GET | `/conversations/:id/messages/search` | `?q=texto` | Busca textual (até 50, exclui apagadas) |
| POST | `/conversations/:id/messages` | `{ content, replyToMessageId? }` | Envia texto (também emite via socket) |
| POST | `/conversations/:id/media` | `multipart: file, content?, replyToMessageId?` | Envia imagem/áudio/arquivo |
| PATCH | `/conversations/:id/messages/:messageId` | `{ content }` | Edita (só autor) |
| DELETE | `/conversations/:id/messages/:messageId` | `{ forEveryone? }` | Apaga (forEveryone só autor) |
| POST | `/conversations/:id/messages/:messageId/reactions` | `{ emoji }` | Adiciona/atualiza reação |
| DELETE | `/conversations/:id/messages/:messageId/reactions` | — | Remove minha reação |
| POST | `/conversations/:id/read` | — | Marca conversa como lida |
| GET/POST | `/conversations/:id/offers` ... | (inalterado) | Propostas — **continua igual** |

> Enviar texto pode ser feito por REST **ou** pelo socket (`sendMessage`). Use socket quando o WS estiver conectado; o REST é fallback. **Não** dê append local + append do evento `newMessage` (deduplique por `id`).

## WebSocket — namespace `/chat`

Conexão:
```ts
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001/chat', { auth: { token: accessToken } });
```
Ao conectar, o servidor já faz **auto-join** de todas as suas conversas e marca como entregues as mensagens pendentes.

### Eventos que o cliente EMITE
| Evento | Payload | Quando |
|---|---|---|
| `joinConversation` | `{ conversationId }` | Abrir uma conversa (garante a sala) |
| `sendMessage` | `{ conversationId, content, replyToMessageId? }` | Enviar texto (ack retorna a mensagem) |
| `typing:start` / `typing:stop` | `{ conversationId }` | Usuário digitando |
| `message:read` | `{ conversationId }` | Conversa visível na tela |
| `users:online` | `{ userIds: string[] }` | Consultar presença (ack: `[{userId, online}]`) |

### Eventos que o cliente ESCUTA
| Evento | Payload | Ação na UI |
|---|---|---|
| `newMessage` | Mensagem (shape abaixo) | Append (dedup por `id`); bump da conversa pro topo |
| `conversation:updated` | `{ conversationId, lastMessageAt }` | Reordenar lista de conversas |
| `conversation:new` | `{ conversationId }` | Nova conversa criada → refetch da lista |
| `message:delivered` | `{ conversationId, deliveredTo }` | Marcar minhas msgs como ✓ entregue |
| `message:read` | `{ conversationId, readBy, readAt }` | Marcar minhas msgs como ✓✓ lido |
| `message:edited` | Mensagem | Substituir pelo `id` |
| `message:deleted` | `{ conversationId, messageId, deletedForEveryone, deletedBy }` | Render "Mensagem removida" |
| `message:reaction` | `{ conversationId, messageId, reactions[] }` | Atualizar reações da msg |
| `typing:start` / `typing:stop` | `{ conversationId, userId }` | Mostrar/ocultar "digitando…" |
| `user:online` / `user:offline` | `{ userId }` | Atualizar bolinha de presença |

## Shape da mensagem (igual em REST e socket)
```ts
type ChatMessage = {
  id: string;
  conversationId: string;
  content: string;                 // '' quando deletedForEveryone
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'FILE';
  media: { url: string; mimeType: string | null; size: number | null; fileName: string | null } | null;
  replyTo: { id: string; senderId: string; content: string; type: string } | null;
  reactions: { emoji: string; count: number; mine: boolean }[];
  senderId: string;
  sender: { id: string; name: string; avatar: string | null };
  isMine: boolean;                 // relativo a quem buscou (no socket = remetente)
  deliveredAt: string | null;
  readAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  deletedForEveryone: boolean;
  createdAt: string;
};
```

## Recibos (✓ / ✓✓)
Para **minhas** mensagens (`isMine`): sem `deliveredAt` = enviando/enviado; `deliveredAt` ≠ null = ✓ entregue; `readAt` ≠ null = ✓✓ lido. `deliveredAt` é setado quando o destinatário está online (no envio) ou ao conectar (evento `message:delivered`).

## Tarefas de implementação no frontend
1. Adaptar o fetch de mensagens ao novo formato paginado + infinite scroll (prepend com `nextCursor`).
2. Adaptar a lista de conversas aos novos campos (`unreadCount`, `online`, `otherParty`, `lastMessage`).
3. Badge global de não lidas com `GET /conversations/unread/count` + atualização via eventos.
4. Indicador "digitando…" com debounce (emitir `typing:start` ao digitar, `typing:stop` após ~2s ocioso ou ao enviar).
5. Presença online (bolinha) via `user:online`/`user:offline` + `users:online` no load.
6. Recibos ✓/✓✓ por mensagem.
7. UI de mídia (upload com preview, render de imagem/áudio/arquivo).
8. Reply (citar mensagem), editar (inline), apagar (menu, "para todos"), reações (emoji picker + contadores).
9. Busca dentro da conversa.
10. Manter a UI de **Propostas/Offers** existente intacta (eventos `newOffer`/`offerUpdate` continuam).
