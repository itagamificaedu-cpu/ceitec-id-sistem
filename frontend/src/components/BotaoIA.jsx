import React from 'react'

export default function BotaoIA({ onClick, carregando, texto = 'Gerar com IA', disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || carregando}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
      style={{ background: carregando ? '#999' : 'linear-gradient(135deg, #1e3a5f, #2e5090)' }}
    >
      {carregando ? (
        <>
          <span className="animate-spin inline-block">⚙️</span>
          <span>Gerando...</span>
        </>
      ) : (
        <>
          <span>🤖</span>
          <span>{texto}</span>
        </>
      )}
    </button>
  )
}
