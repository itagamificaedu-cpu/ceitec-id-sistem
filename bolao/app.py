import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from random import choice
from urllib.parse import parse_qs, quote, urlparse


BASE_DIR = Path(__file__).resolve().parent
# Suporta caminho do banco via variável de ambiente (para Docker/VPS)
_db_env = os.environ.get("DB_PATH")
DB_PATH = Path(_db_env) if _db_env else BASE_DIR / "bolao.sqlite3"
STATIC_DIR = BASE_DIR / "static"
BRT = timezone(timedelta(hours=-3))
VAPID_PUBLIC_KEY = "SUBSTITUA_PELA_CHAVE_PUBLICA_VAPID"


def agora_brasilia():
    """Retorna o horário atual no fuso de Brasília."""
    return datetime.now(BRT)


def iso_agora():
    """Retorna data/hora ISO em Brasília para registros do banco."""
    return agora_brasilia().isoformat(timespec="seconds")


def conectar():
    """Abre conexão SQLite com linhas acessíveis por nome."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def executar(sql, params=()):
    """Executa um comando de escrita e confirma a transação."""
    with conectar() as conn:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur


def consultar(sql, params=()):
    """Executa consulta e retorna lista de dicionários."""
    with conectar() as conn:
        return [dict(row) for row in conn.execute(sql, params).fetchall()]


def consultar_um(sql, params=()):
    """Executa consulta e retorna um dicionário ou None."""
    with conectar() as conn:
        row = conn.execute(sql, params).fetchone()
        return dict(row) if row else None


def criar_banco():
    """Cria tabelas do Bolão e dados locais mínimos para demonstração."""
    with conectar() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS escolas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                perfil TEXT NOT NULL CHECK (perfil IN ('aluno', 'professor', 'coordenador', 'ita_admin')),
                escola_id INTEGER NOT NULL,
                FOREIGN KEY (escola_id) REFERENCES escolas(id)
            );

            CREATE TABLE IF NOT EXISTS sessoes (
                token TEXT PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                criado_em TEXT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            );

            CREATE TABLE IF NOT EXISTS bolao_jogos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fase TEXT NOT NULL,
                time_casa TEXT NOT NULL,
                time_fora TEXT NOT NULL,
                bandeira_casa TEXT NOT NULL,
                bandeira_fora TEXT NOT NULL,
                data_hora_inicio TEXT NOT NULL,
                placar_real_casa INTEGER,
                placar_real_fora INTEGER,
                status TEXT NOT NULL CHECK (status IN ('aguardando', 'em_andamento', 'encerrado')),
                notificacao_enviada INTEGER NOT NULL DEFAULT 0,
                notificacao_inicio_enviada INTEGER NOT NULL DEFAULT 0,
                criado_em TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS bolao_palpites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jogo_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                escola_id INTEGER NOT NULL,
                palpite_casa INTEGER NOT NULL CHECK (palpite_casa BETWEEN 0 AND 20),
                palpite_fora INTEGER NOT NULL CHECK (palpite_fora BETWEEN 0 AND 20),
                acertou_placar INTEGER,
                sorteado_ganhador INTEGER NOT NULL DEFAULT 0,
                notificado_ganhador INTEGER NOT NULL DEFAULT 0,
                criado_em TEXT NOT NULL,
                UNIQUE (jogo_id, usuario_id),
                FOREIGN KEY (jogo_id) REFERENCES bolao_jogos(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
                FOREIGN KEY (escola_id) REFERENCES escolas(id)
            );

            CREATE TABLE IF NOT EXISTS bolao_sorteios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jogo_id INTEGER NOT NULL,
                ganhador_id INTEGER NOT NULL,
                realizado_em TEXT NOT NULL,
                realizado_por INTEGER NOT NULL,
                FOREIGN KEY (jogo_id) REFERENCES bolao_jogos(id),
                FOREIGN KEY (ganhador_id) REFERENCES bolao_palpites(id),
                FOREIGN KEY (realizado_por) REFERENCES usuarios(id)
            );

            CREATE TABLE IF NOT EXISTS bolao_push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                criado_em TEXT NOT NULL,
                UNIQUE (usuario_id, endpoint),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            );

            CREATE TABLE IF NOT EXISTS bolao_notificacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                titulo TEXT NOT NULL,
                corpo TEXT NOT NULL,
                url TEXT NOT NULL,
                criado_em TEXT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            );
            """
        )
        conn.commit()

    if not consultar_um("SELECT id FROM escolas LIMIT 1"):
        executar("INSERT INTO escolas (nome) VALUES (?)", ("CEITEC Itapipoca",))
        executar("INSERT INTO escolas (nome) VALUES (?)", ("Escola Parceira",))

    if not consultar_um("SELECT id FROM usuarios LIMIT 1"):
        usuarios = [
            ("Genezio Professor", "genezio@ceitec.local", "ita_admin", 1),
            ("Ana Aluna", "ana@ceitec.local", "aluno", 1),
            ("Carlos Professor", "carlos@parceira.local", "professor", 2),
            ("Marina Coordenadora", "marina@ceitec.local", "coordenador", 1),
        ]
        for usuario in usuarios:
            executar(
                "INSERT INTO usuarios (nome, email, perfil, escola_id) VALUES (?, ?, ?, ?)",
                usuario,
            )

    if not consultar_um("SELECT id FROM bolao_jogos LIMIT 1"):
        seed_jogos()
    else:
        sincronizar_jogos()


JOGOS_COPA_2026 = [
    # 13 jun
    ("Fase de Grupos - Grupo B", "Qatar",            "Suíça",          "🇶🇦", "🇨🇭", "2026-06-13T16:00:00-03:00"),
    ("Fase de Grupos - Grupo C", "Brasil",           "Marrocos",       "🇧🇷", "🇲🇦", "2026-06-13T19:00:00-03:00"),
    ("Fase de Grupos - Grupo C", "Haiti",            "Escócia",        "🇭🇹", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "2026-06-13T22:00:00-03:00"),
    ("Fase de Grupos - Grupo D", "Austrália",        "Turquia",        "🇦🇺", "🇹🇷", "2026-06-14T01:00:00-03:00"),
    # 14 jun
    ("Fase de Grupos - Grupo E", "Alemanha",         "Curaçao",        "🇩🇪", "🇨🇼", "2026-06-14T14:00:00-03:00"),
    ("Fase de Grupos - Grupo F", "Holanda",          "Japão",          "🇳🇱", "🇯🇵", "2026-06-14T17:00:00-03:00"),
    ("Fase de Grupos - Grupo E", "Costa do Marfim",  "Equador",        "🇨🇮", "🇪🇨", "2026-06-14T20:00:00-03:00"),
    ("Fase de Grupos - Grupo F", "Suécia",           "Tunísia",        "🇸🇪", "🇹🇳", "2026-06-14T23:00:00-03:00"),
    # 15 jun
    ("Fase de Grupos - Grupo G", "EUA",              "Panamá",         "🇺🇸", "🇵🇦", "2026-06-15T14:00:00-03:00"),
    ("Fase de Grupos - Grupo H", "Argentina",        "Albânia",        "🇦🇷", "🇦🇱", "2026-06-15T17:00:00-03:00"),
    ("Fase de Grupos - Grupo G", "México",           "Nova Zelândia",  "🇲🇽", "🇳🇿", "2026-06-15T20:00:00-03:00"),
    ("Fase de Grupos - Grupo H", "Iraque",           "Ucrânia",        "🇮🇶", "🇺🇦", "2026-06-15T23:00:00-03:00"),
    # 16 jun
    ("Fase de Grupos - Grupo A", "Espanha",          "Bangladesh",     "🇪🇸", "🇧🇩", "2026-06-16T14:00:00-03:00"),
    ("Fase de Grupos - Grupo B", "Canadá",           "Venezuela",      "🇨🇦", "🇻🇪", "2026-06-16T17:00:00-03:00"),
    ("Fase de Grupos - Grupo A", "Portugal",         "África do Sul",  "🇵🇹", "🇿🇦", "2026-06-16T20:00:00-03:00"),
    ("Fase de Grupos - Grupo B", "Suíça",            "Arábia Saudita", "🇨🇭", "🇸🇦", "2026-06-16T23:00:00-03:00"),
]


def seed_jogos():
    """Insere os jogos iniciais do banco (apenas quando vazio)."""
    for fase, casa, fora, bandeira_casa, bandeira_fora, inicio in JOGOS_COPA_2026:
        executar(
            """
            INSERT INTO bolao_jogos
            (fase, time_casa, time_fora, bandeira_casa, bandeira_fora, data_hora_inicio, status, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, 'aguardando', ?)
            """,
            (fase, casa, fora, bandeira_casa, bandeira_fora, inicio, iso_agora()),
        )


def sincronizar_jogos():
    """Adiciona jogos novos sem apagar os existentes (idempotente)."""
    for fase, casa, fora, bandeira_casa, bandeira_fora, inicio in JOGOS_COPA_2026:
        existe = consultar_um(
            "SELECT id FROM bolao_jogos WHERE time_casa = ? AND time_fora = ? AND data_hora_inicio = ?",
            (casa, fora, inicio),
        )
        if not existe:
            executar(
                """
                INSERT INTO bolao_jogos
                (fase, time_casa, time_fora, bandeira_casa, bandeira_fora, data_hora_inicio, status, criado_em)
                VALUES (?, ?, ?, ?, ?, ?, 'aguardando', ?)
                """,
                (fase, casa, fora, bandeira_casa, bandeira_fora, inicio, iso_agora()),
            )


def usuario_por_token(token):
    """Localiza o usuário autenticado pela sessão HTTP."""
    if not token:
        return None
    return consultar_um(
        """
        SELECT u.*, e.nome AS escola_nome
        FROM sessoes s
        JOIN usuarios u ON u.id = s.usuario_id
        JOIN escolas e ON e.id = u.escola_id
        WHERE s.token = ?
        """,
        (token,),
    )


def criar_sessao(usuario_id):
    """Cria uma sessão local simulando o retorno do CEITEC ID."""
    token = secrets.token_urlsafe(32)
    executar(
        "INSERT INTO sessoes (token, usuario_id, criado_em) VALUES (?, ?, ?)",
        (token, usuario_id, iso_agora()),
    )
    return token


def registrar_notificacao(usuario_id, titulo, corpo, url="/bolao/"):
    """Registra uma notificação para auditoria local."""
    executar(
        "INSERT INTO bolao_notificacoes (usuario_id, titulo, corpo, url, criado_em) VALUES (?, ?, ?, ?, ?)",
        (usuario_id, titulo, corpo, url, iso_agora()),
    )


def data_inicio(jogo):
    """Converte a data ISO do jogo para datetime com fuso."""
    return datetime.fromisoformat(jogo["data_hora_inicio"])


def atualizar_status_automatico():
    """Atualiza jogos iniciados e registra notificações de início."""
    agora = agora_brasilia()
    jogos = consultar("SELECT * FROM bolao_jogos WHERE status != 'encerrado'")
    for jogo in jogos:
        inicio = data_inicio(jogo)
        if jogo["status"] == "aguardando" and inicio <= agora:
            executar("UPDATE bolao_jogos SET status = 'em_andamento' WHERE id = ?", (jogo["id"],))
            registrar_notificacao(
                None,
                f"AO VIVO: {jogo['time_casa']} x {jogo['time_fora']} começou!",
                "Palpites encerrados. Boa sorte!",
            )
        if (
            jogo["notificacao_enviada"] == 0
            and timedelta(minutes=0) <= inicio - agora <= timedelta(minutes=30)
        ):
            registrar_notificacao(
                None,
                f"{jogo['time_casa']} x {jogo['time_fora']} começa em 30min!",
                "Já fez seu palpite no Bolão da Copa?",
            )
            executar("UPDATE bolao_jogos SET notificacao_enviada = 1 WHERE id = ?", (jogo["id"],))


def montar_jogo(jogo, usuario):
    """Monta um jogo com dados do palpite do usuário e contagem total."""
    meu_palpite = None
    if usuario:
        meu_palpite = consultar_um(
            "SELECT * FROM bolao_palpites WHERE jogo_id = ? AND usuario_id = ?",
            (jogo["id"], usuario["id"]),
        )
    total = consultar_um("SELECT COUNT(*) AS total FROM bolao_palpites WHERE jogo_id = ?", (jogo["id"],))
    jogo["meu_palpite"] = meu_palpite
    jogo["total_palpites"] = total["total"]
    return jogo


def listar_jogos(usuario):
    """Lista jogos abertos/futuros primeiro e encerrados no final."""
    atualizar_status_automatico()
    jogos = consultar(
        """
        SELECT * FROM bolao_jogos
        ORDER BY
            CASE status WHEN 'encerrado' THEN 2 WHEN 'em_andamento' THEN 1 ELSE 0 END,
            data_hora_inicio ASC
        """
    )
    return [montar_jogo(jogo, usuario) for jogo in jogos]


def salvar_palpite(usuario, payload):
    """Valida e salva um único palpite por usuário e por jogo."""
    jogo_id = int(payload.get("jogo_id", 0))
    casa = int(payload.get("palpite_casa", -1))
    fora = int(payload.get("palpite_fora", -1))
    if casa < 0 or casa > 20 or fora < 0 or fora > 20:
        raise ValueError("O placar deve estar entre 0 e 20.")
    jogo = consultar_um("SELECT * FROM bolao_jogos WHERE id = ?", (jogo_id,))
    if not jogo:
        raise ValueError("Jogo não encontrado.")
    if data_inicio(jogo) <= agora_brasilia() or jogo["status"] != "aguardando":
        raise ValueError("Este jogo já começou. Palpites encerrados.")
    try:
        executar(
            """
            INSERT INTO bolao_palpites
            (jogo_id, usuario_id, escola_id, palpite_casa, palpite_fora, criado_em)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (jogo_id, usuario["id"], usuario["escola_id"], casa, fora, iso_agora()),
        )
    except sqlite3.IntegrityError as exc:
        raise ValueError("Você já enviou um palpite para este jogo.") from exc
    return consultar_um(
        "SELECT * FROM bolao_palpites WHERE jogo_id = ? AND usuario_id = ?",
        (jogo_id, usuario["id"]),
    )


def salvar_resultado(usuario, payload):
    """Registra o placar real e calcula quem acertou o resultado exato."""
    jogo_id = int(payload.get("jogo_id", 0))
    casa = int(payload.get("placar_real_casa", -1))
    fora = int(payload.get("placar_real_fora", -1))
    if casa < 0 or casa > 20 or fora < 0 or fora > 20:
        raise ValueError("O resultado deve estar entre 0 e 20.")
    jogo = consultar_um("SELECT * FROM bolao_jogos WHERE id = ?", (jogo_id,))
    if not jogo:
        raise ValueError("Jogo não encontrado.")
    executar(
        """
        UPDATE bolao_jogos
        SET placar_real_casa = ?, placar_real_fora = ?, status = 'encerrado'
        WHERE id = ?
        """,
        (casa, fora, jogo_id),
    )
    executar(
        """
        UPDATE bolao_palpites
        SET acertou_placar = CASE
            WHEN palpite_casa = ? AND palpite_fora = ? THEN 1
            ELSE 0
        END
        WHERE jogo_id = ?
        """,
        (casa, fora, jogo_id),
    )
    acertadores = consultar_um(
        "SELECT COUNT(*) AS total FROM bolao_palpites WHERE jogo_id = ? AND acertou_placar = 1",
        (jogo_id,),
    )
    registrar_notificacao(
        None,
        f"Resultado: {jogo['time_casa']} {casa} x {fora} {jogo['time_fora']}",
        "Confira no Bolão da Copa se você acertou!",
    )
    return {"total_acertadores": acertadores["total"]}


def realizar_sorteio(usuario, jogo_id):
    """Sorteia um ganhador entre os palpites que acertaram o placar exato."""
    jogo = consultar_um("SELECT * FROM bolao_jogos WHERE id = ?", (jogo_id,))
    if not jogo:
        raise ValueError("Jogo não encontrado.")
    existente = consultar_um("SELECT id FROM bolao_sorteios WHERE jogo_id = ?", (jogo_id,))
    if existente:
        raise ValueError("Este jogo já teve sorteio realizado.")
    acertadores = consultar(
        """
        SELECT p.*, u.nome, e.nome AS escola
        FROM bolao_palpites p
        JOIN usuarios u ON u.id = p.usuario_id
        JOIN escolas e ON e.id = p.escola_id
        WHERE p.jogo_id = ? AND p.acertou_placar = 1
        """,
        (jogo_id,),
    )
    if not acertadores:
        return {"status": "nenhum_acerto", "mensagem": "Ninguém acertou o placar exato neste jogo"}
    ganhador = acertadores[0] if len(acertadores) == 1 else choice(acertadores)
    executar(
        """
        INSERT INTO bolao_sorteios (jogo_id, ganhador_id, realizado_em, realizado_por)
        VALUES (?, ?, ?, ?)
        """,
        (jogo_id, ganhador["id"], iso_agora(), usuario["id"]),
    )
    executar("UPDATE bolao_palpites SET sorteado_ganhador = 1, notificado_ganhador = 1 WHERE id = ?", (ganhador["id"],))
    registrar_notificacao(
        ganhador["usuario_id"],
        "VOCÊ GANHOU NO BOLÃO DA COPA!",
        f"Parabéns! Você acertou {jogo['time_casa']} {jogo['placar_real_casa']} x {jogo['placar_real_fora']} {jogo['time_fora']}. Retire seu brinde amanhã no CEITEC.",
    )
    return {
        "status": "sorteado",
        "ganhador": {
            "nome": ganhador["nome"],
            "escola": ganhador["escola"],
            "palpite": f"{ganhador['palpite_casa']}x{ganhador['palpite_fora']}",
        },
        "total_acertadores": len(acertadores),
    }


def dashboard_admin():
    """Retorna resumo administrativo dos jogos, acertadores e ranking."""
    jogos = consultar(
        """
        SELECT j.*,
               COUNT(p.id) AS total_palpites,
               SUM(CASE WHEN p.acertou_placar = 1 THEN 1 ELSE 0 END) AS total_acertadores
        FROM bolao_jogos j
        LEFT JOIN bolao_palpites p ON p.jogo_id = j.id
        GROUP BY j.id
        ORDER BY j.data_hora_inicio ASC
        """
    )
    ranking = consultar(
        """
        SELECT u.nome, e.nome AS escola, COUNT(p.id) AS acertos
        FROM bolao_palpites p
        JOIN usuarios u ON u.id = p.usuario_id
        JOIN escolas e ON e.id = p.escola_id
        WHERE p.acertou_placar = 1
        GROUP BY u.id
        ORDER BY acertos DESC, u.nome ASC
        LIMIT 20
        """
    )
    sorteios = consultar(
        """
        SELECT s.jogo_id, u.nome, e.nome AS escola, p.palpite_casa, p.palpite_fora
        FROM bolao_sorteios s
        JOIN bolao_palpites p ON p.id = s.ganhador_id
        JOIN usuarios u ON u.id = p.usuario_id
        JOIN escolas e ON e.id = p.escola_id
        """
    )
    # Busca todos os palpites individualmente para exibir no painel admin
    todos_palpites = consultar(
        """
        SELECT p.jogo_id, u.nome, e.nome AS escola,
               p.palpite_casa, p.palpite_fora, p.acertou_placar, p.sorteado_ganhador
        FROM bolao_palpites p
        JOIN usuarios u ON u.id = p.usuario_id
        JOIN escolas e ON e.id = p.escola_id
        ORDER BY u.nome ASC
        """
    )
    palpites_por_jogo = {}
    for row in todos_palpites:
        jid = row["jogo_id"]
        if jid not in palpites_por_jogo:
            palpites_por_jogo[jid] = []
        palpites_por_jogo[jid].append({
            "nome": row["nome"],
            "escola": row["escola"],
            "palpite_casa": row["palpite_casa"],
            "palpite_fora": row["palpite_fora"],
            "acertou_placar": bool(row["acertou_placar"]),
            "sorteado_ganhador": bool(row["sorteado_ganhador"]),
        })
    for jogo in jogos:
        jogo["palpites"] = palpites_por_jogo.get(jogo["id"], [])
    return {"jogos": jogos, "ranking": ranking, "sorteios": sorteios}


def pagina_base(titulo, usuario, conteudo, scripts=""):
    """Renderiza HTML base com identidade visual do CEITEC."""
    nome = usuario["nome"] if usuario else "Visitante"
    perfil = usuario["perfil"] if usuario else "sem acesso"
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{titulo}</title>
  <link rel="stylesheet" href="/static/bolao/styles.css?v=4">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/bolao/"><span class="brand-mark">CEITEC</span><span>Bolão da Copa 2026</span></a>
    <nav class="nav">
      <span>{nome} · {perfil}</span>
      {"<a href='/bolao/admin/'>Admin</a>" if usuario and usuario["perfil"] in ("ita_admin", "coordenador") else ""}
      {"<a href='/logout/'>Sair</a>" if usuario else "<a href='/login/'>Entrar</a>"}
    </nav>
  </header>
  {conteudo}
  {scripts}
</body>
</html>"""


def pagina_login(next_url="/bolao/"):
    """Tela de entrada local que representa o link mágico do CEITEC ID."""
    usuarios = consultar(
        """
        SELECT u.id, u.nome, u.email, u.perfil, e.nome AS escola
        FROM usuarios u
        JOIN escolas e ON e.id = u.escola_id
        ORDER BY u.id
        """
    )
    cards = "".join(
        f"""
        <form method="post" action="/auth/ceitec-magic/" class="login-card">
          <input type="hidden" name="usuario_id" value="{u['id']}">
          <input type="hidden" name="next" value="{next_url}">
          <strong>{u['nome']}</strong>
          <span>{u['email']}</span>
          <small>{u['perfil']} · {u['escola']}</small>
          <button type="submit">Entrar com CEITEC ID</button>
        </form>
        """
        for u in usuarios
    )
    return pagina_base(
        "CEITEC ID",
        None,
        f"""
        <main class="login-wrap">
          <section class="welcome">
            <h1>CEITEC ID</h1>
            <p>Ambiente local de desenvolvimento. Em produção, esta etapa deve usar o SSO real por link mágico.</p>
          </section>
          <section class="login-grid">{cards}</section>
        </main>
        """,
    )


def pagina_bolao(usuario):
    """Tela principal do usuário com os cards renderizados pelo JavaScript."""
    conteudo = """
    <main class="page">
      <section class="hero">
        <div>
          <span class="eyebrow">CEITEC Itapipoca</span>
          <h1>Bolão da Copa do Mundo 2026</h1>
          <p>Aposte no placar de cada jogo uma única vez antes da partida começar. Se acertar o placar exato, você concorre a um brinde.</p>
        </div>
      </section>
      <section class="notice">
        <strong>Como retirar o brinde:</strong> compareça ao CEITEC Itapipoca no dia seguinte ao jogo com seu nome.
        <span>Após confirmar seu palpite, não é possível alterar.</span>
      </section>
      <div class="tab-bar">
        <button class="tab-btn active" data-tab="palpites">PALPITES</button>
        <button class="tab-btn" data-tab="resultados">RESULTADOS</button>
      </div>
      <section id="jogos" class="games" aria-live="polite"></section>
      <section id="resultados-tab" class="games" style="display:none"></section>
    </main>
    """
    scripts = '<script src="/static/bolao/app.js?v=4"></script>'
    return pagina_base("Bolão da Copa 2026", usuario, conteudo, scripts)


def pagina_admin(usuario):
    """Tela administrativa para resultados, sorteios e ranking."""
    conteudo = """
    <main class="page">
      <section class="admin-head">
        <div>
          <span class="eyebrow">Painel ita_admin</span>
          <h1>Gerenciar Bolão da Copa</h1>
        </div>
        <button id="rodar-scheduler" class="secondary" type="button">Rodar agendamento</button>
      </section>
      <section id="admin-dashboard" class="admin-layout"></section>
    </main>
    """
    scripts = '<script src="/static/bolao/admin.js"></script>'
    return pagina_base("Admin Bolão", usuario, conteudo, scripts)


class App(BaseHTTPRequestHandler):
    """Servidor HTTP pequeno para o módulo Bolão da Copa."""

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def token(self):
        cookie = SimpleCookie(self.headers.get("Cookie"))
        return cookie.get("ceitec_session").value if cookie.get("ceitec_session") else None

    def usuario(self):
        return usuario_por_token(self.token())

    def enviar(self, status, corpo, tipo="text/html; charset=utf-8", headers=None):
        dados = corpo.encode("utf-8") if isinstance(corpo, str) else corpo
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(dados)))
        if headers:
            for chave, valor in headers.items():
                self.send_header(chave, valor)
        self.end_headers()
        self.wfile.write(dados)

    def redirecionar(self, url, cookie=None):
        headers = {"Location": url}
        if cookie:
            headers["Set-Cookie"] = cookie
        self.enviar(HTTPStatus.FOUND, b"", "text/plain", headers)

    def json(self, status, payload):
        self.enviar(status, json.dumps(payload, ensure_ascii=False), "application/json; charset=utf-8")

    def ler_body(self):
        tamanho = int(self.headers.get("Content-Length", "0"))
        dados = self.rfile.read(tamanho).decode("utf-8") if tamanho else ""
        if "application/json" in self.headers.get("Content-Type", ""):
            return json.loads(dados or "{}")
        return {k: v[0] for k, v in parse_qs(dados).items()}

    def exigir_login(self):
        usuario = self.usuario()
        if not usuario:
            self.redirecionar(f"/login/?next={quote(self.path)}")
            return None
        return usuario

    def exigir_admin_api(self):
        usuario = self.usuario()
        if not usuario:
            self.json(401, {"erro": "Autenticação CEITEC ID obrigatória."})
            return None
        if usuario["perfil"] not in ("ita_admin", "coordenador"):
            self.json(403, {"erro": "Acesso restrito ao ita_admin/coordenador."})
            return None
        return usuario

    def do_GET(self):
        rota = urlparse(self.path)
        caminho = rota.path
        if caminho.startswith("/static/"):
            return self.servir_static(caminho)
        if caminho == "/bolao/sw.js":
            return self.servir_static("/static/bolao/sw.js")
        if caminho == "/":
            return self.redirecionar("/bolao/")
        if caminho == "/login/":
            next_url = parse_qs(rota.query).get("next", ["/bolao/"])[0]
            return self.enviar(200, pagina_login(next_url))
        if caminho == "/logout/":
            return self.redirecionar("/login/", "ceitec_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
        if caminho == "/bolao/":
            usuario = self.exigir_login()
            return None if not usuario else self.enviar(200, pagina_bolao(usuario))
        if caminho == "/bolao/admin/":
            usuario = self.exigir_login()
            if not usuario:
                return None
            if usuario["perfil"] not in ("ita_admin", "coordenador"):
                return self.enviar(403, pagina_base("Acesso negado", usuario, "<main class='page'><h1>Acesso restrito.</h1></main>"))
            return self.enviar(200, pagina_admin(usuario))
        if caminho == "/bolao/jogos/":
            usuario = self.usuario()
            if not usuario:
                return self.json(401, {"erro": "Autenticação CEITEC ID obrigatória."})
            return self.json(200, {"jogos": listar_jogos(usuario)})
        if caminho == "/bolao/meus-palpites/":
            usuario = self.usuario()
            if not usuario:
                return self.json(401, {"erro": "Autenticação CEITEC ID obrigatória."})
            palpites = consultar(
                """
                SELECT p.*, j.time_casa, j.time_fora, j.placar_real_casa, j.placar_real_fora, j.status
                FROM bolao_palpites p
                JOIN bolao_jogos j ON j.id = p.jogo_id
                WHERE p.usuario_id = ?
                ORDER BY j.data_hora_inicio DESC
                """,
                (usuario["id"],),
            )
            return self.json(200, {"palpites": palpites})
        if caminho == "/bolao/admin/dashboard/":
            usuario = self.exigir_admin_api()
            return None if not usuario else self.json(200, dashboard_admin())
        if caminho == "/bolao/resultados/":
            usuario = self.usuario()
            if not usuario:
                return self.json(401, {"erro": "Autenticação CEITEC ID obrigatória."})
            jogos = consultar(
                """
                SELECT j.*,
                       COUNT(p.id) AS total_palpites,
                       SUM(CASE WHEN p.acertou_placar = 1 THEN 1 ELSE 0 END) AS total_acertadores
                FROM bolao_jogos j
                LEFT JOIN bolao_palpites p ON p.jogo_id = j.id
                WHERE j.status = 'encerrado'
                GROUP BY j.id
                ORDER BY j.data_hora_inicio DESC
                """
            )
            for jogo in jogos:
                jogo["palpites"] = consultar(
                    """
                    SELECT u.nome, p.palpite_casa, p.palpite_fora, p.acertou_placar, p.sorteado_ganhador
                    FROM bolao_palpites p
                    JOIN usuarios u ON u.id = p.usuario_id
                    WHERE p.jogo_id = ?
                    ORDER BY CASE WHEN p.acertou_placar = 1 THEN 0 ELSE 1 END, u.nome ASC
                    """,
                    (jogo["id"],),
                )
            return self.json(200, {"jogos": jogos})
        return self.enviar(404, "Página não encontrada.")

    def do_POST(self):
        caminho = urlparse(self.path).path
        try:
            payload = self.ler_body()
            if caminho == "/auth/ceitec-magic/":
                usuario_id = int(payload.get("usuario_id", 0))
                usuario = consultar_um("SELECT * FROM usuarios WHERE id = ?", (usuario_id,))
                if not usuario:
                    return self.enviar(400, "Usuário inválido.")
                token = criar_sessao(usuario_id)
                next_url = payload.get("next", "/bolao/")
                return self.redirecionar(next_url, f"ceitec_session={token}; Path=/; HttpOnly; SameSite=Lax")
            if caminho == "/bolao/palpites/":
                usuario = self.usuario()
                if not usuario:
                    return self.json(401, {"erro": "Autenticação CEITEC ID obrigatória."})
                palpite = salvar_palpite(usuario, payload)
                return self.json(201, {"mensagem": "Palpite salvo. Não será possível alterar.", "palpite": palpite})
            if caminho == "/bolao/push/subscribe/":
                usuario = self.usuario()
                if not usuario:
                    return self.json(401, {"erro": "Autenticação CEITEC ID obrigatória."})
                chaves = payload.get("keys", {})
                executar(
                    """
                    INSERT OR REPLACE INTO bolao_push_subscriptions
                    (usuario_id, endpoint, p256dh, auth, criado_em)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (usuario["id"], payload.get("endpoint", ""), chaves.get("p256dh", ""), chaves.get("auth", ""), iso_agora()),
                )
                return self.json(201, {"mensagem": "Notificações registradas neste dispositivo."})
            if caminho == "/bolao/admin/resultado/":
                usuario = self.exigir_admin_api()
                return None if not usuario else self.json(200, salvar_resultado(usuario, payload))
            if caminho == "/bolao/admin/sortear/":
                usuario = self.exigir_admin_api()
                return None if not usuario else self.json(200, realizar_sorteio(usuario, int(payload.get("jogo_id", 0))))
            if caminho == "/bolao/admin/scheduler/run/":
                usuario = self.exigir_admin_api()
                if not usuario:
                    return None
                atualizar_status_automatico()
                return self.json(200, {"mensagem": "Agendamento executado."})
        except ValueError as exc:
            return self.json(400, {"erro": str(exc)})
        except Exception as exc:
            return self.json(500, {"erro": f"Erro interno: {exc}"})
        return self.enviar(404, "Rota não encontrada.")

    def servir_static(self, caminho):
        relativo = caminho.replace("/static/", "", 1)
        arquivo = (STATIC_DIR / relativo).resolve()
        if not str(arquivo).startswith(str(STATIC_DIR.resolve())) or not arquivo.exists():
            return self.enviar(404, "Arquivo não encontrado.")
        tipos = {
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".png": "image/png",
            ".svg": "image/svg+xml",
        }
        return self.enviar(200, arquivo.read_bytes(), tipos.get(arquivo.suffix, "application/octet-stream"))


def main():
    criar_banco()
    porta = int(os.environ.get("PORT", "8000"))
    # Em Docker/VPS usa 0.0.0.0 para aceitar conexões externas do proxy
    host = os.environ.get("HOST", "0.0.0.0")
    servidor = ThreadingHTTPServer((host, porta), App)
    print(f"Bolão da Copa rodando em http://{host}:{porta}/bolao/")
    servidor.serve_forever()



# ─────────────────────────────────────────────────────────────────────────────
# WSGI — compatível com PythonAnywhere e qualquer servidor WSGI (gunicorn, etc.)
# ─────────────────────────────────────────────────────────────────────────────

def application(environ, start_response):
    """
    Ponto de entrada WSGI para o PythonAnywhere.
    Converte o environ WSGI num request compatível com BaseHTTPRequestHandler.
    """
    import io
    from io import BytesIO
    from http.client import parse_headers

    # Inicializa o banco na primeira requisição (idempotente)
    criar_banco()

    method = environ.get("REQUEST_METHOD", "GET")
    path = environ.get("PATH_INFO", "/")
    query = environ.get("QUERY_STRING", "")
    if query:
        path = f"{path}?{query}"

    # Lê o body da requisição
    content_length = int(environ.get("CONTENT_LENGTH", 0) or 0)
    body = environ["wsgi.input"].read(content_length) if content_length > 0 else b""

    # Monta string de headers HTTP
    header_lines = ""
    header_lines += f"Host: {environ.get('HTTP_HOST', 'localhost')}\r\n"
    for key, val in environ.items():
        if key.startswith("HTTP_") and key != "HTTP_HOST":
            header = key[5:].replace("_", "-").title()
            header_lines += f"{header}: {val}\r\n"
    if content_length:
        header_lines += f"Content-Length: {content_length}\r\n"
    content_type = environ.get("CONTENT_TYPE", "")
    if content_type:
        header_lines += f"Content-Type: {content_type}\r\n"
    header_lines += "\r\n"

    # Parseia os headers com http.client.parse_headers
    parsed_headers = parse_headers(io.BytesIO(header_lines.encode("latin-1")))

    # Buffer de saída
    wfile = BytesIO()

    # Servidor falso para o handler
    class FakeServer:
        server_address = ("127.0.0.1", 80)
        def handle_error(self, request, client_address):
            pass

    try:
        handler = App.__new__(App)
        handler.rfile = io.BufferedReader(io.BytesIO(
            (f"{method} {path} HTTP/1.1\r\n" + header_lines).encode("latin-1") + body
        ))
        handler.wfile = wfile
        handler.server = FakeServer()
        handler.client_address = ("127.0.0.1", 0)
        handler.requestline = f"{method} {path} HTTP/1.1"
        handler.command = method
        handler.path = path
        handler.request_version = "HTTP/1.1"
        handler.headers = parsed_headers
        handler.close_connection = True

        if method == "POST":
            handler.do_POST()
        else:
            handler.do_GET()
    except Exception as exc:
        erro = f"Erro interno WSGI: {exc}".encode()
        start_response("500 Internal Server Error", [
            ("Content-Type", "text/plain"),
            ("Content-Length", str(len(erro))),
        ])
        return [erro]

    # Processa a resposta
    raw_response = wfile.getvalue()
    if not raw_response:
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [b""]

    sep = raw_response.find(b"\r\n\r\n")
    if sep == -1:
        start_response("200 OK", [("Content-Type", "text/html; charset=utf-8")])
        return [raw_response]

    header_block = raw_response[:sep].decode("latin-1", errors="replace")
    response_body = raw_response[sep + 4:]

    lines = header_block.split("\r\n")
    status_parts = lines[0].split(" ", 2)
    status_code = status_parts[1] if len(status_parts) > 1 else "200"
    status_text = status_parts[2] if len(status_parts) > 2 else "OK"
    status = f"{status_code} {status_text}"

    response_headers = []
    for line in lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            response_headers.append((k.strip(), v.strip()))

    start_response(status, response_headers)
    return [response_body]


if __name__ == "__main__":
    main()
