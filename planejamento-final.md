# 📊 Fincasa — Planejamento Final

> PWA de controle financeiro familiar
> **v-final** — Todas as decisões consolidadas. Pronto para scaffold.

## Sobre o nome
**Fincasa** = *finance + casa*. A casa financeira da família.
- Tagline: *"Organize as finanças de casa, em família."*
- Domínios a verificar: `fincasa.app`, `fincasa.com.br`, `usefincasa.com`
- Fallback grátis: `fincasa.vercel.app`

## Identidade visual (direção inicial)
- **Paleta dark**:
  - Background: `#0B0D10` (quase-preto, suave)
  - Surface: `#14171C`
  - Accent primário: `#10B981` (verde-menta) — receitas, metas atingidas
  - Accent secundário: `#6366F1` (indigo) — metas ativas
  - Alert: `#EF4444` (vermelho suave) — estouro de orçamento
  - Text: `#E5E7EB` / `#9CA3AF` (secundário)
- **Tipografia**: Geist ou Inter
- **Ícone**: casa minimalista com elemento financeiro (ex: "F" estilizada formando casa)

## 1. Visão Geral

PWA de controle financeiro **familiar** (você + esposa), com:
- Cada membro lançando suas transações
- Visão individual + combinada da família
- Estrutura orçamentária **40/15/45** baseada na renda familiar combinada
- **Custo zero** (tiers gratuitos Firebase Spark + Vercel Hobby)
- Tema **dark** por padrão
- PWA instalável, funciona offline

---

## 2. Stack Tecnológica

### Frontend
| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16 (App Router)** |
| Linguagem | **TypeScript** |
| Estilização | **Tailwind CSS + shadcn/ui** (tema dark) |
| Estado servidor | **TanStack Query** |
| Estado global | **Zustand** |
| Formulários | **React Hook Form + Zod** |
| Gráficos | **Recharts** |
| PWA | **Serwist** (fallback: next-pwa ou Workbox custom) |
| Datas | **date-fns** |

### Backend
| Serviço | Plano | Uso |
|---|---|---|
| **Firebase Authentication** | Spark (free) | Login só com Google |
| **Cloud Firestore** | Spark (free) | Banco principal, real-time |
| **Firebase Hosting** | Spark (free) | Opcional — Vercel já cobre |
| **Vercel** | Hobby (free) | Deploy + Server Actions |
| ~~Cloud Functions~~ | — | **Removido** (exige Blaze). Substituído por Server Actions |
| ~~FCM Push~~ | — | **Fase futura** (exige Blaze) |

### Limites do free tier (Firestore Spark)
- 50.000 leituras/dia
- 20.000 escritas/dia
- 1 GB storage
- Para 2 usuários, isso é ~100x o necessário

---

## 3. Decisões de Produto (consolidadas)

| # | Decisão | Valor |
|---|---|---|
| 1 | Renda | Cada membro registra a sua, app soma para renda familiar. Dashboard com 3 visões |
| 2 | Cartão de crédito | Lançado na data da compra |
| 3 | Categorias principais | Pré-definidas (fixas). Subcategorias customizáveis |
| 4 | Autenticação | Apenas Google Sign-In |
| 5 | Convite | Link compartilhável (sem email) |
| 6 | Tema | Dark padrão, toggle opcional |
| 7 | Deploy | Vercel Hobby (free) |
| 8 | Moeda | BRL (única) |
| 9 | Cloud Functions | Não usar. Server Actions no lugar |

---

## 4. Categorias do MVP

### 🟥 Essenciais (40%)
- 🏠 **Moradia**: aluguel, condomínio, IPTU, manutenção
- 💡 **Contas da casa**: luz, água, gás, internet, telefone
- 🛒 **Mercado**: supermercado, feira, açougue
- 🚗 **Transporte**: combustível, estacionamento, Uber, transporte público, manutenção
- ⚕️ **Saúde**: plano, farmácia, consultas, exames
- 🎓 **Educação**: cursos, livros, mensalidades
- 🐾 **Pet**: ração, veterinário, acessórios

### 🟨 Qualidade de vida (15%)
- 🍽️ **Restaurantes/Delivery**
- 🎬 **Streaming/Entretenimento**: Netflix, Spotify, cinema, shows
- 🎮 **Lazer**: bares, eventos, hobbies
- 💇 **Cuidado pessoal**: salão, barbeiro, academia, estética
- 👕 **Vestuário**: roupas, calçados, acessórios
- 🎁 **Presentes**

### 🟩 Objetivos (45%) — vinculadas a metas
- 🛡️ **Reserva de Emergência**
- ✈️ **Viagens**
- 🚙 **Carro**
- 📈 **Investimentos**
- 🎯 **Outras metas** (customizável)

### Auxiliares
- 💰 **Receita**: salário, freelance, rendimentos, extras
- ↔️ **Transferência**: entre contas próprias (não entra no orçamento)

### Subcategorias
MVP vem com uma lista sugerida, mas o usuário pode adicionar livres dentro de cada categoria principal. As **categorias principais são fixas** para não quebrar a estrutura 40/15/45.

---

## 5. Modelo de Dados (Firestore)

### `users/{userId}`
```typescript
{
  name: string,
  email: string,
  photoURL?: string,
  currentHouseholdId: string | null,
  householdIds: string[],
  preferences: {
    theme: "dark" | "light" | "system",  // default: "dark"
    defaultView: "mine" | "partner" | "family"
  },
  createdAt: Timestamp
}
```

### `households/{householdId}`
```typescript
{
  name: string,                          // "Casa Silva"
  createdBy: string,
  members: {
    [userId]: {
      role: "owner" | "member",
      name: string,
      photoURL?: string,
      monthlyIncome: number,             // renda individual
      joinedAt: Timestamp
    }
  },
  memberIds: string[],                   // para queries de segurança
  combinedMonthlyIncome: number,         // soma, recalculado em updates
  budgetAllocation: {
    essentials: 0.40,
    qualityOfLife: 0.15,
    goals: 0.45
  },
  currency: "BRL",
  createdAt: Timestamp
}
```

### `households/{householdId}/transactions/{transactionId}`
```typescript
{
  type: "income" | "expense" | "transfer",
  amount: number,                        // sempre positivo
  description: string,
  category: "essentials" | "qualityOfLife" | "goals" | "income" | "transfer",
  subcategory: string,                   // "Mercado", "Uber", etc.
  customSubcategory?: string,            // livre (ex: "Carrefour")
  goalId?: string,                       // se aporte em meta
  date: Timestamp,                       // data da compra (não do lançamento)
  paymentMethod?: "pix" | "credit" | "debit" | "cash",
  createdBy: string,                     // userId de quem lançou
  createdByName: string,                 // desnormalizado
  tags?: string[],
  recurring?: {
    enabled: boolean,
    frequency: "monthly" | "weekly",
    endDate?: Timestamp
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `households/{householdId}/goals/{goalId}`
```typescript
{
  name: string,
  icon: string,
  color: string,
  targetAmount: number,
  currentAmount: number,                 // atualizado via Server Action ao aportar
  monthlyContribution: number,
  startDate: Timestamp,
  estimatedEndDate: Timestamp,
  priority: "high" | "medium" | "low",
  status: "active" | "paused" | "completed",
  category: "emergency" | "travel" | "purchase" | "investment" | "custom",
  createdBy: string
}
```

### `households/{householdId}/invites/{inviteId}`
```typescript
{
  token: string,                         // UUID para URL
  invitedBy: string,
  invitedByName: string,
  householdName: string,
  status: "pending" | "accepted" | "expired",
  createdAt: Timestamp,
  expiresAt: Timestamp,                  // 7 dias
  usedBy?: string                        // userId de quem aceitou
}
```

### Subcategorias customizadas
`households/{householdId}/customSubcategories/{id}`
```typescript
{
  category: "essentials" | "qualityOfLife" | "goals",
  name: string,                          // "Farmácia Araújo"
  icon?: string,
  createdBy: string,
  createdAt: Timestamp
}
```

---

## 6. Fluxo de Convite (sem email)

```
1. Você cadastra → loga com Google
2. Não tem household → direciona para "Criar família"
3. Preenche: nome da família, sua renda mensal
4. Vai para Dashboard (sozinho por enquanto)
5. Menu → "Convidar membro"
6. App gera link único: https://fincasa.app/invite/abc123xyz
7. Você copia e manda pelo WhatsApp
8. Esposa abre o link → loga com Google
9. Tela: "Você foi convidada para Casa Silva por João. Aceitar?"
10. Aceita → preenche sua renda → entra no household
11. Ambos veem tudo em tempo real
```

Link expira em 7 dias, pode ser regenerado.

---

## 7. Arquitetura sem Cloud Functions

Operações que seriam Cloud Functions passam a ser **Server Actions do Next.js**:

| Operação | Antes | Agora |
|---|---|---|
| Criar household | Cloud Function | Server Action (`app/actions/household.ts`) |
| Aceitar convite | Cloud Function | Server Action |
| Remover membro | Cloud Function | Server Action |
| Atualizar `currentAmount` da meta | Trigger Firestore | Server Action ao criar transação com `goalId` |
| Agregação mensal | Trigger Firestore | Calculada no client com React Query + cache |
| Validação de schema | Trigger Firestore | Zod no client + Server Action |

**Segurança:** Server Actions validam com Firebase Admin SDK antes de escrever. Firestore Rules continuam rígidas como fallback.

---

## 8. Regras de Segurança (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isMember(householdId) {
      return request.auth != null &&
             request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberIds;
    }
    
    function isOwner(householdId) {
      return request.auth != null &&
             get(/databases/$(database)/documents/households/$(householdId)).data.members[request.auth.uid].role == "owner";
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /households/{householdId} {
      allow read: if isMember(householdId);
      allow create: if request.auth != null;
      allow update: if isMember(householdId);
      allow delete: if false;
      
      match /transactions/{txId} {
        allow read: if isMember(householdId);
        allow create: if isMember(householdId) && request.resource.data.createdBy == request.auth.uid;
        allow update, delete: if isMember(householdId) && resource.data.createdBy == request.auth.uid;
      }
      
      match /goals/{goalId} {
        allow read, write: if isMember(householdId);
      }
      
      match /customSubcategories/{subId} {
        allow read, write: if isMember(householdId);
      }
    }
    
    // Convites: leitura pública (token é secreto), escrita só via Server Action
    match /households/{householdId}/invites/{inviteId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 9. Dashboard — 3 visões

Toggle no topo do Dashboard:

| Visão | Mostra |
|---|---|
| **Minha** | Só suas transações e sua contribuição para metas |
| **Dela** | Só as transações da esposa e contribuição dela |
| **Família** (padrão) | Tudo somado, divisão 40/15/45, metas combinadas |

Em "Família" dá pra ver quem gastou quanto em cada categoria (mini-chart com cores por pessoa).

---

## 10. Funcionalidades por Fase

### 🟢 MVP (Fase 1) — semanas 1-3
- Login Google
- Criar household + link de convite
- Onboarding (renda, aceitar convite)
- CRUD de transações com categorias fixas
- Dashboard com 3 visões e distribuição 40/15/45
- Lista de transações com filtros

### 🟡 Fase 2 — semanas 4-5
- Metas (CRUD + aportes + progresso + previsão)
- Subcategorias customizáveis

### 🟠 Fase 3 — semana 6
- Relatórios e gráficos
- Exportar CSV
- Filtros avançados (por membro, período, categoria)

### 🔵 Fase 4 — semana 7
- Transações recorrentes
- PWA completo (Serwist, manifest, install prompt, offline)
- Tema toggle

### 🟣 Futuro (se precisar)
- Push notifications (requer Blaze — avaliar ROI)
- Importação de extratos
- Biometria
- Múltiplos households

---

## 11. Estrutura de Rotas (Next.js 16)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx
├── (app)/
│   ├── layout.tsx                    → guard: auth + household
│   ├── page.tsx                      → Dashboard
│   ├── transactions/
│   │   ├── page.tsx                  → lista + filtros
│   │   ├── new/page.tsx              → formulário rápido
│   │   └── [id]/page.tsx             → detalhe/edição
│   ├── goals/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── reports/page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── household/page.tsx        → membros, link de convite, renda
│       └── categories/page.tsx       → subcategorias customizadas
├── onboarding/
│   ├── page.tsx                      → "Criar família" ou aguardar convite
│   └── create/page.tsx
├── invite/[token]/page.tsx           → aceitar convite
├── actions/                          → Server Actions
│   ├── household.ts
│   ├── invite.ts
│   ├── transaction.ts
│   └── goal.ts
├── manifest.ts                       → PWA manifest
├── sw.ts                             → Service worker (Serwist)
└── layout.tsx                        → root, tema dark
```

---

## 12. Estrutura de Pastas

```
src/
├── app/                   → rotas e Server Actions
├── components/
│   ├── ui/                → shadcn
│   ├── transactions/
│   ├── goals/
│   ├── charts/
│   └── layout/            → bottom nav, header, FAB
├── features/
│   ├── auth/
│   ├── household/
│   ├── transactions/
│   ├── goals/
│   └── reports/
├── hooks/
├── lib/
│   ├── firebase/
│   │   ├── client.ts      → SDK client
│   │   ├── admin.ts       → SDK admin (Server Actions)
│   │   └── converters.ts  → Firestore converters
│   ├── utils.ts
│   └── validators.ts      → Zod schemas
├── stores/                → Zustand
├── types/
└── middleware.ts          → auth guard
```

---

## 13. Roadmap

| Semana | Entrega |
|---|---|
| **1** | Setup Next 16 + Firebase + Tailwind + shadcn + auth Google |
| **2** | Households: criar, convidar (link), aceitar |
| **3** | Transações (CRUD) + Dashboard (3 visões) |
| **4** | Metas (CRUD + aportes) |
| **5** | Subcategorias custom + relatórios básicos |
| **6** | Gráficos avançados + exportar CSV |
| **7** | Recorrências + PWA (Serwist, manifest, offline, install) |
| **8** | Polish, testes, deploy produção Vercel |

---

## 14. Custos — garantia zero

| Serviço | Plano | Limite | Uso esperado (2 pessoas) |
|---|---|---|---|
| Firebase Auth | Spark | Ilimitado | ✓ |
| Firestore | Spark | 50k reads/dia, 20k writes/dia | <500 reads/dia |
| Firebase Hosting | Spark | Não usamos (Vercel) | — |
| Vercel | Hobby | 100GB bandwidth/mês | <5GB/mês |
| Domínio | Opcional | — | Usar subdomínio grátis `.vercel.app` |

**Resultado: R$ 0/mês garantido.**

Se um dia quiserem custom domain, registro.br cobra ~R$ 40/ano — único custo potencial e opcional.

---

## 15. Próximos Passos

1. ✅ Decisões validadas
2. ⏭️ Criar projeto Firebase (free, sem Blaze)
3. ⏭️ Criar conta Vercel (free)
4. ⏭️ Scaffold Next.js 16 + estrutura inicial
5. ⏭️ Implementar auth Google + layout base
6. ⏭️ Implementar household + convite (primeira entrega testável em par)

---

## 16. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Serwist não suportar Next 16 | Usar `next-pwa` ou Workbox direto |
| Limite de reads Firestore | Cache agressivo com React Query + persistência offline |
| Server Actions com Firebase Admin | Usar Application Default Credentials na Vercel |
| Esposa não adotar | UI mobile-first simples, lançamento em 2 toques |
| Dados perdidos | Export CSV periódico + backup manual |
