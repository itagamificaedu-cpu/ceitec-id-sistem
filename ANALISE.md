# ANALISE.md — Mapeamento Completo do Ecossistema ITA TECNOLOGIA EDUCACIONAL

**Data da análise:** 2026-04-21  
**Analista:** Claude (arquiteto de software)

---

## PLATAFORMA 1 — GamificaEdu (Django)

**Localização:** `C:\Users\genez\GameficaEdu\portal_professores\`  
**Rodando em:** PythonAnywhere (`itagamificaedu.pythonanywhere.com`)  
**Framework:** Django 6.0.3 (Python)  
**Banco:** SQLite em desenvolvimento → `db.sqlite3`

### Apps Django identificados

| App | Descrição |
|-----|-----------|
| `accounts` | Autenticação e perfil do professor |
| `core` | Dashboard, assinaturas, pagamento, gerador de aulas/provas com IA |
| `ferramentas` | Repositório de materiais didáticos (PDFs) |
| `gamification` | Perfil gamificado do professor (XP, nível, streak, conquistas, missões) |

### Model: `accounts.Professor` (AUTH_USER_MODEL)
- Herda de `AbstractUser`
- Login por **email** (não username)
- Campos: `escola`, `disciplina`, `bio`, `telefone`, `cidade`, `estado`
- Planos: `gratuito`, `educador`, `colaborador`
- Status: `pendente`, `aprovado`, `rejeitado`
- Confirmação de email (UUID token)
- Proteção anti-brute-force (5 tentativas → bloqueio 30min)
- FK para `core.Tenant`

### Model: `core.Tenant`
- Multi-tenancy: cada escola é um Tenant isolado
- Middleware `TenantMiddleware` filtra queries automaticamente
- `TenantMixin` em todos os models para isolamento

### Model: `core.Assinatura`
- OneToOne com Professor
- Planos: `gratuito`, `educador (R$19/mês)`, `colaborador (R$39/mês)`
- Criada automaticamente via signal `post_save`

### Model: `gamification.GamificacaoPerfil`
- OneToOne com Professor
- Campos: `pontos`, `nivel`, `xp`, `streak` (foguinhos Duolingo-style)
- `ultima_atividade`

### Model: `gamification.Conquista` / `ConquistaUsuario` / `Missao`
- Sistema de conquistas e missões por tenant

### Model: `ferramentas.Ferramenta`
- Repositório com categorias: `gamificacao`, `qrcode`, `avaliacao`, `recurso`
- Upload de PDF via `arquivo_pdf`

### URLs mapeadas
```
/                        → core.home
/dashboard/              → core.dashboard
/sobre/                  → core.sobre
/perfil/                 → core.perfil
/ferramentas/            → ferramentas.lista
/ferramentas/<pk>/       → ferramentas.detalhe
/ferramentas/gerador-aulas/  → core.gerador_planos_aula (IA Gemini)
/ferramentas/gerador-provas/ → core.gerador_provas (IA Gemini)
/assinar/<tipo_plano>/   → core.assinar_plano (Mercado Pago)
/webhook/mercadopago/    → core.mercadopago_webhook
/accounts/cadastro/      → accounts.cadastro
/accounts/login/         → accounts.login
/accounts/logout/        → accounts.logout
/accounts/perfil/        → accounts.perfil
/accounts/confirmar-email/<token>/ → accounts.confirmar_email
/gamification/ranking/   → gamification.ranking
/admin/                  → Django Admin
```

### Pagamento
- **Processador:** Mercado Pago (biblioteca `mercadopago`)
- **Token:** `APP_USR-97948385900636-031422-b459084aa93d30f79e89518602866f87-835607568`
- **Webhook:** `/webhook/mercadopago/`
- **Back URLs:** `itagamificaedu.pythonanywhere.com/dashboard/`

### IA integrada
- **Google Gemini API** (`google-generativeai`)
- Chave: `AIzaSyAA4JYEeNzQSfyVvPsx8qyZ9AOS6RnWAfs`
- Usada em: gerador de planos de aula e gerador de provas

### Autenticação
- Session-based (Django sessions)
- `LOGIN_URL = '/accounts/login/'`
- `LOGIN_REDIRECT_URL = '/dashboard/'`

### Email
- Gmail SMTP (`itagamificaedu@gmail.com`)
- App Password configurada

### Requirements
```
Django>=5.0
google-generativeai
mercadopago
requests
python-dotenv
```

---

## PLATAFORMA 2 — Corretor de Provas (Django separado)

**Localização:** `C:\Users\genez\sietemacorrecaodeprovaita\`  
**Framework:** Django (Python)  
**Banco:** SQLite (`db.sqlite3`)

### Models identificados

| Model | Descrição |
|-------|-----------|
| `core.Usuario` | AbstractUser próprio com `tipo_usuario` (admin/professor) |
| `core.Avaliacao` | Prova com gabarito JSON, QR code, modo online |
| `core.Resultado` | Resultado do aluno (scanner ou online) |
| `core.Estatisticas` | Estatísticas calculadas por avaliação |
| `core.Aluno` | Aluno vinculado ao professor |
| `core.TokenQR` | Token de acesso via QR Code com expiração |
| `core.Tentativa` | Sessão do aluno durante a prova |

### Funcionalidades completas
- Criar avaliação com gabarito JSON
- Gerar PDF com gabarito e QR Codes
- Modo sala (monitor ao vivo de tentativas)
- Prova online acessível via QR Code
- Correção automática por comparação gabarito/resposta
- Importação de alunos
- Exportação para Excel
- Estatísticas: média, mediana, desvio padrão, taxa de aprovação

### Requirements
```
Django>=4.2,<5.0
Pillow>=10.0.0
reportlab>=4.0.0
qrcode>=7.4.2
openpyxl>=3.1.0
```

---

## PLATAFORMA 3 — ITA Tecnologia (Node.js + React) — PLATAFORMA PRINCIPAL

**Localização:** `C:\Users\genez\CEITEC ID SYSTEM\`  
**Backend:** Express.js (porta 3001), SQLite (better-sqlite3)  
**Frontend:** React + Vite (porta 5173)

### Backend — Rotas API

| Rota | Descrição |
|------|-----------|
| `/api/auth` | Login, JWT |
| `/api/alunos` | CRUD alunos |
| `/api/turmas` | CRUD turmas |
| `/api/professores` | CRUD professores |
| `/api/presenca` | Registro de presença via QR Code |
| `/api/avaliacoes` | Avaliações |
| `/api/desempenho` | Relatórios de desempenho |
| `/api/ocorrencias` | Ocorrências disciplinares |
| `/api/relatorios` | Relatórios gerais |
| `/api/justificativas` | Justificativas de faltas |
| `/api/itagame` | Sistema gamificado (XP, ranking, badges) |
| `/api/ia` | IA educacional (Claude Anthropic) |

### Banco SQLite — Tabelas
- `usuarios`, `professores`, `turmas`, `alunos`
- `presencas`, `justificativas`
- `itagame_pontos`, `itagame_historico`
- `avaliacoes`, `questoes`
- `ocorrencias`

### Frontend — Páginas React

| Página | Rota |
|--------|------|
| Dashboard | `/dashboard` |
| Alunos | `/alunos` |
| Carteirinha QR Code | `/alunos/:id/carteirinha` |
| Scanner QR | `/scanner` |
| Turmas | `/turmas` |
| Professores | `/professores` |
| Avaliações | `/avaliacoes` |
| Ocorrências | `/ocorrencias` |
| Desempenho | `/desempenho` |
| Relatórios | `/relatorios` |
| ItagGame | `/itagame` |
| IA: Plano de Aula | `/ia/plano-aula` |
| IA: Criador de Questões | `/ia/criador-questoes` |
| IA: Corretor | `/ia/corretor-provas` |
| IA: Diagnóstico | `/ia/diagnostico-aluno` |
| IA: Criador de Conteúdo | `/ia/criador-conteudo` |

### ItagGame (Node.js)
- XP + níveis: Aprendiz (0) → Explorador (200) → Guerreiro (500) → Campeão (1000) → Lenda (2000)
- Rankings por turma
- Histórico de XP
- Badges JSON

### IA
- **Anthropic Claude SDK** (`@anthropic-ai/sdk ^0.90.0`)
- Funcionalidades: plano de aula, criador de questões, corretor, diagnóstico, criador de conteúdo

### Integrações extras
- WhatsApp Web.js (notificações)
- Socket.io (tempo real)
- QR Code (carteirinhas e presença)

---

## DECISÕES DE ARQUITETURA PARA UNIFICAÇÃO

### O que unificar
1. **Auth unificada:** usar o `accounts.Professor` do Django como fonte da verdade; gerar JWT compatível com Node.js
2. **Frontend único:** React (ITA Tecnologia) como portal central; links para o Django onde necessário
3. **Banco unificado em produção:** PostgreSQL único para ambos os Djangos
4. **Corretor integrado:** migrar `sietemacorrecaodeprovaita` como app `corretor` dentro do Django unificado
5. **Pagamento:** Mercado Pago centralizado no Django, planos novos (Professor R$29, Escola R$99)

### Estrutura final proposta
```
CEITEC ID SYSTEM/           ← pasta raiz atual (renomear para ita-tecnologia)
├── frontend/               ← React (já existe, portal central)
├── backend/                ← Node.js (já existe, API QR/Presença/IA)
├── plataforma/             ← Django unificado (NOVO)
│   ├── ita_tecnologia/     ← settings do projeto Django
│   ├── ita_core/           ← Tenant, Assinatura, auth JWT bridge
│   ├── gamificaedu/        ← apps migrados do GamificaEdu
│   │   ├── accounts/
│   │   ├── core/
│   │   ├── ferramentas/
│   │   └── gamification/
│   └── corretor/           ← app migrado do sietemacorrecaodeprovaita
│       └── core/
├── docker-compose.yml
├── Makefile
└── .env.example
```

---

## PENDÊNCIAS E RISCOS

| Item | Risco | Solução |
|------|-------|---------|
| Dois `AUTH_USER_MODEL` diferentes (Professor vs Usuario) | ALTO | Usar `Professor` como modelo base; migrar `Usuario` do corretor |
| Dois Djangos com versões diferentes (6.0.3 vs <5.0) | MÉDIO | Unificar em Django 5.x |
| Banco SQLite em dev, PostgreSQL em prod | BAIXO | docker-compose com Postgres |
| Chaves de API expostas no settings.py | ALTO | Mover para variáveis de ambiente (.env) |
| PythonAnywhere ainda em produção | BAIXO | Manter até deploy do unificado validado |
