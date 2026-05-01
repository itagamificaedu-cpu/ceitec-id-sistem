import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

export function GraficoRadar({ dados }) {
  if (!dados || dados.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sem dados</div>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={dados}>
        <PolarGrid />
        <PolarAngleAxis dataKey="disciplina" tick={{ fontSize: 11 }} />
        <Radar name="Média" dataKey="media" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.4} />
        <Tooltip formatter={(v) => [v.toFixed(1), 'Média']} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function GraficoBarrasDesempenho({ dados, nomeChave = 'nome', valorChave = 'media_geral' }) {
  if (!dados || dados.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sem dados</div>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={nomeChave} tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={valorChave} name="Média" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
