const jogosEl = document.querySelector("#jogos");
const resultadosEl = document.querySelector("#resultados-tab");
const tabBar = document.querySelector(".tab-bar");

function brData(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(iso));
}

function tempoRestante(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "iniciado";
  const totalMin = Math.floor(diff / 60000);
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const minutos = totalMin % 60;
  if (dias > 0) return `${dias}d ${horas}h ${minutos}min`;
  return `${horas}h ${minutos}min`;
}

function statusClasse(status) {
  if (status === "em_andamento") return "pill live";
  if (status === "encerrado") return "pill done";
  return "pill";
}

function statusTexto(status) {
  if (status === "em_andamento") return "AO VIVO - palpites encerrados";
  if (status === "encerrado") return "Encerrado";
  return "Aberto para palpites";
}

function mensagemResultado(jogo) {
  const p = jogo.meu_palpite;
  if (!p) return "";
  if (p.sorteado_ganhador) {
    return `<div class="saved winner">VOCÊ GANHOU! Retire seu brinde no CEITEC amanhã.</div>`;
  }
  if (jogo.status === "encerrado" && p.acertou_placar) {
    return `<div class="saved">VOCÊ ACERTOU! Aguarde o sorteio.</div>`;
  }
  if (jogo.status === "encerrado") {
    return `<div class="saved lost">Não foi dessa vez. Resultado: ${jogo.placar_real_casa}x${jogo.placar_real_fora}</div>`;
  }
  return `<div class="saved">Palpite salvo: ${p.palpite_casa}x${p.palpite_fora}. Palpite fechado.</div>`;
}

function cardJogo(jogo) {
  const p = jogo.meu_palpite;
  const bloqueado = p || jogo.status !== "aguardando" || new Date(jogo.data_hora_inicio) <= new Date();
  const casaValor = p ? p.palpite_casa : 0;
  const foraValor = p ? p.palpite_fora : 0;
  return `
    <article class="game-card" data-id="${jogo.id}" data-inicio="${jogo.data_hora_inicio}">
      <div class="game-top">
        <div class="team"><span>${jogo.bandeira_casa}</span><span>${jogo.time_casa}</span></div>
        <div class="versus">x</div>
        <div class="team"><span>${jogo.time_fora}</span><span>${jogo.bandeira_fora}</span></div>
      </div>
      <div class="game-meta">
        <span class="${statusClasse(jogo.status)}">${statusTexto(jogo.status)}</span>
        <span class="pill">${jogo.fase}</span>
        <span class="pill">${brData(jogo.data_hora_inicio)}</span>
        <span class="pill countdown">começa em ${tempoRestante(jogo.data_hora_inicio)}</span>
        <span class="pill">${jogo.total_palpites} palpites enviados</span>
      </div>
      ${mensagemResultado(jogo)}
      ${bloqueado ? "" : `
        <form class="palpite-form">
          <span>Seu palpite</span>
          <label>${jogo.time_casa}<input name="palpite_casa" type="number" min="0" max="20" value="${casaValor}" required></label>
          <strong>x</strong>
          <label>${jogo.time_fora}<input name="palpite_fora" type="number" min="0" max="20" value="${foraValor}" required></label>
          <span></span>
          <input type="hidden" name="jogo_id" value="${jogo.id}">
          <button class="palpite-action" type="submit">Confirmar palpite - não poderá mudar depois</button>
        </form>
      `}
    </article>
  `;
}

function cardResultado(jogo) {
  const total = jogo.total_palpites || 0;
  const acertadores = jogo.total_acertadores || 0;
  const linhas = (jogo.palpites || []).map((p) => `
    <tr class="${p.acertou_placar ? "linha-acerto" : ""}">
      <td>${p.nome}</td>
      <td class="cell-placar">${p.palpite_casa} x ${p.palpite_fora}</td>
      <td>${p.sorteado_ganhador ? "🏆 GANHADOR" : p.acertou_placar ? "✓ Acertou" : "—"}</td>
    </tr>
  `).join("");

  return `
    <article class="game-card">
      <div class="game-top">
        <div class="team"><span>${jogo.bandeira_casa}</span><span>${jogo.time_casa}</span></div>
        <div class="placar-real resultado-placar">${jogo.placar_real_casa} x ${jogo.placar_real_fora}</div>
        <div class="team"><span>${jogo.time_fora}</span><span>${jogo.bandeira_fora}</span></div>
      </div>
      <div class="game-meta">
        <span class="pill done">Encerrado</span>
        <span class="pill">${jogo.fase}</span>
        <span class="pill">${brData(jogo.data_hora_inicio)}</span>
        <span class="pill">${total} palpites</span>
        ${acertadores > 0
          ? `<span class="pill pill-acerto">${acertadores} acertou${acertadores !== 1 ? "ram" : ""} o placar</span>`
          : `<span class="pill">Ninguém acertou o placar</span>`}
      </div>
      ${total === 0
        ? `<p style="color:var(--muted);font-size:.9rem;margin-top:14px">Nenhum palpite registrado neste jogo.</p>`
        : `<div class="tabela-wrap">
            <table class="ranking">
              <thead>
                <tr><th>Nome</th><th>Palpite</th><th>Resultado</th></tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
           </div>`}
    </article>
  `;
}

async function carregarJogos() {
  const res = await fetch("/bolao/jogos/");
  if (!res.ok) {
    jogosEl.innerHTML = "<article class='game-card'>Faça login pelo CEITEC ID para participar.</article>";
    return;
  }
  const dados = await res.json();
  jogosEl.innerHTML = dados.jogos.map(cardJogo).join("");
  document.querySelectorAll(".palpite-form").forEach((form) => {
    form.addEventListener("submit", enviarPalpite);
  });
}

async function carregarResultados() {
  resultadosEl.innerHTML = "<article class='game-card' style='color:var(--muted)'>Carregando resultados...</article>";
  const res = await fetch("/bolao/resultados/");
  if (!res.ok) {
    resultadosEl.innerHTML = "<article class='game-card'>Erro ao carregar resultados.</article>";
    return;
  }
  const dados = await res.json();
  if (!dados.jogos.length) {
    resultadosEl.innerHTML = `
      <article class="game-card">
        <p style="color:var(--muted);font-size:.95rem">
          Nenhum jogo encerrado ainda.<br>
          Os resultados e palpites aparecem aqui após cada partida terminar.
        </p>
      </article>`;
    return;
  }
  resultadosEl.innerHTML = dados.jogos.map(cardResultado).join("");
}

async function enviarPalpite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const res = await fetch("/bolao/palpites/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const dados = await res.json();
  mostrarToast(dados.mensagem || dados.erro);
  if (res.ok) carregarJogos();
}

function atualizarContadores() {
  document.querySelectorAll(".game-card").forEach((card) => {
    const el = card.querySelector(".countdown");
    if (el) el.textContent = `começa em ${tempoRestante(card.dataset.inicio)}`;
  });
}

function mostrarToast(texto) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = texto;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

// ── Abas ─────────────────────────────────────────────────────────────────────
tabBar?.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const tab = btn.dataset.tab;
  if (tab === "palpites") {
    jogosEl.style.display = "";
    resultadosEl.style.display = "none";
  } else {
    jogosEl.style.display = "none";
    resultadosEl.style.display = "";
    carregarResultados();
  }
});

carregarJogos();
setInterval(atualizarContadores, 30000);
setInterval(carregarJogos, 120000);
