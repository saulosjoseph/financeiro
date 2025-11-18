# API de Links Compartilháveis de Família

## Visão Geral

Sistema de links compartilháveis de uso único para adicionar membros a uma família. Cada link:
- ✅ Pode ser usado apenas uma vez
- ✅ Tem data de expiração configurável
- ✅ É invalidado automaticamente após o uso
- ✅ Requer autenticação para ser usado

## Endpoints

### 1. Criar Link Compartilhável
**POST** `/api/families/[familyId]/share-link`

Cria um novo link compartilhável para a família (apenas admins).

**Body:**
```json
{
  "role": "member",        // opcional, padrão: "member"
  "expiresInDays": 7       // opcional, padrão: 7 dias
}
```

**Resposta:**
```json
{
  "id": "clx...",
  "familyId": "clx...",
  "token": "abc123...",
  "role": "member",
  "createdBy": "clx...",
  "expiresAt": "2025-11-25T12:00:00.000Z",
  "createdAt": "2025-11-18T12:00:00.000Z",
  "shareUrl": "http://localhost:3000/join/abc123..."
}
```

### 2. Listar Links Ativos
**GET** `/api/families/[familyId]/share-link`

Lista todos os links não utilizados e não expirados da família (apenas admins).

**Resposta:**
```json
[
  {
    "id": "clx...",
    "familyId": "clx...",
    "token": "abc123...",
    "role": "member",
    "createdBy": "clx...",
    "expiresAt": "2025-11-25T12:00:00.000Z",
    "createdAt": "2025-11-18T12:00:00.000Z"
  }
]
```

### 3. Ver Detalhes do Link
**GET** `/api/families/share-link/[token]`

Retorna informações públicas sobre o link (não requer autenticação).

**Resposta:**
```json
{
  "familyName": "Família Silva",
  "role": "member",
  "expiresAt": "2025-11-25T12:00:00.000Z"
}
```

**Erros possíveis:**
- `404` - Link não encontrado
- `400` - Link já foi usado ou expirou

### 4. Entrar na Família via Link
**POST** `/api/families/share-link/[token]`

Adiciona o usuário autenticado à família através do link (uso único).

**Resposta:**
```json
{
  "message": "Successfully joined the family",
  "member": {
    "id": "clx...",
    "familyId": "clx...",
    "userId": "clx...",
    "role": "member",
    "createdAt": "2025-11-18T12:00:00.000Z",
    "family": {
      "id": "clx...",
      "name": "Família Silva"
    },
    "user": {
      "id": "clx...",
      "name": "João Silva",
      "email": "joao@example.com",
      "image": null
    }
  }
}
```

**Erros possíveis:**
- `401` - Não autenticado
- `404` - Link não encontrado
- `400` - Link já foi usado, expirou ou usuário já é membro

### 5. Invalidar Link
**DELETE** `/api/families/[familyId]/share-link?linkId=[id]`

Deleta um link compartilhável antes de ser usado (apenas admins).

**Query Params:**
- `linkId` - ID do link a ser deletado

**Resposta:**
```json
{
  "message": "Share link deleted"
}
```

## Modelo de Dados

```prisma
model FamilyShareLink {
  id        String    @id @default(cuid())
  familyId  String
  token     String    @unique
  role      String    @default("member")
  createdBy String
  usedBy    String?
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime  @default(now())

  family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
}
```

## Fluxo de Uso

1. **Admin cria link:**
   ```bash
   POST /api/families/clx123/share-link
   ```

2. **Admin compartilha URL:**
   ```
   http://localhost:3000/join/abc123...
   ```

3. **Usuário acessa a URL** e vê detalhes da família:
   ```bash
   GET /api/families/share-link/abc123...
   ```

4. **Usuário entra na família** (precisa estar autenticado):
   ```bash
   POST /api/families/share-link/abc123...
   ```

5. **Link é automaticamente invalidado** após o uso (campo `usedAt` é preenchido)

## Segurança

- ✅ Links com token único de 64 caracteres
- ✅ Uso único - invalidado após primeira utilização
- ✅ Expiração configurável (padrão: 7 dias)
- ✅ Apenas admins podem criar/invalidar links
- ✅ Autenticação obrigatória para usar o link
- ✅ Validação de links expirados ou já utilizados
- ✅ Proteção contra uso duplicado

## Diferenças entre Convites e Links Compartilháveis

### Convites (FamilyInvitation)
- Enviados para email específico
- Podem ser aceitos múltiplas vezes por diferentes sessões do mesmo usuário
- Validam o email do usuário logado
- Bom para convidar pessoas específicas

### Links Compartilháveis (FamilyShareLink)
- **Uso único** - primeiro que usar "pega a vaga"
- Não vinculado a email específico
- Pode ser compartilhado livremente
- Bom para convites rápidos ou grupos
