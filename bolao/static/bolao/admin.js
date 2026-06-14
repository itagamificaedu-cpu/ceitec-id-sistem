const painel = document.querySelector("#admin-dashboard");
const scheduler = document.querySelector("#rodar-scheduler");

function linhaRanking(r, i) {
  return `<tr><td>${i + 1}</td><td>${r.nome}</td><td>${r.escola}</td><td>${r.acertos}</td></tr>`;
}

function ganhador(sorteios, jogoId) {
  const s = sorteios.find((item) => item.jogo_id === jogoId);
  if (!s) return "";
  return `<div class="saved winner">🏆 Ganhador do sorteio: <strong>${s.nome}</strong> · ${s.escola} · palpite ${s.palpite_casa}x${s.palpite_fora}</div>`;
}

function secaoPalpites(jogo) {
  const ps = jogo.palpites || [];
  if (ps.length === 0) return `<p class="sem-palpites">Nenhum palpite ainda.</p>`;

  if (jogo.status !== "encerrado") {
    // Antes de encerrar: só mostra quem já apostou (sem revelar o palpite)
    const nomes = ps.map((p) => `<span class="pill-nome">${p.nome}</span>`).join(" ");
    return `<div class="palpites-preview"><strong>Já apostaram (${ps.length}):</strong> ${nomes}</div>`;
  }

  // Jogo encerrado: tabela completa com valores e acertos
  const acertadores = ps.filter((p) => p.acertou_placar);
  const empate = acertadores.length > 1;

  const linhas = ps
    .map((p) => {
      const classe = p.acertou_placar ? "linha-acerto" : "";
      const icone = p.acertou_placar ? (p.sorteado_ganhador ? "🏆" : "✅") : "❌";
      return `<tr class="${classe}">
        <td>${icone} ${p.nome}</td>
        <td>${p.escola}</td>
        <td class="cell-placar">${p.palpite_casa}x${p.palpite_fora}</td>
      </tr>`;
    })
    .join("");

  const avisoEmpate = empate
    ? `<div class="aviso-empate">⚠️ EMPATE — ${acertadores.length} pessoas acertaram. Realize o sorteio abaixo.</div>`
    : "";

  return `
    ${avisoEmpate}
    <div class="tabela-wrap">
      <table class="tabela-palpites">
        <thead><tr><th>Participante</th><th>Escola</th><th>Palpite</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

function blocoJogo(jogo, sorteios) {
  const resultado = jogo.placar_real_casa === null ? "sem resultado" : `${jogo.placar_real_casa}x${jogo.placar_real_fora}`;
  const statusLabel = { aguardando: "⏳ Aguardando", em_andamento: "🔴 Em andamento", encerrado: "✅ Encerrado" }[jogo.status] || jogo.status;

  return `
    <div class="admin-game" data-id="${jogo.id}">
      <strong>${jogo.time_casa} x ${jogo.time_fora}</strong>
      <span>${jogo.fase} · ${statusLabel} · resultado: ${resultado} · ${jogo.total_palpites} palpites · ${jogo.total_acertadores || 0} acertadores</span>
      ${ganhador(sorteios, jogo.id)}
      ${secaoPalpites(jogo)}
      <form class="admin-actions resultado-form">
        <input type="hidden" name="jogo_id" value="${jogo.id}">
        <input name="placar_real_casa" type="number" min="0" max="20" placeholder="Casa" required>
        <strong>x</strong>
        <input name="placar_real_fora" type="number" min="0" max="20" placeholder="Fora" required>
        <button type="submit">Salvar resultado</button>
      </form>
      <div class="admin-actions">
        <button type="button" data-sortear="${jogo.id}">Realizar sorteio entre acertadores</button>
      </div>
    </div>
  `;
}

async function carregarAdmin() {
  const res = await fetch("/bolao/admin/dashboard/");
  const dados = await res.json();
  painel.innerHTML = `
    <section class="admin-grid">
      <div class="panel">
        <h2>Jogos</h2>
        ${dados.jogos.map((j) => blocoJogo(j, dados.sorteios)).join("")}
      </div>
      <div class="panel">
        <h2>Ranking</h2>
        <table class="ranking">
          <thead><tr><th>#</th><th>Nome</th><th>Escola</th><th>Acertos</th></tr></thead>
          <tbody>${dados.ranking.map(linhaRanking).join("") || "<tr><td colspan='4'>Sem acertos ainda.</td></tr>"}</tbody>
        </table>
      </div>
    </section>
  `;
  document.querySelectorAll(".resultado-form").forEach((form) => form.addEventListener("submit", salvarResultado));
  document.querySelectorAll("[data-sortear]").forEach((btn) => btn.addEventListener("click", sortear));
}

async function salvarResultado(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  const res = await fetch("/bolao/admin/resultado/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const dados = await res.json();
  alert(dados.erro || `${dados.total_acertadores} pessoas acertaram o placar.`);
  carregarAdmin();
}

async function sortear(event) {
  const jogoId = event.currentTarget.dataset.sortear;
  event.currentTarget.textContent = "Sorteando...";
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const res = await fetch("/bolao/admin/sortear/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jogo_id: jogoId }),
  });
  const dados = await res.json();
  if (dados.erro || dados.mensagem) {
    alert(dados.erro || dados.mensagem);
  } else {
    alert(`🏆 Ganhador sorteado: ${dados.ganhador.nome} (${dados.ganhador.escola})`);
  }
  carregarAdmin();
}

scheduler?.addEventListener("click", async () => {
  const res = await fetch("/bolao/admin/scheduler/run/", { method: "POST" });
  const dados = await res.json();
  alert(dados.mensagem || dados.erro);
  carregarAdmin();
});

carregarAdmin();
