---
name: ceitec-ita-system
description: >
  Arquitetura completa dos DOIS sistemas que rodam no VPS da ITA Tecnologia Educacional.
  Use esta skill SEMPRE antes de qualquer implementação, correção ou alteração em qualquer
  dos dois sistemas. SISTEMA 1 = Plataforma Educacional ITA (escola CEITEC, containers app-*).
  SISTEMA 2 = Sistema de Lojas (ViviBoutique, PalomaAroma, VivaModa — cada loja tem containers
  próprios e banco próprio). NUNCA misturar escolas com lojas. NUNCA misturar uma loja com outra.
---

# ITA Tecnologia Educacional — Arquitetura dos Dois Sistemas

Leia este documento INTEIRO antes de escrever qualquer linha de código.
Qualquer implementação que contradiga este documento está ERRADA.

---

## ⚠️ REGRA NÚMERO 1 — NUNCA MISTURAR

O VPS hospeda **DOIS sistemas completamente independentes**:

```
VPS itatecnologiaeducacional.tech (IP: 2.24.73.137)
│
├── SISTEMA 1 — Plataforma Educacional ITA
│   └── Containers: app-react-1, app-node-1, app-django-1, app-nginx-1, app-db-1
│   └── Domínio: itatecnologiaeducacional.tech
│   └── Escola em uso: CEITEC
│
└── SISTEMA 2 — Sistema de Lojas (3 lojas independentes)
    ├── VivaModa     → containers vivimoda_*    → porta 8010
    ├── ViviBoutique → containers viviboutique_* → porta 8011
    └── PalomaAroma  → containers palomaaroma_*  → porta 8012
```

### Regras de ouro — JAMAIS violar:
1. **Escola ≠ Loja** — código educacional nunca vai para loja, código de loja nunca vai para escola
2. **Loja ≠ Loja** — VivaModa, ViviBoutique e PalomaAroma são sistemas separados, cada uma tem banco, código e deploy próprios
3. **Banco separado** — cada loja tem seu próprio PostgreSQL, sem compartilhamento
4. **Deploy separado** — ao fazer deploy de uma loja, NUNCA reiniciar containers de outra loja ou do sistema educacional

---

## SISTEMA 1 — Plataforma Educacional ITA

### Quem é quem

**ITA Tecnologia Educacional** — empresa dona da plataforma
- Domínio: `itatecnologiaeducacional.tech`
- Perfil no sistema: `ita_admin`
- Acesso global a todas as escolas

**CEITEC** — escola contratante (a única em uso no momento)
- NÃO é superusuário, é cliente como qualquer escola
- Coordenador vê APENAS dados do CEITEC
- Endereço físico: Av. Manoel Alves de Freitas, 130, Bairro Maranhão, Itapipoca-CE

### Arquitetura técnica

```
Plataforma ITA (containers app-*)
│
├── app-react-1   → Frontend React + Vite (porta 3000 interna)
├── app-node-1    → Backend Node.js + Express + Socket.io (porta 3001)
├── app-django-1  → Corretor de Provas Django (porta 8000)
├── app-mestre-1  → Instância mestre
├── app-nginx-1   → Proxy reverso (portas 80/443 externas)
└── app-db-1      → PostgreSQL compartilhado do sistema educacional
```

### Stack técnica

- **Frontend**: React + Vite + Tailwind CSS
- **Backend principal**: Node.js + Express + Socket.io + PostgreSQL (Neon DB em produção)
- **Corretor de Provas**: Django (ÚNICO módulo em Django — não criar Django em outros lugares)
- **Autenticação**: JWT + link mágico (SSO)
- **Roteamento Nginx**: `/node-api/` → Node.js | `/api/` → Django | `/pwa/` → Node.js estático
- **VITE_API_URL**: `/node-api` (hardcoded no Dockerfile do React)

### Módulos implementados

```
/dashboard              → Dashboard Geral
/scanner/               → Scanner de Presença
/almoco/scanner/        → Scanner de Almoço
/almoco/relatorio/      → Relatório de Almoço
/avaliacoes/            → Avaliações da Plataforma
/quiz/                  → Quiz Interativo
/desempenho/            → Desempenho Acadêmico
/diagnostico/           → Diagnóstico por Disciplina
/ocorrencias/           → Ocorrências
/itagame/               → ItagGame
/corretor-resultados/   → Resultados Corretor de Provas
/sala-maker/            → Sala Maker
/curso-ferias/          → Curso de Férias Maker
/mobile-tracker/        → GPS Tracker de Alunos (novo)
/pwa/tracker/           → PWA do aluno para GPS (público)
/relatorios/            → Relatórios Gerais
/usuarios/              → Gerenciar Usuários
/turmas/                → Turmas e Alunos
/professores/           → Professores
```

### Hierarquia de perfis

```
ita_admin   → acesso total, todas as escolas
coordenador → acesso total à própria escola
professor   → somente leitura nas suas turmas
secretaria  → acesso intermediário
```

**Professor NUNCA pode:**
- Criar/editar/excluir turmas ou alunos
- Ver dados de outras turmas ou escolas
- Acessar configurações da escola
- Editar XP no ItagGame
- Ver localização GPS dos alunos (Mobile Tracker)

### Corretor de Provas (Django — regras especiais)

- É o ÚNICO módulo em Django — não replicar esse padrão
- Autenticação via link mágico SSO do CEITEC ID
- EscolaMixin obrigatório em todas as views
- Decorators: `@requer_ita_admin`, `@requer_coordenador`, `@requer_professor`
- PIN de aluno: sempre SHA256, nunca texto puro

### Mobile Tracker GPS (módulo novo)

- PWA instalável no Android Chrome
- Rastreia alunos 06h–18h, segunda a sexta
- Coordenadas CEITEC: lat `-3.4844572`, lng `-3.9868931` (Av. Manoel Alves de Freitas, 130)
- Satélite via Esri WorldImagery (gratuito, sem chave)
- Professor NÃO tem acesso ao tracker
- Dados coletados somente com consentimento aceito

### Checklist antes de implementar no Sistema 1

- [ ] Confirmar que não estou misturando com o sistema de lojas
- [ ] Verificar se é Node.js ou Django (Node = regra geral, Django = só Corretor)
- [ ] Aplicar isolamento por `escola_id` em toda query
- [ ] Usar autenticação JWT existente (não criar login próprio)
- [ ] Comentar código em português brasileiro

---

## SISTEMA 2 — Sistema de Lojas

### Visão geral

Três lojas independentes hospedadas no mesmo VPS, cada uma com infraestrutura completamente separada.

```
LOJA 1 — VivaModa
  Domínio:    vivimoda.itatecnologiaeducacional.tech
  Porta:      8010
  Containers: vivimoda_web, vivimoda_db, vivimoda_redis, vivimoda_celery, vivimoda_beat

LOJA 2 — ViviBoutique
  Domínio:    viviboutique.itatecnologiaeducacional.tech
  Porta:      8011
  Containers: viviboutique_web, viviboutique_db, viviboutique_redis, viviboutique_celery, viviboutique_beat

LOJA 3 — PalomaAroma
  Domínio:    palomaaroma.itatecnologiaeducacional.tech
  Porta:      8012
  Containers: palomaaroma_web, palomaaroma_db, palomaaroma_redis, palomaaroma_celery, palomaaroma_beat
```

### Stack das lojas

- **Backend**: Django + Celery + Redis
- **Banco**: PostgreSQL próprio por loja (container `_db` de cada uma)
- **Cache/filas**: Redis próprio por loja (container `_redis` de cada uma)
- **Tarefas agendadas**: Celery Beat próprio por loja (container `_beat`)
- **Workers**: Celery worker próprio por loja (container `_celery`)

### Regras absolutas para as lojas

1. Ao trabalhar em VivaModa → mexer SOMENTE nos containers `vivimoda_*`
2. Ao trabalhar em ViviBoutique → mexer SOMENTE nos containers `viviboutique_*`
3. Ao trabalhar em PalomaAroma → mexer SOMENTE nos containers `palomaaroma_*`
4. NUNCA copiar dados, migrations ou configurações entre lojas
5. NUNCA reiniciar containers de loja diferente da que está sendo trabalhada
6. Cada loja tem seu próprio `docker-compose.yml` ou seção separada no compose

### Checklist antes de implementar no Sistema 2

- [ ] Confirmar em qual loja estou trabalhando (VivaModa / ViviBoutique / PalomaAroma)
- [ ] Confirmar que só vou tocar nos containers daquela loja
- [ ] Confirmar que não vou mexer no sistema educacional (app-*)
- [ ] Verificar se a migration é só para aquela loja
- [ ] Testar apenas no domínio daquela loja

---

## Infraestrutura compartilhada do VPS

O que é compartilhado entre os dois sistemas (apenas isso):
- **Máquina física**: Hostinger KVM VPS (Ubuntu 22.04)
- **IP público**: 2.24.73.137
- **Nginx**: um único processo que roteia para cada sistema/loja pelo domínio
- **Certbot/SSL**: certificados independentes por domínio
- **Cloudflare**: DNS e CDN de todos os domínios

O que NÃO é compartilhado (cada sistema tem o seu):
- Banco de dados (PostgreSQL separado por sistema/loja)
- Código-fonte
- Deploy (cada sistema tem seu próprio fluxo de build/restart)

---

## Erros comuns que JAMAIS devem acontecer

❌ Fazer deploy de uma loja e reiniciar `app-node-1` (são sistemas diferentes)
❌ Copiar migration de ViviBoutique para PalomaAroma
❌ Usar o banco do CEITEC para armazenar dados de loja
❌ Criar rota `/api/produtos` no Node.js do sistema educacional
❌ Tratar o CEITEC como dono da plataforma (ele é escola contratante)
❌ Usar `ita_admin` em código de loja
❌ Assumir que toda a plataforma ITA é Django — só o Corretor é Django
❌ Salvar PIN de aluno em texto puro — sempre SHA256

---

## Padrão de entrega (qualquer sistema)

Ao finalizar qualquer implementação:
1. Listar arquivos criados/modificados com o sistema ao qual pertencem
2. Confirmar que o outro sistema não foi afetado
3. Listar URLs ou endpoints adicionados
4. Confirmar que nenhuma funcionalidade existente quebrou
5. Todo código comentado em português brasileiro
