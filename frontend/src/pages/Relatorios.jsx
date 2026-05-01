import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

function TabTurma() {
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [relatorio, setRelatorio] = useState(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    api.get('/alunos').then(({ data }) => {
      const ts = [...new Set(data.map(a => a.turma))]
      setTurmas(ts)
      if (ts.length > 0) setTurmaSel(ts[0])
    })
  }, [])

  async function buscar() {
    if (!turmaSel) return
    setCarregando(true)
    try {
      const { data: rel } = await api.get(`/relatorios/turma?turma=${encodeURIComponent(turmaSel)}&data=${data}`)
      setRelatorio(rel)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  function exportarCSV() {
    if (!relatorio) return
    const linhas = [
      ['Nome', 'Código', 'Turma', 'Curso', 'Status'],
      ...relatorio.alunos.map(a => [a.nome, a.codigo, a.turma, a.curso, a.status])
    ]
    const csv = linhas.map(l => l.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_${turmaSel}_${data}.csv`
    link.click()
  }

  function statusBadge(status) {
    if (status === 'presente') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-success font-medium">✅ Presente</span>
    if (status === 'justificado') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">📄 Justificado</span>
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-danger font-medium">❌ Ausente</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)} className="input-field w-auto flex-1">
          {turmas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={data} onChange={e => setData(e.target.value)} className="input-field w-auto" />
        <button onClick={buscar} className="btn-primary">Buscar</button>
        {relatorio && <button onClick={exportarCSV} className="btn-secondary">📥 Exportar CSV</button>}
      </div>

      {carregando && <div className="text-center py-8 text-gray-400">Carregando...</div>}

      {relatorio && !carregando && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-success">{relatorio.totais.presentes}</p>
              <p className="text-xs text-gray-500">Presentes</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-danger">{relatorio.totais.ausentes}</p>
              <p className="text-xs text-gray-500">Ausentes</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{relatorio.totais.justificados}</p>
              <p className="text-xs text-gray-500">Justificados</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-secondary">{relatorio.totais.percentual}%</p>
              <p className="text-xs text-gray-500">Frequência</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Aluno</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">Código</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.alunos.map(a => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-secondary hidden md:table-cell">{a.codigo}</td>
                    <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function TabAluno() {
  const [alunos, setAlunos] = useState([])
  const [alunoSel, setAlunoSel] = useState('')
  const [busca, setBusca] = useState('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [relatorio, setRelatorio] = useState(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    api.get('/alunos').then(({ data }) => setAlunos(data))
  }, [])

  const alunosFiltrados = alunos.filter(a => (a.nome || '').toLowerCase().includes(busca.toLowerCase()))

  async function buscarRelatorio(id) {
    if (!id) return
    setCarregando(true)
    try {
      const { data } = await api.get(`/relatorios/aluno/${id}?mes=${mes}&ano=${ano}`)
      setRelatorio(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  function corDia(data) {
    const p = relatorio?.presencas?.find(p => p.data === data)
    if (!p) return 'bg-gray-100 text-gray-400'
    if (p.status === 'presente') return 'bg-green-100 text-success'
    if (p.tipo_justificativa) return 'bg-blue-100 text-blue-700'
    return 'bg-red-100 text-danger'
  }

  function gerarDiasDoMes() {
    const diasNoMes = new Date(ano, mes, 0).getDate()
    return Array.from({ length: diasNoMes }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      const m = String(mes).padStart(2, '0')
      return `${ano}-${m}-${d}`
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} className="input-field mb-2" placeholder="Buscar aluno..." />
          <select
            value={alunoSel}
            onChange={e => { setAlunoSel(e.target.value); buscarRelatorio(e.target.value) }}
            className="input-field"
            size={4}
          >
            {alunosFiltrados.map(a => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <select value={mes} onChange={e => setMes(+e.target.value)} className="input-field w-auto">
            {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
          <input type="number" value={ano} onChange={e => setAno(+e.target.value)} className="input-field w-24" min="2020" max="2030" />
          <button onClick={() => buscarRelatorio(alunoSel)} className="btn-primary">Buscar</button>
        </div>
      </div>

      {carregando && <div className="text-center py-8 text-gray-400">Carregando...</div>}

      {relatorio && !carregando && (
        <>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="font-bold text-textMain">{relatorio.aluno.nome}</p>
                <p className="text-xs text-secondary font-mono">{relatorio.aluno.codigo}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold text-primary">{relatorio.totais.percentual}%</p>
                <p className="text-xs text-gray-500">Frequência</p>
              </div>
            </div>

            <div className="flex gap-3 text-sm mb-4">
              <span className="text-success">✅ {relatorio.totais.presentes} presentes</span>
              <span className="text-danger">❌ {relatorio.totais.ausentes} ausentes</span>
              <span className="text-gray-500">📅 {relatorio.totais.total} dias</span>
            </div>

            {/* Calendário */}
            <div className="grid grid-cols-7 gap-1">
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} className="text-center text-xs text-gray-400 pb-1">{d}</div>
              ))}
              {/* Espaços iniciais */}
              {Array.from({ length: new Date(ano, mes - 1, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {gerarDiasDoMes().map(data => (
                <div key={data} className={`rounded text-center text-xs py-1 font-medium ${corDia(data)}`}>
                  {parseInt(data.split('-')[2])}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span>Presente</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span>Ausente</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block"></span>Justificado</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Relatorios() {
  const [aba, setAba] = useState('turma')

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-textMain mb-6">Relatórios</h1>

          <div className="flex border-b mb-6">
            {[{ id: 'turma', label: '📋 Por Turma' }, { id: 'aluno', label: '👤 Por Aluno' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAba(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors
                  ${aba === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {aba === 'turma' ? <TabTurma /> : <TabAluno />}
        </div>
      </main>
    </div>
  )
}
