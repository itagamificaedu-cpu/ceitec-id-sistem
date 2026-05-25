# CEITEC ID SYSTEM

Sistema de Identificação Estudantil com carteirinha digital, QR Code e controle de presença.

## Pré-requisitos

- Node.js 18 ou superior

## Instalação

```bash
# 1. Instalar dependências
npm run install:all

# 2. Rodar em modo desenvolvimento
npm run dev
```

## Acesso

| Serviço  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173     |
| Backend  | http://localhost:3001/api |

## Credenciais Padrão

| Perfil      | Email                      | Senha      |
|-------------|----------------------------|------------|
| Admin       | admin@ceitec.com           | ceitec2024 |
| Secretaria  | secretaria@ceitec.com      | ceitec2024 |

## WhatsApp (Notificações de Falta)

Para ativar as notificações automáticas via WhatsApp:

```bash
# 1. Instalar o Chrome para Puppeteer (apenas uma vez)
cd backend
npx puppeteer browsers install chrome

# 2. Rodar o sistema normalmente
npm run dev

# 3. No terminal, escaneie o QR Code que aparecer com seu WhatsApp
# (WhatsApp → Aparelhos Conectados → Conectar um aparelho)
```

Após escanear, a sessão fica salva e não precisa escanear novamente.

## Módulos do Sistema

| Módulo          | URL                      | Descrição                              |
|-----------------|--------------------------|----------------------------------------|
| Dashboard       | /dashboard               | Visão geral e métricas do dia          |
| Alunos          | /alunos                  | Lista de alunos cadastrados            |
| Cadastro        | /alunos/novo             | Cadastrar novo aluno                   |
| Carteirinha     | /alunos/:id/carteirinha  | Carteirinha com QR Code (PDF/Imprimir) |
| Scanner         | /scanner                 | Leitura de QR Code para presença       |
| Relatórios      | /relatorios              | Frequência por turma ou por aluno      |
| Justificativas  | /justificativas          | Gerenciar justificativas de falta      |

## Rotas da API

| Método | Rota                              | Descrição                        |
|--------|-----------------------------------|----------------------------------|
| POST   | /api/auth/login                   | Login                            |
| GET    | /api/alunos                       | Listar alunos                    |
| POST   | /api/alunos                       | Cadastrar aluno                  |
| GET    | /api/alunos/:id                   | Buscar aluno por ID              |
| PUT    | /api/alunos/:id                   | Editar aluno                     |
| DELETE | /api/alunos/:id                   | Desativar aluno                  |
| POST   | /api/alunos/:id/foto              | Upload de foto                   |
| GET    | /api/alunos/:id/qrcode            | Gerar QR Code                    |
| POST   | /api/presenca/scanner             | Registrar presença via QR Code   |
| POST   | /api/presenca/manual              | Lançamento manual de presença    |
| GET    | /api/presenca/hoje/:turma         | Presenças do dia por turma       |
| GET    | /api/relatorios/dashboard         | Dados do dashboard               |
| GET    | /api/relatorios/turma             | Relatório por turma e data       |
| GET    | /api/relatorios/aluno/:id         | Relatório por aluno e mês        |
| GET    | /api/relatorios/frequencia-semanal| Frequência dos últimos 7 dias    |
| POST   | /api/justificativas               | Adicionar justificativa          |
| GET    | /api/justificativas/pendentes     | Faltas sem justificativa         |
| GET    | /api/justificativas/aluno/:id     | Justificativas por aluno         |
| PUT    | /api/justificativas/:id           | Atualizar justificativa          |

## Estrutura do Projeto

```
ceitec-id-system/
├── backend/
│   ├── server.js          # Servidor Express + Socket.IO
│   ├── database.js        # SQLite com better-sqlite3
│   ├── whatsapp.js        # Integração WhatsApp Web
│   ├── middleware/auth.js # Autenticação JWT
│   ├── routes/
│   │   ├── auth.js
│   │   ├── alunos.js
│   │   ├── presenca.js
│   │   ├── relatorios.js
│   │   └── justificativas.js
│   └── uploads/           # Fotos e arquivos
├── frontend/
│   └── src/
│       ├── pages/         # Login, Dashboard, Alunos, Scanner...
│       ├── components/    # Navbar, CardAluno, GraficoFrequencia
│       ├── App.jsx        # Rotas React Router
│       └── api.js         # Axios configurado
├── package.json           # Scripts raiz (concurrently)
└── .env.example
```
