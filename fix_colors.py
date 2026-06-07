import re

with open(r'C:/Users/genez/.claude/projects/C--Users-genez-CEITEC-ID-SYSTEM/0ca87fdf-2ea1-43be-898c-b15177784c01/tool-results/b2t79ezv1.txt', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove line numbers added by Read tool (format: "123\t")
lines = html.split('\n')
cleaned = []
for line in lines:
    cleaned.append(re.sub(r'^\d+\t', '', line))
html = '\n'.join(cleaned)

new_css = """  :root {
    --verde-escuro: #15803d;
    --verde-vivo: #16a34a;
    --verde-accent: #22c55e;
    --verde-claro: #bbf7d0;
    --verde-bg: #f0fdf4;
    --verde-bg2: #dcfce7;
    --laranja: #ea580c;
    --laranja2: #c2410c;
    --amarelo: #d97706;
    --texto: #14532d;
    --texto2: #166534;
    --texto-muted: #4b7a5e;
    --branco: #ffffff;
    --cinza-claro: #374151;
    --borda: #bbf7d0;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }

  body {
    font-family: 'Rajdhani', sans-serif;
    background: var(--verde-bg);
    color: var(--texto);
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse at 15% 20%, rgba(34,197,94,0.14) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 75%, rgba(21,128,61,0.10) 0%, transparent 55%),
      radial-gradient(ellipse at 50% 50%, rgba(234,88,12,0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ===== HEADER ===== */
  header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(12px);
    border-bottom: 2px solid var(--verde-claro);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 20px rgba(22,163,74,0.12);
  }

  .logo-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Orbitron', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--texto);
    letter-spacing: 1px;
  }

  .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--verde-vivo), var(--verde-escuro));
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  nav { display: flex; gap: 24px; align-items: center; }
  nav a {
    color: var(--texto2);
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1px;
    transition: color 0.2s;
  }
  nav a:hover { color: var(--verde-vivo); }

  .btn-nav {
    background: linear-gradient(90deg, var(--verde-vivo), var(--verde-escuro));
    color: white !important;
    padding: 8px 20px;
    border-radius: 6px;
    font-weight: 700;
    letter-spacing: 1px;
    box-shadow: 0 4px 14px rgba(22,163,74,0.35);
  }

  /* ===== BANNER TOPO ===== */
  .top-banner {
    background: linear-gradient(90deg, var(--verde-vivo), var(--verde-escuro));
    color: white;
    text-align: center;
    padding: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    position: relative;
    z-index: 50;
    margin-top: 62px;
  }

  /* ===== HERO ===== */
  .hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    overflow: hidden;
    padding: 80px 24px 60px;
    background: linear-gradient(160deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%);
  }

  .hero::before {
    content: '';
    position: absolute;
    top: -10%;
    left: 50%;
    transform: translateX(-50%);
    width: 120%;
    height: 80%;
    background:
      conic-gradient(from -20deg at 20% 0%, transparent 0deg, rgba(34,197,94,0.12) 10deg, transparent 20deg),
      conic-gradient(from 10deg at 50% 0%, transparent 0deg, rgba(22,163,74,0.08) 8deg, transparent 16deg),
      conic-gradient(from -10deg at 80% 0%, transparent 0deg, rgba(21,128,61,0.10) 10deg, transparent 20deg);
    pointer-events: none;
  }

  .hero-grid {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 60px;
    align-items: center;
    width: 100%;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(22,163,74,0.12);
    border: 1px solid rgba(22,163,74,0.4);
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--verde-vivo);
    margin-bottom: 24px;
    animation: pulse-border 2s infinite;
  }

  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.3); }
    50% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
  }

  .hero-title {
    font-family: 'Bebas Neue', cursive;
    font-size: clamp(56px, 8vw, 100px);
    line-height: 0.9;
    letter-spacing: 2px;
    margin-bottom: 8px;
  }

  .hero-title .line1 { color: var(--texto); }
  .hero-title .line2 {
    color: var(--verde-vivo);
    -webkit-text-stroke: 1px rgba(22,163,74,0.3);
    text-shadow: 0 0 40px rgba(22,163,74,0.25);
  }
  .hero-title .line3 { color: var(--texto); }

  .hero-sub {
    font-size: 18px;
    color: var(--cinza-claro);
    margin: 20px 0 32px;
    line-height: 1.6;
    max-width: 520px;
  }
  .hero-sub strong { color: var(--laranja); }

  .hero-ctas { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 48px; }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(90deg, var(--laranja) 0%, var(--laranja2) 100%);
    color: white;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1px;
    box-shadow: 0 6px 24px rgba(234,88,12,0.4), 0 2px 8px rgba(0,0,0,0.1);
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }
  .btn-primary::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
    transition: left 0.4s;
  }
  .btn-primary:hover::before { left: 100%; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(234,88,12,0.5); }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: var(--verde-vivo);
    text-decoration: none;
    padding: 16px 24px;
    border-radius: 8px;
    border: 2px solid var(--verde-accent);
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s;
  }
  .btn-secondary:hover { background: var(--verde-bg2); border-color: var(--verde-vivo); }

  .hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  .stat-card {
    background: white;
    border: 1.5px solid var(--borda);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    box-shadow: 0 2px 12px rgba(22,163,74,0.08);
    transition: all 0.3s;
  }
  .stat-card:hover { border-color: var(--verde-vivo); box-shadow: 0 4px 20px rgba(22,163,74,0.15); transform: translateY(-2px); }

  .stat-number {
    font-family: 'Orbitron', sans-serif;
    font-size: 32px;
    font-weight: 900;
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-label { font-size: 12px; color: var(--texto-muted); letter-spacing: 1px; font-weight: 600; }

  .hero-image-wrap { position: relative; }
  .hero-img {
    width: 100%;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(22,163,74,0.2), 0 20px 60px rgba(0,0,0,0.12);
    animation: float 4s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .hero-image-wrap::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--verde-accent), var(--laranja), var(--verde-vivo));
    z-index: -1;
    opacity: 0.7;
    animation: rotate-gradient 4s linear infinite;
  }
  @keyframes rotate-gradient {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }

  .banner-section { padding: 60px 24px; background: white; }
  .banner-horizontal {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 30px rgba(22,163,74,0.15), 0 10px 40px rgba(0,0,0,0.08);
  }
  .banner-horizontal img { width: 100%; display: block; }

  .section { padding: 80px 24px; position: relative; z-index: 1; }

  .section-label {
    font-size: 12px; font-weight: 700; letter-spacing: 4px;
    color: var(--laranja); text-transform: uppercase; margin-bottom: 12px;
  }

  .section-title {
    font-family: 'Bebas Neue', cursive;
    font-size: clamp(40px, 6vw, 72px);
    line-height: 1; letter-spacing: 2px; margin-bottom: 16px; color: var(--texto);
  }
  .section-title span { color: var(--verde-vivo); }

  .section-sub { color: var(--cinza-claro); font-size: 17px; max-width: 600px; line-height: 1.6; margin-bottom: 48px; }

  .container { max-width: 1200px; margin: 0 auto; }

  .dias-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }

  .dia-card {
    background: white;
    border: 1.5px solid var(--borda);
    border-radius: 16px;
    padding: 24px 16px;
    text-align: center;
    transition: all 0.3s;
    cursor: default;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(22,163,74,0.06);
  }
  .dia-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--verde-vivo), var(--verde-accent));
    transform: scaleX(0);
    transition: transform 0.3s;
  }
  .dia-card:hover::after { transform: scaleX(1); }
  .dia-card:hover { border-color: var(--verde-vivo); box-shadow: 0 8px 24px rgba(22,163,74,0.15); transform: translateY(-4px); }

  .dia-num { font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--verde-vivo); margin-bottom: 12px; }
  .dia-icon { font-size: 32px; margin-bottom: 12px; }
  .dia-titulo { font-family: 'Rajdhani', sans-serif; font-size: 15px; font-weight: 700; color: var(--texto); margin-bottom: 8px; line-height: 1.3; }
  .dia-desc { font-size: 13px; color: var(--cinza-claro); line-height: 1.5; }

  .beneficios-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

  .beneficio-card {
    background: white;
    border: 1.5px solid var(--borda);
    border-radius: 16px;
    padding: 28px;
    transition: all 0.3s;
    box-shadow: 0 2px 10px rgba(22,163,74,0.06);
  }
  .beneficio-card:hover { border-color: var(--verde-vivo); box-shadow: 0 6px 24px rgba(22,163,74,0.14); transform: translateY(-3px); }

  .beneficio-icon { font-size: 36px; margin-bottom: 16px; }
  .beneficio-titulo { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--texto); }
  .beneficio-desc { font-size: 14px; color: var(--cinza-claro); line-height: 1.6; }

  .pricing-section {
    padding: 80px 24px;
    background: linear-gradient(160deg, var(--verde-bg2) 0%, white 100%);
  }

  .pricing-card {
    max-width: 560px;
    margin: 0 auto;
    background: white;
    border: 2px solid var(--verde-claro);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(22,163,74,0.15);
  }

  .pricing-header {
    background: linear-gradient(135deg, var(--verde-bg2), #f0fdf4);
    padding: 32px;
    text-align: center;
    border-bottom: 1.5px solid var(--borda);
  }

  .pricing-tag {
    display: inline-block;
    background: linear-gradient(90deg, var(--laranja), var(--laranja2));
    color: white;
    padding: 4px 16px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 16px;
  }

  .pricing-de { font-size: 18px; color: #9ca3af; text-decoration: line-through; margin-bottom: 4px; }

  .pricing-por {
    font-family: 'Orbitron', sans-serif;
    font-size: 72px;
    font-weight: 900;
    color: var(--verde-vivo);
    line-height: 1;
    text-shadow: 0 0 30px rgba(22,163,74,0.2);
  }
  .pricing-por sup { font-size: 28px; vertical-align: super; }
  .pricing-parcela { font-size: 16px; color: var(--cinza-claro); margin-top: 8px; }
  .pricing-body { padding: 32px; }
  .pricing-items { list-style: none; margin-bottom: 32px; }

  .pricing-items li {
    display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid var(--verde-bg2); font-size: 16px; font-weight: 600; color: var(--texto);
  }
  .pricing-items li:last-child { border-bottom: none; }

  .check {
    width: 22px; height: 22px;
    background: linear-gradient(135deg, var(--verde-vivo), var(--verde-escuro));
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: white; flex-shrink: 0;
  }

  .btn-cta-full {
    display: block; width: 100%;
    background: linear-gradient(90deg, var(--laranja), var(--laranja2));
    color: white; text-decoration: none; padding: 20px; border-radius: 10px;
    font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700;
    letter-spacing: 1px; text-align: center;
    box-shadow: 0 6px 24px rgba(234,88,12,0.4);
    transition: all 0.3s; margin-bottom: 16px;
  }
  .btn-cta-full:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(234,88,12,0.55); }

  .pricing-garantia { text-align: center; font-size: 13px; color: var(--cinza-claro); line-height: 1.8; }

  .destaques-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 48px 0; }

  .destaque-card {
    background: white;
    border: 1.5px solid var(--borda);
    border-radius: 16px;
    padding: 28px 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(22,163,74,0.07);
    transition: all 0.3s;
  }
  .destaque-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(22,163,74,0.14); }

  .destaque-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
  }
  .destaque-card:nth-child(1)::before { background: linear-gradient(90deg, var(--laranja), var(--amarelo)); }
  .destaque-card:nth-child(2)::before { background: linear-gradient(90deg, var(--verde-vivo), var(--verde-accent)); }
  .destaque-card:nth-child(3)::before { background: linear-gradient(90deg, var(--verde-accent), #10b981); }
  .destaque-card:nth-child(4)::before { background: linear-gradient(90deg, var(--laranja2), var(--laranja)); }

  .destaque-num {
    font-family: 'Orbitron', sans-serif; font-size: 48px; font-weight: 900; line-height: 1; margin-bottom: 8px;
  }
  .destaque-card:nth-child(1) .destaque-num { color: var(--laranja); }
  .destaque-card:nth-child(2) .destaque-num { color: var(--verde-vivo); }
  .destaque-card:nth-child(3) .destaque-num { color: #059669; }
  .destaque-card:nth-child(4) .destaque-num { color: var(--amarelo); }

  .destaque-label { font-size: 14px; color: var(--cinza-claro); font-weight: 600; letter-spacing: 1px; }

  .depo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

  .depo-card {
    background: white; border: 1.5px solid var(--borda); border-radius: 16px; padding: 24px;
    box-shadow: 0 2px 10px rgba(22,163,74,0.06); transition: all 0.3s;
  }
  .depo-card:hover { border-color: var(--verde-vivo); box-shadow: 0 6px 20px rgba(22,163,74,0.12); }

  .stars { color: #f59e0b; font-size: 18px; margin-bottom: 12px; }

  .depo-texto { font-size: 15px; color: var(--cinza-claro); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
  .depo-autor { display: flex; align-items: center; gap: 12px; }

  .depo-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    background: linear-gradient(135deg, var(--verde-vivo), var(--verde-escuro));
    display: flex; align-items: center; justify-content: center;
    font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; color: white;
  }

  .depo-nome { font-size: 15px; font-weight: 700; color: var(--texto); }
  .depo-cargo { font-size: 13px; color: var(--texto-muted); }

  .faq-list { max-width: 720px; margin: 0 auto; }

  .faq-item {
    border: 1.5px solid var(--borda); border-radius: 12px; margin-bottom: 12px; overflow: hidden; background: white;
  }

  .faq-question {
    width: 100%; background: white; border: none; color: var(--texto);
    font-family: 'Rajdhani', sans-serif; font-size: 17px; font-weight: 700;
    padding: 20px 24px; text-align: left; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;
  }
  .faq-question:hover { background: var(--verde-bg); }

  .faq-arrow { transition: transform 0.3s; font-size: 20px; color: var(--verde-vivo); }
  .faq-item.open .faq-arrow { transform: rotate(180deg); }
  .faq-item.open { border-color: var(--verde-vivo); }

  .faq-answer {
    max-height: 0; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s;
    padding: 0 24px; color: var(--cinza-claro); font-size: 15px; line-height: 1.7;
  }
  .faq-item.open .faq-answer { max-height: 300px; padding: 0 24px 20px; }

  .cta-final {
    padding: 80px 24px; text-align: center; position: relative; overflow: hidden;
    background: linear-gradient(160deg, var(--verde-bg2) 0%, #f0fdf4 100%);
  }
  .cta-final::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(22,163,74,0.15) 0%, transparent 60%),
      radial-gradient(ellipse at 20% 100%, rgba(34,197,94,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(234,88,12,0.06) 0%, transparent 50%);
  }
  .cta-final .container { position: relative; z-index: 1; }

  footer {
    background: var(--texto);
    border-top: 3px solid var(--verde-vivo);
    padding: 40px 24px; text-align: center;
  }

  .footer-logo {
    font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 12px; color: white;
  }

  .footer-links { display: flex; justify-content: center; gap: 24px; margin: 16px 0; }
  .footer-links a { color: var(--verde-claro); text-decoration: none; font-size: 14px; }
  .footer-links a:hover { color: var(--verde-accent); }

  footer p { font-size: 13px; color: rgba(187,247,208,0.6); }

  @media (max-width: 900px) {
    .hero-grid { grid-template-columns: 1fr; }
    .hero-image-wrap { display: none; }
    .dias-grid { grid-template-columns: repeat(2, 1fr); }
    .beneficios-grid { grid-template-columns: 1fr 1fr; }
    .depo-grid { grid-template-columns: 1fr; }
    .destaques-grid { grid-template-columns: repeat(2, 1fr); }
    nav { display: none; }
  }

  @media (max-width: 600px) {
    .dias-grid { grid-template-columns: 1fr; }
    .beneficios-grid { grid-template-columns: 1fr; }
    .destaques-grid { grid-template-columns: repeat(2, 1fr); }
    .hero-stats { grid-template-columns: repeat(2, 1fr); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hero-badge { animation: fadeUp 0.5s ease both; }
  .hero-title { animation: fadeUp 0.6s ease 0.1s both; }
  .hero-sub { animation: fadeUp 0.6s ease 0.2s both; }
  .hero-ctas { animation: fadeUp 0.6s ease 0.3s both; }
  .hero-stats { animation: fadeUp 0.6s ease 0.4s both; }"""

# Replace entire <style>...</style> block
html = re.sub(r'<style>.*?</style>', '<style>\n' + new_css + '\n</style>', html, flags=re.DOTALL)

# Fix inline dark backgrounds in sections
html = html.replace('style="background:rgba(0,0,0,0.3);"', 'style="background:#f0fdf4;"')
html = html.replace("style='background:rgba(0,0,0,0.3);'", "style='background:#f0fdf4;'")

# Fix JS scroll color
html = html.replace("'rgba(2,8,24,0.98)'", "'rgba(255,255,255,0.98)'")
html = html.replace("'rgba(2,8,24,0.92)'", "'rgba(255,255,255,0.96)'")

# Fix inline text colors that reference old vars
html = html.replace('color:var(--cinza-claro)', 'color:#374151')
html = html.replace('color:var(--branco)', 'color:var(--texto)')
html = html.replace('color:var(--amarelo)', 'color:#d97706')

with open('curso-ferias-novo.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('OK - arquivo gerado')
