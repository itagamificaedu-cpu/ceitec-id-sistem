import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api'

export default function PerfilProfessor() {
  const { id } = useParams()
  const [prof, setProf] = useState(null)
  const [game, setGame] = useState(null)
  const [carregando, setCarregando] = useState(true)
  // Criar acesso
  const [modalAcesso, setModalAcesso] = useState(false)
  const [senhaAcesso, setSenhaAcesso] = useState('')
  const [salvandoAcesso, setSalvandoAcesso] = useState(false)
  const [erroAcesso, setErroAcesso] = useState('')
  const [successoAcesso, setSuccessoAcesso] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [profRes, gameRes] = await Promise.all([
          api.get(`/professores/${id}`),
          api.get(`/prof-game/professor/${id}`),
        ])
        setProf(profRes.data)
        setGame(gameRes.data)
      } catch { }
      finally { setCarregando(false) }
    }
    carregar()
  }, [id])

  function abrirModalAcesso() {
    setSenhaAcesso('')
    setErroAcesso('')
    setSuccessoAcesso('')
    setModalAcesso(true)
  }

  async function criarAcesso(e) {
    e.preventDefault()
    if (!senhaAcesso || senhaAcesso.length < 6) {
      setErroAcesso('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setSalvandoAcesso(true)
    setErroAcesso('')
    try {
      await api.post('/usuarios', { nome: prof.nome, email: prof.email, senha: senhaAcesso, perfil: 'professor' })
      setSuccessoAcesso(`Acesso criado! O professor pode fazer login com: ${prof.email}`)
      setSenhaAcesso('')
    } catch (err) {
      const msg = err.response?.data?.erro || ''
      if (msg.toLowerCase().includes('já existe') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        setErroAcesso('Já existe uma conta com este e-mail. Use "Gerenciar Usuários" para alterar a senha.')
      } else {
        setErroAcesso(msg || 'Erro ao criar acesso')
      }
    } finally {
      setSalvandoAcesso(false)
    }
  }

  if (carregando) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6 flex items-center justify-center"><p className="text-gray-400">Carregando...</p></main></div>
  if (!prof) return <div className="flex min-h-screen bg-background"><Navbar /><main className="flex-1 lg:ml-64 p-6 pt-20"><p className="text-danger">Professor não encontrado</p></main></div>

  const xpPct = game && game.tem_acesso ? Math.min(100, (game.xp_total % 200) / 200 * 100) : 0

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/professores" className="text-gray-500 hover:text-primary text-sm">← Professores</Link>
          </div>

          {/* Header do professor */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-5">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-secondary/30">
                {prof.foto_path ? <img src={prof.foto_path} alt={prof.nome} className="w-full h-full object-cover" /> : <span className="text-3xl">👨‍🏫</span>}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-textMain">{prof.nome}</h1>
                <p className="text-secondary font-mono font-bold">{prof.email}</p>
                <p className="text-gray-500 text-sm">{prof.especialidade || 'Sem especialidade definida'}{prof.formacao ? ` • ${prof.formacao}` : ''}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={abrirModalAcesso}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:700, background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 3px 12px rgba(5,150,105,.35)' }}
                >
                  🔑 Criar Acesso
                </button>
                <Link to={`/professores/${id}/editar`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">✏️ Editar</Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {/* Turmas & Disciplinas */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">📚 Turmas &amp; Disciplinas</h3>
              {prof.turmas?.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma turma vinculada</p>
              ) : (
                <>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-500">Alunos no total</span>
                    <span className="font-bold text-primary text-lg">{prof.total_alunos ?? 0}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prof.turmas.slice(0, 6).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">{t.turma_nome} · {t.disciplina}</span>
                    ))}
                    {prof.turmas.length > 6 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{prof.turmas.length - 6}</span>}
                  </div>
                </>
              )}
            </div>

            {/* Professor Game */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">🎮 Professor Game</h3>
              {!game?.tem_acesso ? (
                <p className="text-gray-400 text-sm">Ainda sem acesso ao sistema — crie o acesso acima pra começar a ganhar XP.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-secondary">{game.xp_total} XP</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">Nível {game.nivel}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{game.nome_nivel}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div className="h-2 bg-secondary rounded-full" style={{ width: `${xpPct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{Math.max(0, game.xp_proximo_nivel)} XP para o próximo nível</p>
                  {game.streak > 0 && <p className="text-xs text-orange-600 mt-2">🔥 {game.streak} dia(s) seguidos de login</p>}
                  <p className="text-xs text-gray-400 mt-1">#{game.posicao_ranking} no ranking da escola</p>
                </>
              )}
            </div>

            {/* Planos de Aula */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-textMain mb-3 flex items-center gap-2">📝 Planos de Aula</h3>
              {prof.planos?.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum plano registrado</p>
              ) : (
                <div className="space-y-2">
                  {prof.planos.slice(0, 3).map(p => (
                    <div key={p.id} className="text-xs border rounded-lg p-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{p.tema}</span>
                        {p.gerado_por_ia === 1 && <span className="px-1 rounded bg-blue-100 text-blue-700">IA</span>}
                      </div>
                      <p className="text-gray-500 mt-0.5 truncate">{p.disciplina}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Avaliações criadas */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-textMain mb-4">Avaliações Criadas</h3>
            {prof.avaliacoes?.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma avaliação registrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Avaliação</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Disciplina</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Turma</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prof.avaliacoes.map(av => (
                      <tr key={av.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{av.titulo}</td>
                        <td className="px-3 py-2 text-gray-500">{av.disciplina}</td>
                        <td className="px-3 py-2 text-gray-500">{av.turma_nome || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{av.data_aplicacao ? new Date(av.data_aplicacao).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal criar acesso */}
      {modalAcesso && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {prof.foto_path ? <img src={prof.foto_path} alt={prof.nome} className="w-full h-full object-cover" /> : <span className="text-2xl">👨‍🏫</span>}
              </div>
              <div>
                <h2 className="text-lg font-bold text-textMain">Criar Acesso ao Sistema</h2>
                <p className="text-sm text-gray-500">{prof.nome}</p>
              </div>
            </div>

            {successoAcesso ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-success font-medium mb-1">Acesso criado com sucesso!</p>
                <p className="text-sm text-gray-500 mb-1">Login: <strong>{prof.email}</strong></p>
                <p className="text-xs text-gray-400 mb-4">O professor já pode acessar o sistema com essas credenciais.</p>
                <button onClick={() => setModalAcesso(false)} className="btn-primary w-full">Fechar</button>
              </div>
            ) : (
              <form onSubmit={criarAcesso} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500">Login (e-mail): <strong className="text-textMain">{prof.email}</strong></p>
                  <p className="text-xs text-gray-400 mt-0.5">O professor usará este e-mail para entrar no sistema</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Definir senha *</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Mínimo 6 caracteres"
                    value={senhaAcesso}
                    onChange={e => setSenhaAcesso(e.target.value)}
                    minLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Comunique a senha ao professor pessoalmente ou por mensagem segura.</p>
                </div>
                {erroAcesso && <p className="text-danger text-xs bg-red-50 rounded-lg px-3 py-2">{erroAcesso}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModalAcesso(false)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={salvandoAcesso} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                    {salvandoAcesso ? 'Criando...' : '🔑 Criar Acesso'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
