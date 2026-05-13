/**
 * verificacao_pin.js — ItagGame
 * ─────────────────────────────────────────────────────────────────
 * Modal de verificação de identidade antes de iniciar um quiz/avaliação.
 *
 * Fluxo:
 *  1. Se o aluno já foi autorizado nesta sessão → modal não é exibido
 *  2. Se tem PIN cadastrado → mostra campo de PIN para digitar
 *  3. Se não tem PIN → mostra botão "Confirmar com CEITEC ID" (SSO)
 *  4. Após verificação bem-sucedida → animação de check verde → inicia quiz
 *
 * Lê o contexto do elemento <div id="verificacao-ctx"> no template:
 *   data-autorizado     — "true" se já passou pela verificação nesta sessão
 *   data-tem-pin        — "true" se o aluno tem PIN cadastrado
 *   data-quiz-id        — ID numérico do quiz
 *   data-nome-aluno     — Nome completo do aluno para exibir no modal
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ──────────────────────────────────────────────────────────────
    // LEITURA DO CONTEXTO
    // ──────────────────────────────────────────────────────────────
    var ctxEl = document.getElementById('verificacao-ctx');
    if (!ctxEl) return;  // página sem contexto de verificação

    var jaAutorizado = ctxEl.dataset.autorizado === 'true';
    var temPin       = ctxEl.dataset.temPin      === 'true';
    var quizId       = ctxEl.dataset.quizId      || '';
    var nomeAluno    = ctxEl.dataset.nomeAluno    || 'Aluno';

    // Se já autorizado nesta sessão, não faz nada
    if (jaAutorizado) return;

    // ──────────────────────────────────────────────────────────────
    // ESTADO INTERNO
    // ──────────────────────────────────────────────────────────────
    var tentativasRestantes = 3;
    var verificando = false;

    // ──────────────────────────────────────────────────────────────
    // INTERCEPTA O BOTÃO "▶ Começar!" DO ITAGAME
    // ──────────────────────────────────────────────────────────────
    // Aguarda o DOM estar pronto, depois substitui o onclick original
    function interceptarBotaoComecar() {
        var btnComecar = document.querySelector('.btn-start');
        if (!btnComecar) return;

        // Guarda a função original (iniciarQuiz) se existir
        var onclickOriginal = btnComecar.getAttribute('onclick');
        btnComecar.removeAttribute('onclick');

        btnComecar.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Se autorizado (set por este script após sucesso), inicia o quiz
            if (window._quizIdentidadeAutorizada) {
                if (typeof iniciarQuiz === 'function') {
                    iniciarQuiz();
                } else if (onclickOriginal) {
                    // eslint-disable-next-line no-eval
                    eval(onclickOriginal);
                }
                return;
            }

            // Caso contrário, abre o modal de verificação
            abrirModal();
        });
    }

    // ──────────────────────────────────────────────────────────────
    // COOKIE CSRF DO DJANGO
    // ──────────────────────────────────────────────────────────────
    function getCsrfToken() {
        var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    // ──────────────────────────────────────────────────────────────
    // CRIAÇÃO DO MODAL
    // ──────────────────────────────────────────────────────────────
    function criarModal() {
        // Overlay escuro semi-transparente
        var overlay = document.createElement('div');
        overlay.id = 'pin-overlay';
        overlay.style.cssText = [
            'position:fixed', 'inset:0',
            'background:rgba(0,0,0,0.85)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'z-index:2147483647',
            'backdrop-filter:blur(6px)',
            'animation:fadeIn .25s ease',
        ].join(';');

        // Card central no tema ItagGame
        var card = document.createElement('div');
        card.id = 'pin-card';
        card.style.cssText = [
            'background:#1a1a2e',
            'border:1px solid rgba(108,99,255,0.35)',
            'border-radius:22px',
            'padding:40px 36px',
            'width:100%', 'max-width:420px',
            'box-shadow:0 0 60px rgba(108,99,255,0.25)',
            'position:relative',
            'animation:slideUp .3s ease',
        ].join(';');

        card.innerHTML = [
            /* ── Ícone de cadeado ── */
            '<div style="text-align:center;margin-bottom:8px;">',
            '  <span style="font-size:2.5rem;">🔐</span>',
            '</div>',

            /* ── Título ── */
            '<h2 id="pin-titulo" style="',
            '  font-family:Orbitron,sans-serif;font-size:1.05rem;font-weight:900;',
            '  color:#fff;text-align:center;margin:0 0 6px;',
            '">Confirme sua identidade</h2>',

            /* ── Subtítulo com nome ── */
            '<p style="text-align:center;color:rgba(255,255,255,0.5);font-size:.85rem;margin:0 0 28px;">',
            '  Olá, <strong style="color:#a78bfa;">' + nomeAluno + '</strong>. Identifique-se para continuar.',
            '</p>',

            /* ── Conteúdo dinâmico (PIN ou SSO) ── */
            '<div id="pin-conteudo"></div>',

            /* ── Mensagem de erro ── */
            '<div id="pin-erro" style="',
            '  display:none;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);',
            '  border-radius:10px;padding:10px 14px;margin-top:14px;',
            '  color:#fca5a5;font-size:.85rem;text-align:center;',
            '"></div>',

            /* ── Animação de sucesso (oculta por padrão) ── */
            '<div id="pin-sucesso" style="display:none;text-align:center;padding:20px 0;">',
            '  <div id="pin-check" style="',
            '    font-size:3.5rem;animation:checkPulse .6s ease;',
            '  ">✅</div>',
            '  <p style="color:#00d68f;font-weight:800;font-family:Orbitron,sans-serif;',
            '     font-size:.95rem;margin-top:12px;">Identidade confirmada!</p>',
            '</div>',
        ].join('');

        overlay.appendChild(card);

        // Injeta animações CSS necessárias
        if (!document.getElementById('pin-estilos')) {
            var style = document.createElement('style');
            style.id = 'pin-estilos';
            style.textContent = [
                '@keyframes fadeIn   { from{opacity:0} to{opacity:1} }',
                '@keyframes slideUp  { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }',
                '@keyframes checkPulse { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }',
                '@keyframes shake    { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }',
                '#pin-input:focus    { outline:none;border-color:#6c63ff !important;box-shadow:0 0 0 3px rgba(108,99,255,.3); }',
                '#btn-confirmar-pin  { transition:filter .2s,transform .1s; }',
                '#btn-confirmar-pin:hover:not(:disabled) { filter:brightness(1.12); }',
                '#btn-confirmar-pin:active:not(:disabled) { transform:scale(.97); }',
                '#btn-sso           { transition:filter .2s,transform .1s; }',
                '#btn-sso:hover:not(:disabled) { filter:brightness(1.12); }',
                '#btn-sso:active:not(:disabled) { transform:scale(.97); }',
            ].join('\n');
            document.head.appendChild(style);
        }

        return overlay;
    }

    // ──────────────────────────────────────────────────────────────
    // RENDERIZA CONTEÚDO DO MODAL (PIN ou SSO)
    // ──────────────────────────────────────────────────────────────
    function renderizarConteudo() {
        var conteudo = document.getElementById('pin-conteudo');
        if (!conteudo) return;

        if (temPin) {
            // ── Modo PIN: campo para digitar o PIN ────────────────
            conteudo.innerHTML = [
                '<label style="display:block;color:rgba(255,255,255,.6);',
                '  font-size:.78rem;font-weight:700;letter-spacing:.05em;',
                '  text-transform:uppercase;margin-bottom:8px;">',
                '  Seu PIN de segurança',
                '</label>',
                '<input id="pin-input" type="password" inputmode="numeric"',
                '  maxlength="6" placeholder="••••••"',
                '  style="',
                '    width:100%;box-sizing:border-box;',
                '    background:rgba(255,255,255,.07);',
                '    border:1.5px solid rgba(108,99,255,.4);',
                '    border-radius:12px;padding:14px 16px;',
                '    font-family:Orbitron,sans-serif;font-size:1.4rem;',
                '    letter-spacing:.3em;color:#fff;text-align:center;',
                '  "',
                '>',
                '<p id="pin-tentativas" style="',
                '  text-align:center;color:rgba(255,255,255,.4);',
                '  font-size:.75rem;margin:8px 0 0;',
                '">',
                '  ' + tentativasRestantes + ' tentativa' + (tentativasRestantes !== 1 ? 's' : '') + ' restante' + (tentativasRestantes !== 1 ? 's' : ''),
                '</p>',
                '<button id="btn-confirmar-pin"',
                '  style="',
                '    display:block;width:100%;margin-top:22px;',
                '    background:linear-gradient(135deg,#6c63ff,#4a4eff);',
                '    color:#fff;border:none;border-radius:14px;',
                '    padding:15px;font-family:Orbitron,sans-serif;',
                '    font-size:.9rem;font-weight:900;cursor:pointer;',
                '  "',
                '>',
                '  🔓 Confirmar PIN',
                '</button>',
                '<button id="btn-usar-sso" style="',
                '  display:block;width:100%;margin-top:10px;background:none;',
                '  border:1px solid rgba(255,255,255,.15);border-radius:14px;',
                '  padding:11px;color:rgba(255,255,255,.5);font-size:.8rem;cursor:pointer;',
                '">',
                '  Entrar apenas com CEITEC ID (sem PIN)',
                '</button>',
            ].join('');

            // Enter no campo de PIN → confirmar
            var inputEl = document.getElementById('pin-input');
            if (inputEl) {
                inputEl.focus();
                inputEl.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') confirmarPin();
                });
            }

            var btnPin = document.getElementById('btn-confirmar-pin');
            if (btnPin) btnPin.addEventListener('click', confirmarPin);

            var btnSso = document.getElementById('btn-usar-sso');
            if (btnSso) btnSso.addEventListener('click', confirmarSSO);

        } else {
            // ── Modo SSO: sem PIN, apenas confirmação por CEITEC ID ──
            conteudo.innerHTML = [
                '<p style="',
                '  text-align:center;color:rgba(255,255,255,.55);',
                '  font-size:.88rem;line-height:1.6;margin:0 0 24px;',
                '">',
                '  Você está autenticado via <strong style="color:#a78bfa;">CEITEC ID</strong>.',
                '  Clique para confirmar sua identidade e iniciar a avaliação.',
                '</p>',
                '<button id="btn-sso"',
                '  style="',
                '    display:block;width:100%;',
                '    background:linear-gradient(135deg,#00b07a,#00d68f);',
                '    color:#fff;border:none;border-radius:14px;',
                '    padding:15px;font-family:Orbitron,sans-serif;',
                '    font-size:.9rem;font-weight:900;cursor:pointer;',
                '  "',
                '>',
                '  ✅ Confirmar com CEITEC ID',
                '</button>',
            ].join('');

            var btnSsoEl = document.getElementById('btn-sso');
            if (btnSsoEl) btnSsoEl.addEventListener('click', confirmarSSO);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // ABRIR / FECHAR MODAL
    // ──────────────────────────────────────────────────────────────
    function abrirModal() {
        if (document.getElementById('pin-overlay')) return;  // já aberto
        var overlay = criarModal();
        document.body.appendChild(overlay);
        renderizarConteudo();
    }

    function fecharModal() {
        var overlay = document.getElementById('pin-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity .25s ease';
            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 250);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // EXIBIR ERRO
    // ──────────────────────────────────────────────────────────────
    function mostrarErro(mensagem) {
        var erroEl = document.getElementById('pin-erro');
        if (!erroEl) return;
        erroEl.textContent = mensagem;
        erroEl.style.display = 'block';

        // Shake no input de PIN
        var inputEl = document.getElementById('pin-input');
        if (inputEl) {
            inputEl.style.animation = 'none';
            // eslint-disable-next-line no-unused-expressions
            inputEl.offsetHeight;  // força reflow
            inputEl.style.animation = 'shake .4s ease';
            inputEl.value = '';
            setTimeout(function () { inputEl.focus(); }, 50);
        }
    }

    function ocultarErro() {
        var erroEl = document.getElementById('pin-erro');
        if (erroEl) erroEl.style.display = 'none';
    }

    // ──────────────────────────────────────────────────────────────
    // ANIMAÇÃO DE SUCESSO → INICIAR QUIZ
    // ──────────────────────────────────────────────────────────────
    function animarSucessoEIniciar(badgeConcedido) {
        // Oculta conteúdo e mostra check verde
        var conteudo = document.getElementById('pin-conteudo');
        var erroEl   = document.getElementById('pin-erro');
        var sucessoEl = document.getElementById('pin-sucesso');

        if (conteudo)  conteudo.style.display  = 'none';
        if (erroEl)    erroEl.style.display    = 'none';
        if (sucessoEl) sucessoEl.style.display = 'block';

        // Se ganhou o badge, mostra notificação abaixo do check
        if (badgeConcedido) {
            if (sucessoEl) {
                var badgeMsg = document.createElement('p');
                badgeMsg.style.cssText = 'color:#fbbf24;font-size:.8rem;margin-top:8px;';
                badgeMsg.innerHTML = '🛡️ Badge <strong>Acesso Autenticado</strong> conquistado!';
                sucessoEl.appendChild(badgeMsg);
            }
        }

        // Após 1,1 segundo fecha o modal e inicia o quiz
        setTimeout(function () {
            window._quizIdentidadeAutorizada = true;
            fecharModal();
            // Dispara o clique no botão "Começar!" original
            setTimeout(function () {
                var btnComecar = document.querySelector('.btn-start');
                if (btnComecar) btnComecar.click();
            }, 100);
        }, 1100);
    }

    // ──────────────────────────────────────────────────────────────
    // CONFIRMAÇÃO VIA PIN
    // ──────────────────────────────────────────────────────────────
    function confirmarPin() {
        if (verificando) return;

        var inputEl = document.getElementById('pin-input');
        var pin = inputEl ? inputEl.value.trim() : '';

        if (!pin || pin.length < 4) {
            mostrarErro('Digite seu PIN (mínimo 4 dígitos).');
            return;
        }

        ocultarErro();
        verificando = true;

        // Desabilita o botão durante a verificação
        var btnEl = document.getElementById('btn-confirmar-pin');
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.textContent = '⏳ Verificando...';
        }

        fetch('/quiz/api/verificar-pin/', {
            method:      'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({ pin: pin, quiz_id: parseInt(quizId) }),
        })
        .then(function (resp) { return resp.json(); })
        .then(function (dados) {
            verificando = false;

            if (dados.autorizado) {
                animarSucessoEIniciar(dados.badge_concedido);
                return;
            }

            // Erro: PIN incorreto ou bloqueio
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.textContent = '🔓 Confirmar PIN';
            }

            if (dados.bloqueado) {
                mostrarErro(dados.erro || 'Muitas tentativas incorretas. Descanse um pouco e tente novamente em 10 minutos.');
                if (btnEl) btnEl.disabled = true;
                return;
            }

            if (typeof dados.tentativas_restantes === 'number') {
                tentativasRestantes = dados.tentativas_restantes;
                var tentEl = document.getElementById('pin-tentativas');
                if (tentEl) {
                    tentEl.textContent = tentativasRestantes + ' tentativa' +
                        (tentativasRestantes !== 1 ? 's' : '') + ' restante' +
                        (tentativasRestantes !== 1 ? 's' : '');
                    tentEl.style.color = tentativasRestantes <= 1 ? '#fca5a5' : 'rgba(255,255,255,.4)';
                }
            }

            mostrarErro(dados.erro || 'PIN incorreto. Tente novamente.');
        })
        .catch(function () {
            verificando = false;
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.textContent = '🔓 Confirmar PIN';
            }
            mostrarErro('Erro de conexão. Tente novamente.');
        });
    }

    // ──────────────────────────────────────────────────────────────
    // CONFIRMAÇÃO VIA SSO (CEITEC ID)
    // ──────────────────────────────────────────────────────────────
    function confirmarSSO() {
        if (verificando) return;
        verificando = true;

        var btnSsoEl = document.getElementById('btn-sso') ||
                       document.getElementById('btn-usar-sso');
        if (btnSsoEl) {
            btnSsoEl.disabled = true;
            btnSsoEl.textContent = '⏳ Confirmando...';
        }

        fetch('/quiz/api/registro-acesso/', {
            method:      'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken':  getCsrfToken(),
            },
            body: JSON.stringify({ quiz_id: parseInt(quizId) }),
        })
        .then(function (resp) { return resp.json(); })
        .then(function (dados) {
            verificando = false;
            if (dados.autorizado) {
                animarSucessoEIniciar(dados.badge_concedido);
            } else {
                if (btnSsoEl) {
                    btnSsoEl.disabled = false;
                    btnSsoEl.textContent = '✅ Confirmar com CEITEC ID';
                }
                mostrarErro(dados.erro || 'Não foi possível confirmar. Tente novamente.');
            }
        })
        .catch(function () {
            verificando = false;
            if (btnSsoEl) {
                btnSsoEl.disabled = false;
                btnSsoEl.textContent = '✅ Confirmar com CEITEC ID';
            }
            mostrarErro('Erro de conexão. Tente novamente.');
        });
    }

    // ──────────────────────────────────────────────────────────────
    // INICIALIZAÇÃO
    // ──────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptarBotaoComecar);
    } else {
        interceptarBotaoComecar();
    }

    console.info('[VerificaçãoPin] Ativo | Quiz: ' + quizId + ' | Tem PIN: ' + temPin);

}());
