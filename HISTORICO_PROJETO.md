# Histórico do Projeto — CEITEC ID SYSTEM / Plataforma ITA

> Arquivo de registro contínuo. Atualizado a cada sessão de trabalho importante,
> para que o contexto do projeto nunca dependa só do histórico de conversa do chat.

---

## 📌 Arquitetura (regra absoluta)

Tudo roda na plataforma ITA: `itatecnologiaeducacional.tech` (VPS Hostinger, IP `2.24.73.137`).

- Frontend: React + Vite (SPA)
- Backend: Node.js (Express) — container `app-node-1` no VPS
- Banco: PostgreSQL (Neon DB)
- Servidor web: Nginx + Docker Compose
- Deploy: `git push` → SSH no VPS → `docker compose up`

**Exceções (sistemas separados, NÃO fazem parte do VPS principal):**
- **ItagGame** (gamificação de matemática) — Django + SQLite, hospedado em `projetoitagame.pythonanywhere.com`
- **Corretor de Provas Online** — Django + PostgreSQL, hospedado em `correcaoonlineita.pythonanywhere.com`

### Deploy obrigatório após qualquer mudança na ITA
```bash
git add . && git commit -m "descrição" && git push origin main
ssh root@2.24.73.137 "cd /app && git pull origin main && docker compose build react node && docker compose up -d && echo OK"
```
⚠️ `docker compose restart` NÃO atualiza o código — sempre `build` + `up -d`.

### Chave secreta SSO (link mágico)
`gamificaedu_secreto_2026`

---

## ⛔ Áreas protegidas — nunca recriar, só corrigir

| App / Arquivo | O que é |
|---|---|
| `plataforma/inscricoes/` | Inscrições do Curso de Férias (Mercado Pago, email, certificado, presença) |
| `plataforma/corretor/` | Corretor de provas online completo |
| `frontend/src/pages/CorretorResultados.jsx` | Aba "Resultados Corretor de Provas" na Navbar |

**Motivo:** em jun/2026 o app `inscricoes` já estava pronto e foi recriado do zero por engano em vez de corrigir um erro simples (502 Django), desperdiçando horas de trabalho.

---

## 🗂️ Estado atual por área

### Área Pedagógica (Dashboard CEITEC)
- Implementada: Avaliações, Desempenho, Diagnóstico (IA), Relatórios
- Dados demo no Neon DB (escola_id=192, professor_id=139): 3 avaliações, 30 notas, 300 respostas
- `ResultadosAvaliacao.jsx` mostra mini-grid colorido de acerto/erro por questão
- Proxy `backend/routes/corretor.js` puxa resultados reais do PythonAnywhere (Corretor) via chave mágica
- Página `CorretorResultados.jsx` (rota `/corretor-resultados`) mostra resultados reais agrupados por avaliação

### Curso de Férias
- Alunos inscritos são **externos** — não são alunos da plataforma/CEITEC, não entram em turmas, não têm acesso ao ItagGame/portal
- Painel de inscrições (`/inscricao/painel/`) só para `ita_admin` (Genezio)
- Landing page com promoção 50% OFF para os primeiros 30 inscritos (R$ 99,90) — commits recentes

### ItagGame — regras do professor
Professor **pode**: ver painel, criar provas (manual/IA), criar missões, enviar recados, ver materiais e rankings.
Professor **não pode**: criar turmas, criar/importar alunos, adicionar produtos na lojinha (essas ações exigem `is_superuser`).
Cap de XP: máximo 5000 XP/dia por aluno, todas as fontes somadas.

### WhatsApp Business Cloud API (Meta oficial)
- App Meta: ItaCeitecgameEdu (ID 1910959192952867), portfólio ITA Tecnologia Educacional, publicado
- Número de teste configurado (token expira em 24h)
- Próximos passos: configurar número real (5588988411890) como produção, verificação da empresa, gerar token permanente (System User)
- Motivo da migração: WhatsApp bloqueou conexão Baileys (erro 405)

### Infraestrutura / DNS
- VPS: IP `2.24.73.137`, hostname `srv1644397.hstgr.cloud`, Ubuntu 22.04, Docker Manager ativo
- Domínio `itatecnologiaeducacional.tech` gerenciado na Hostinger
- Pendência em aberto: revisar registro DNS `AAAA` (pode estar apontando IP errado, não o do VPS)

---

## ✅ Preferências e regras de trabalho do Genezio

- **Não é programador** — explicações devem ser simples e diretas, sem jargão desnecessário
- **Testar sempre primeiro no perfil `ita_admin`** (o próprio Genezio) antes de liberar qualquer novidade para coordenador/professor/escola
- **Nunca recriar apps existentes** — sempre procurar o que já existe e corrigir
- **Deploy obrigatório** (commit + push + build/up no VPS) depois de qualquer alteração, sem precisar que ele peça
- Backend Node.js só existe no VPS — nunca procurar os `.js` do backend localmente, editar sempre via SSH no container `app-node-1`
- Manter esta conversa como sessão fixa e contínua do projeto ("ceitec id sistem"), sem abrir sessões novas

---

## 📅 Log de sessões

### 2026-07-12
- Usuário relatou que o histórico da conversa sumiu. Não foram encontradas outras sessões (ativas ou arquivadas) associadas a este projeto no gerenciador de sessões.
- Confirmado que a memória persistente (arquivos de contexto) permaneceu intacta — nada de essencial foi perdido.
- Criado este arquivo `HISTORICO_PROJETO.md` para manter um registro visível e versionado (via git) do estado do projeto, como camada extra de segurança além da memória automática.
