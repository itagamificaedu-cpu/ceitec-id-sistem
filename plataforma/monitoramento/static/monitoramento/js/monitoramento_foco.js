/**
 * monitoramento_foco.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de monitoramento de foco (anti-cheat) para avaliações.
 *
 * O que faz:
 *   - Detecta quando o aluno sai da aba/janela durante a prova
 *   - Envia cada evento para o servidor via POST (fetch)
 *   - Exibe banner discreto no topo e contador sempre visível
 *   - NÃO bloqueia nem encerra a prova em nenhuma circunstância
 *
 * Como incluir em uma página de avaliação:
 *   1. Adicione data-prova-id="<id>" na tag <body> OU numa <div id="monitoramento-ctx">
 *   2. Inclua este script via {% static 'monitoramento/js/monitoramento_foco.js' %}
 *
 * Funciona com: ItagGame (Quiz) e Corretor de Provas.
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ──────────────────────────────────────────────────────────────
    // CONFIGURAÇÃO
    // ──────────────────────────────────────────────────────────────

    /** URL do endpoint Django que salva os eventos */
    var ENDPOINT = '/api/monitoramento/registrar/';

    /** Segundos que o banner de alerta fica visível antes de sumir */
    var SEGUNDOS_BANNER = 4;

    // ──────────────────────────────────────────────────────────────
    // LEITURA DO CONTEXTO (prova_id e sessao_id)
    // ──────────────────────────────────────────────────────────────

    /**
     * Tenta ler o prova_id de:
     *   1. Elemento com id="monitoramento-ctx" (usado no jogar.html do ItagGame)
     *   2. Atributo data-prova-id na tag <body> (usado no prova_online.html do Corretor)
     */
    var ctxEl  = document.getElementById('monitoramento-ctx') || document.body;
    var PROVA_ID = (ctxEl && ctxEl.dataset && ctxEl.dataset.provaId) ? ctxEl.dataset.provaId : '';

    if (!PROVA_ID) {
        // Sem prova_id: esta página não é uma avaliação — sai silenciosamente
        console.warn('[Monitoramento] Atributo data-prova-id não encontrado. Monitoramento desativado.');
        return;
    }

    /**
     * ID único desta sessão de prova.
     * crypto.randomUUID() é suportado em todos navegadores modernos.
     * Fallback manual para navegadores antigos.
     */
    var SESSAO_ID;
    try {
        SESSAO_ID = crypto.randomUUID();
    } catch (e) {
        // Fallback simples para ambientes sem crypto.randomUUID
        SESSAO_ID = 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }) + '-' + Date.now().toString(36);
    }

    // ──────────────────────────────────────────────────────────────
    // ESTADO INTERNO
    // ──────────────────────────────────────────────────────────────

    var totalSaidas  = 0;       // contador local de saídas detectadas
    var bannerEl     = null;    // elemento DOM do banner de alerta
    var contadorEl   = null;    // elemento DOM do contador fixo
    var timerBanner  = null;    // timeout para esconder o banner
    var ultimoEvento = '';      // evita duplo disparo (blur + visibility_hidden simultâneos)
    var envioEmAndamento = false; // evita disparos em cascata enquanto aguarda resposta

    // ──────────────────────────────────────────────────────────────
    // CRIAÇÃO DOS ELEMENTOS VISUAIS
    // ──────────────────────────────────────────────────────────────

    /**
     * Cria o banner de alerta no topo da página e o contador fixo
     * no canto superior direito. Chamado uma única vez na inicialização.
     */
    function criarElementosVisuais() {

        // ── Banner de alerta (aparece e desaparece automaticamente) ──
        bannerEl = document.createElement('div');
        bannerEl.id = 'monitor-banner';
        bannerEl.setAttribute('role', 'alert');
        bannerEl.setAttribute('aria-live', 'assertive');
        bannerEl.style.cssText = [
            'position: fixed',
            'top: 0',
            'left: 0',
            'right: 0',
            'background: #b45309',       /* âmbar escuro */
            'color: #fff',
            'font-family: system-ui, sans-serif',
            'font-size: 0.95rem',
            'font-weight: 700',
            'padding: 12px 20px',
            'text-align: center',
            'z-index: 2147483647',       /* máximo possível */
            'display: none',
            'box-shadow: 0 4px 14px rgba(0,0,0,0.35)',
            'letter-spacing: 0.02em',
            'transition: opacity 0.3s ease',
        ].join(';');
        document.body.appendChild(bannerEl);

        // ── Contador fixo — sempre visível no canto superior direito ──
        contadorEl = document.createElement('div');
        contadorEl.id = 'monitor-contador';
        contadorEl.style.cssText = [
            'position: fixed',
            'top: 12px',
            'right: 16px',
            'background: rgba(20,20,20,0.88)',
            'color: #fbbf24',
            'font-family: system-ui, sans-serif',
            'font-size: 0.78rem',
            'font-weight: 700',
            'padding: 6px 13px',
            'border-radius: 999px',
            'z-index: 2147483646',
            'border: 1px solid rgba(251,191,36,0.5)',
            'pointer-events: none',       /* não interfere com cliques */
            'user-select: none',
        ].join(';');
        atualizarContador();
        document.body.appendChild(contadorEl);
    }

    /** Atualiza o texto do contador com o total atual de saídas */
    function atualizarContador() {
        if (contadorEl) {
            contadorEl.textContent = '👁 Saídas registradas: ' + totalSaidas;
        }
    }

    /**
     * Exibe o banner de alerta com a mensagem passada.
     * O banner desaparece automaticamente após SEGUNDOS_BANNER.
     */
    function mostrarBanner(mensagem) {
        if (!bannerEl) return;
        bannerEl.textContent = mensagem;
        bannerEl.style.display = 'block';
        bannerEl.style.opacity  = '1';

        // Cancela o timer anterior se o banner já estava visível
        if (timerBanner) clearTimeout(timerBanner);

        timerBanner = setTimeout(function () {
            bannerEl.style.opacity = '0';
            setTimeout(function () {
                if (bannerEl) bannerEl.style.display = 'none';
            }, 300);
        }, SEGUNDOS_BANNER * 1000);
    }

    // ──────────────────────────────────────────────────────────────
    // CSRF — leitura do cookie do Django
    // ──────────────────────────────────────────────────────────────

    /** Retorna o valor do cookie CSRF do Django para envio no header */
    function getCsrfToken() {
        var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    // ──────────────────────────────────────────────────────────────
    // ENVIO DO EVENTO AO SERVIDOR
    // ──────────────────────────────────────────────────────────────

    /**
     * Envia o evento de foco/desfoco ao endpoint Django via fetch.
     * Falhas de rede são silenciosas — não interrompem a prova.
     *
     * @param {string} tipoEvento  'blur' | 'visibility_hidden' | 'foco_retornado'
     */
    function registrarEvento(tipoEvento) {
        // Evita envios sobrepostos enquanto aguarda resposta do servidor
        if (envioEmAndamento) return;
        envioEmAndamento = true;

        fetch(ENDPOINT, {
            method:      'POST',
            credentials: 'same-origin',   /* inclui cookies de sessão */
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({
                sessao_id:         SESSAO_ID,
                prova_id:          PROVA_ID,
                tipo_evento:       tipoEvento,
                timestamp_cliente: new Date().toISOString(),
            }),
        })
        .then(function (resp) {
            if (resp.ok) {
                return resp.json();
            }
            throw new Error('Resposta não-ok: ' + resp.status);
        })
        .then(function (dados) {
            // Atualiza o contador com o total confirmado pelo servidor
            if (typeof dados.total_saidas === 'number') {
                totalSaidas = dados.total_saidas;
                atualizarContador();
            }
        })
        .catch(function () {
            /* Falha silenciosa — não interrompe a prova */
        })
        .finally(function () {
            envioEmAndamento = false;
        });
    }

    // ──────────────────────────────────────────────────────────────
    // HANDLERS DE EVENTOS
    // ──────────────────────────────────────────────────────────────

    /**
     * Chamado quando o aluno sai da aba/janela.
     * Incrementa o contador local imediatamente (sem esperar o servidor)
     * para dar feedback instantâneo ao aluno.
     *
     * @param {string} tipoEvento  'blur' ou 'visibility_hidden'
     */
    function aoSairDaTela(tipoEvento) {
        // Evita contar duas vezes o mesmo tipo de saída em sequência rápida
        // (ex: blur dispara logo antes de visibilitychange ao trocar de aba)
        if (ultimoEvento === tipoEvento) return;
        ultimoEvento = tipoEvento;

        // Incrementa contador local imediatamente para feedback rápido
        totalSaidas++;
        atualizarContador();

        mostrarBanner('⚠️ Saída detectada e registrada. O professor será notificado.');
        registrarEvento(tipoEvento);
    }

    /** Chamado quando o aluno retorna à aba/janela da prova */
    function aoRetornarFoco() {
        ultimoEvento = '';
        registrarEvento('foco_retornado');
    }

    // ──────────────────────────────────────────────────────────────
    // MONITORAMENTO — Page Visibility API + window blur/focus
    // ──────────────────────────────────────────────────────────────

    /**
     * Page Visibility API — detecta quando a aba fica oculta.
     * Cobre: trocar de aba, minimizar janela, bloquear tela.
     */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            aoSairDaTela('visibility_hidden');
        } else {
            aoRetornarFoco();
        }
    });

    /**
     * window.blur — detecta quando a janela perde o foco mas permanece visível.
     * Cobre: abrir outra janela por cima, clicar fora do navegador.
     * Só dispara se a aba estiver visível (evita duplicação com visibilitychange).
     */
    window.addEventListener('blur', function () {
        if (!document.hidden) {
            aoSairDaTela('blur');
        }
    });

    /** window.focus — disparado ao retornar o foco à janela */
    window.addEventListener('focus', function () {
        if (ultimoEvento === 'blur') {
            aoRetornarFoco();
        }
    });

    // ──────────────────────────────────────────────────────────────
    // INICIALIZAÇÃO
    // ──────────────────────────────────────────────────────────────

    criarElementosVisuais();

    console.info(
        '[Monitoramento] ✅ Ativo | Sessão: ' + SESSAO_ID + ' | Prova: ' + PROVA_ID
    );

}());
