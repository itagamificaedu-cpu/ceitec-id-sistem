# CEITEC ID SYSTEM — Contexto do Projeto

## O que é este projeto
Central de identidade e autenticação unificada do ecossistema CEITEC.
Responsável pelo SSO (Single Sign-On) entre todas as plataformas educacionais,
gerenciamento de usuários, assinaturas de escolas e controle de acesso.

Desenvolvido por: Genezio — Professor de Robótica, Cultura Maker e Empreendedorismo Digital
Instituição: CEITEC — Centro Educacional de Inovação e Tecnologia, Itapipoca/CE
Email: itagamificaedu@gmail.com

---

## ⚠️ STACK REAL — NÃO É DJANGO

**A plataforma ITA (itatecnologiaeducacional.tech) NÃO é Django.**
Django existe APENAS no Corretor de Provas (projeto separado no mesmo VPS).

| Camada | Tecnologia |
|--------|------------|
| Frontend | React + Vite (SPA) |
| Backend principal | Node.js (Express) — container `app-node-1` no VPS |
| Corretor de Provas | Django (projeto SEPARADO) |
| Bolão da Copa | Python `http.server` puro — `/home/genez/bolao/app.py` |
| Banco de dados | PostgreSQL (Neon DB) |
| Servidor web | Nginx + Docker (compose) |
| Deploy | git push → SSH no VPS → `docker compose up` |

**NUNCA assumir que um módulo é Django sem verificar o código-fonte primeiro.**

## Infraestrutura / Hospedagem

- **Servidor:** VPS Hostinger — IP `2.24.73.137`, Ubuntu 22.04
- **Domínio:** itatecnologiaeducacional.tech
- **Servidor web:** Nginx + Docker Compose
- **Deploy:** direto no VPS via SSH + git pull
- **Variáveis de ambiente:** arquivo `.env` na raiz do projeto

---

## Plataformas do Ecossistema (todas no mesmo VPS)

| Plataforma     | Função                                           | Status SSO |
|----------------|--------------------------------------------------|------------|
| ItagGame       | Gamificação e correção de provas online (Django) | Integrar   |
| GamificaEdu    | SaaS de gamificação educacional                  | Integrar   |
| ItaMakerShop   | Loja de impressão 3D e corte a laser             | Futuro     |
| Clube Robótica | Clube de Robótica Criativa de Itapipoca          | Futuro     |

---

## Funcionalidades Principais

### Autenticação Central (SSO)
- Login único para todas as plataformas do ecossistema
- Token JWT compartilhado entre ItagGame e GamificaEdu
- Logout unificado

### Gerenciamento de Usuários
- Cadastro de alunos, professores e administradores
- Perfis por plataforma
- Recuperação de senha centralizada

### Gerenciamento de Escolas / Assinaturas
- Cadastro de escolas clientes (para GamificaEdu SaaS)
- Controle de planos e vencimento de assinaturas
- Painel administrativo do CEITEC

### Painel Central (Dashboard)
- Acesso rápido a todas as plataformas conectadas
- Notificações unificadas

---

## Arquitetura de Integração

```
CEITEC ID SYSTEM (central) — VPS Hostinger
        │
        ├── JWT Token ──► ItagGame (Django) — mesmo VPS
        │
        └── JWT Token ──► GamificaEdu (Django) — mesmo VPS
```

---

## Estrutura de Pastas do Projeto

```
/var/www/ceitec-id-system/
├── CLAUDE.md
├── .env                    ← variáveis de ambiente (nunca commitar)
├── manage.py
├── requirements.txt
├── core/                   ← settings, urls, wsgi
├── usuarios/               ← cadastro, login, perfis, SSO/JWT
├── escolas/                ← assinaturas, planos, clientes
├── dashboard/              ← painel central do usuário
├── api/                    ← endpoints REST para plataformas filhas
└── templates/
    └── ceitec/
```

---

## Padrões e Convenções

- Código e comentários em **português**
- Variáveis sensíveis sempre no `.env`, nunca no código
- Integração com plataformas filhas via **API REST com JWT**
- Sempre gerar código **completo e funcional**, nunca apenas trechos
- Explicar o que cada comando faz antes de executar
- Genezio **não é programador** — instruções devem ser simples e diretas

---

## Comandos úteis no VPS (referência rápida)

```bash
# Ativar ambiente virtual
source /var/www/ceitec-id-system/venv/bin/activate

# Aplicar migrações
python manage.py migrate

# Reiniciar serviço após alterações
sudo systemctl restart gunicorn-ceitec
sudo systemctl restart nginx

# Ver logs de erro
sudo journalctl -u gunicorn-ceitec -n 50
```

---

## Status Atual do Projeto

- [ ] Repositório criado no VPS
- [ ] Ambiente virtual configurado
- [ ] Modelo de usuário central criado
- [ ] Autenticação básica funcionando
- [ ] JWT configurado
- [ ] SSO com ItagGame
- [ ] SSO com GamificaEdu
- [ ] Painel central (dashboard)
- [ ] Gerenciamento de escolas/assinaturas
- [ ] Nginx configurado para o domínio
