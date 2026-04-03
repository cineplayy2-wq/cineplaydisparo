import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabase.js'

// ─── Helpers ───
const today = () => new Date().toISOString().slice(0, 10)
const formatDate = (d) => { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
const formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const getWeekRange = (date) => {
  const d = new Date(date + 'T12:00:00'); const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d); start.setDate(diff)
  const end = new Date(start); end.setDate(start.getDate() + 6)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}
const getMonthRange = (date) => {
  const d = new Date(date + 'T12:00:00')
  return { start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10) }
}
const dayLabels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const getDayLabel = (ds) => dayLabels[new Date(ds + 'T12:00:00').getDay()]
const formatPhone = (n) => {
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
  return n
}

// ─── Mensagens pré-definidas ───
const MENSAGENS = [
  {
    id: 'disparo1',
    label: 'DISPARO 1',
    color: '#4f8ff7',
    texto: 'Oii, tudo bem? Estamos reativando alguns clientes antigos porque o sistema evoluiu muitoo, finalmente conseguimos manter sem travamentos e quedas. Liberei alguns acessos pra quem ja foi cliente por 7 dias pra testar. Quer aproveitar?'
  },
  {
    id: 'disparo2',
    label: 'DISPARO 2',
    color: '#a78bfa',
    texto: 'Olaa! 😊\nEssa semana estamos reativando alguns clientes antigos porque o sistema melhorou MUITO!!\nAbrimos alguns acessos de 7 dias pra teste. Como você já foi cliente, consigo te incluir também.\nQuer?'
  },
  {
    id: 'disparo3',
    label: 'DISPARO 3',
    color: '#34d399',
    texto: 'Oii! 😊\nTe chamei porque você já foi cliente nosso\nA gente corrigiu vários problemas que tinha antes (principalmente travamentos)\nE liberamos 7 dias pra antigos clientes testarem\nSe quiser, te libero aqui'
  },
  {
    id: 'vence_hoje',
    label: 'VENCE HOJE',
    color: '#fbbf24',
    texto: '⚠️ AVISO IMPORTANTE: CinePlay⚠️\nSeu plano expira nas próximas horas! Para continuar aproveitando todo o nosso conteúdo sem bloqueios, responda SIM agora mesmo.'
  },
  {
    id: 'venceu_3dias',
    label: 'VENCEU 3 DIAS',
    color: '#f87171',
    texto: 'Oii! ⚠️\n\nVi que você deixou de usar a CinePlay esses dias e fiquei pensando se foi por algum problema\n\nTenho outro servidor disponível que a meses não temos problemas, nao liberamos de primeira ele pra nao sobrecarregar\n\nSe quiser, te libero 7 dias pra testar e ver se faz mais sentido'
  },
]

// ─── Theme ───
const T = {
  bg: '#0c0f14', s1: '#13171f', s2: '#1a1f2b', s3: '#222838',
  border: '#2a3040', text: '#e4eaf0', dim: '#6b7688',
  blue: '#4f8ff7', blueGlow: 'rgba(79,143,247,.15)',
  green: '#34d399', greenGlow: 'rgba(52,211,153,.12)',
  red: '#f87171', redGlow: 'rgba(248,113,113,.12)',
  amber: '#fbbf24', amberGlow: 'rgba(251,191,36,.12)',
  purple: '#a78bfa', purpleGlow: 'rgba(167,139,250,.12)',
  r: '8px', r2: '12px',
  font: "'DM Sans', sans-serif", mono: "'JetBrains Mono', monospace",
}

// ─── Icons ───
const I = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}><path d={d} /></svg>
)
const ic = {
  dash: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  cal: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
  pay: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  rank: 'M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  left: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  right: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
  down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
  up: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
}
const WaIcon = () => (
  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </div>
)

// ─── Styles ───
const css = {
  wrap: { fontFamily: T.font, background: T.bg, color: T.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { background: T.s1, borderBottom: `1px solid ${T.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100 },
  logo: { width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #e50914, #b20710)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' },
  title: { fontWeight: 700, fontSize: 15, flex: 1 },
  nav: { display: 'flex', background: T.s1, borderBottom: `1px solid ${T.border}`, overflowX: 'auto', padding: '0 4px' },
  navBtn: (a) => ({ padding: '10px 10px', background: 'none', border: 'none', borderBottom: a ? `2px solid ${T.blue}` : '2px solid transparent', color: a ? T.blue : T.dim, fontFamily: T.font, fontSize: 11, fontWeight: a ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }),
  body: { flex: 1, padding: 16, maxWidth: 960, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  card: { background: T.s1, border: `1px solid ${T.border}`, borderRadius: T.r2, padding: 16, marginBottom: 12 },
  cardH: { fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 14 },
  stat: (c, bg) => ({ background: bg, border: `1px solid ${c}25`, borderRadius: T.r, padding: '12px 14px' }),
  statL: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500, marginBottom: 2 },
  statV: (c) => ({ fontSize: 20, fontWeight: 700, fontFamily: T.mono, color: c }),
  btn: (v = 'primary') => ({
    padding: '7px 14px', borderRadius: T.r, border: 'none', fontFamily: T.font, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .15s',
    ...(v === 'primary' ? { background: T.blue, color: '#fff' } : v === 'danger' ? { background: T.redGlow, color: T.red, border: `1px solid ${T.red}33` } : v === 'success' ? { background: T.greenGlow, color: T.green, border: `1px solid ${T.green}33` } : { background: T.s2, color: T.text, border: `1px solid ${T.border}` }),
  }),
  input: { padding: '10px 12px', borderRadius: T.r, border: `1px solid ${T.border}`, background: T.s2, color: T.text, fontFamily: T.font, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { padding: '7px 10px', borderRadius: T.r, border: `1px solid ${T.border}`, background: T.s2, color: T.text, fontFamily: T.font, fontSize: 12, outline: 'none', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${T.border}`, color: T.dim, fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' },
  td: { padding: '8px 10px', borderBottom: `1px solid ${T.border}15`, verticalAlign: 'middle' },
  badge: (c, bg) => ({ display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: c }),
  chk: (on) => ({ width: 30, height: 30, borderRadius: 7, border: `2px solid ${on ? T.green : T.border}`, background: on ? T.greenGlow : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: T.s1, border: `1px solid ${T.border}`, borderRadius: T.r2, padding: 20, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' },
  modalH: { fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  alert: (t) => ({ padding: '8px 12px', borderRadius: T.r, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, background: t === 'danger' ? T.redGlow : t === 'warning' ? T.amberGlow : T.s2, borderLeft: `3px solid ${t === 'danger' ? T.red : t === 'warning' ? T.amber : T.blue}` }),
  rnk: (i) => ({ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: T.mono, flexShrink: 0, background: i === 0 ? T.blue : T.s3, color: i === 0 ? '#fff' : T.dim }),
  filters: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' },
}

// ═══════════════════════════════════════
// APP
// ═══════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null) // logged in user
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  
  // App state
  const [tab, setTab] = useState('disparos')
  const [modal, setModal] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [registros, setRegistros] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [listas, setListas] = useState([])
  const [numeros, setNumeros] = useState([])
  const [selectedDate, setSelectedDate] = useState(today())
  const [filterPeriodo, setFilterPeriodo] = useState('mes')
  const [filterPessoa, setFilterPessoa] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [dispPessoa, setDispPessoa] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [showEnviados, setShowEnviados] = useState(false)
  const [addingList, setAddingList] = useState(false)
  const [newNumbers, setNewNumbers] = useState('')
  const [msgPicker, setMsgPicker] = useState(null)
  const [bloqueios, setBloqueios] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState(null)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [activeSessaoId, setActiveSessaoId] = useState(null)
  const [showBloqueioMenu, setShowBloqueioMenu] = useState(false)

  const isAdmin = user?.role === 'admin'

  // ─── Check session on mount ───
  useEffect(() => {
    const saved = sessionStorage.getItem('cineplay_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  // ─── Load all data when logged in ───
  const loadData = useCallback(async () => {
    if (!user) return
    const [u, r, p, l, n, b, s] = await Promise.all([
      supabase.from('usuarios').select('*').order('nome'),
      supabase.from('registros').select('*'),
      supabase.from('pagamentos').select('*'),
      supabase.from('listas').select('*'),
      supabase.from('numeros').select('*'),
      supabase.from('bloqueios').select('*').order('created_at', { ascending: false }),
      supabase.from('sessoes_tempo').select('*').order('created_at', { ascending: false }),
    ])
    if (u.data) setUsuarios(u.data)
    if (r.data) setRegistros(r.data)
    if (p.data) setPagamentos(p.data)
    if (l.data) setListas(l.data)
    if (n.data) setNumeros(n.data)
    if (b.data) setBloqueios(b.data)
    if (s.data) setSessoes(s.data)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  // ─── Login ───
  const handleLogin = async () => {
    setLoginError('')
    // Admin login
    if (loginSenha === 'admin123') {
      const u = { id: 'admin', nome: 'Admin', role: 'admin' }
      setUser(u)
      sessionStorage.setItem('cineplay_user', JSON.stringify(u))
      return
    }
    // Funcionario login
    if (loginSenha === 'func123') {
      const u = { id: 'func', nome: 'Funcionário', role: 'funcionario' }
      setUser(u)
      sessionStorage.setItem('cineplay_user', JSON.stringify(u))
      setTab('disparos')
      return
    }
    setLoginError('Senha incorreta')
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('cineplay_user')
    setLoginSenha('')
  }

  // ─── Data helpers ───
  const pessoasAtivas = useMemo(() => usuarios.filter(u => u.status === 'ATIVO' && u.role === 'funcionario'), [usuarios])
  
  const pessoasFiltradas = useMemo(() => usuarios.filter(u => {
    if (u.role === 'admin') return false
    if (filterStatus === 'ativo' && u.status !== 'ATIVO') return false
    if (filterStatus === 'inativo' && u.status !== 'INATIVO') return false
    if (filterPessoa !== 'todos' && u.id !== filterPessoa) return false
    return true
  }), [usuarios, filterStatus, filterPessoa])

  const dateRange = useMemo(() => {
    if (filterPeriodo === 'semana') return getWeekRange(selectedDate)
    if (filterPeriodo === 'mes') return getMonthRange(selectedDate)
    return { start: '2020-01-01', end: '2099-12-31' }
  }, [filterPeriodo, selectedDate])

  const getStats = useCallback((uid) => {
    const regs = registros.filter(r => r.usuario_id === uid && r.concluiu && r.data >= dateRange.start && r.data <= dateRange.end)
    const u = usuarios.find(x => x.id === uid)
    const valor = u?.valor_dia || 15
    const dias = regs.length
    const totalReceber = dias * valor
    const totalPago = pagamentos.filter(pg => pg.usuario_id === uid).reduce((s, pg) => s + Number(pg.valor), 0)
    const saldo = totalReceber - totalPago
    const wr = getWeekRange(today())
    const diasSemana = registros.filter(r => r.usuario_id === uid && r.concluiu && r.data >= wr.start && r.data <= wr.end).length
    return { diasTrabalhados: dias, totalReceber, totalPago, saldo, diasSemana }
  }, [registros, pagamentos, usuarios, dateRange])

  const getRegistro = (uid, date) => registros.find(r => r.usuario_id === uid && r.data === date)

  // ─── Actions (Supabase) ───
  const criarFuncionario = async (nome, email, senha, valorDia) => {
    await supabase.rpc('criar_usuario', { p_nome: nome, p_email: email.toLowerCase(), p_senha: senha, p_role: 'funcionario', p_valor_dia: Number(valorDia) || 15 })
    await loadData()
  }

  const editarUsuario = async (id, nome, valorDia, status) => {
    await supabase.from('usuarios').update({ nome, valor_dia: Number(valorDia) || 15, status }).eq('id', id)
    await loadData()
  }

  const deletarUsuario = async (id) => {
    await supabase.from('usuarios').delete().eq('id', id)
    await loadData()
  }

  const toggleRegistro = async (uid, date) => {
    const existing = getRegistro(uid, date)
    if (existing) {
      await supabase.from('registros').update({ concluiu: !existing.concluiu }).eq('id', existing.id)
    } else {
      await supabase.from('registros').insert({ usuario_id: uid, data: date, concluiu: true })
    }
    await loadData()
  }

  const addPagamento = async (uid, valor) => {
    await supabase.from('pagamentos').insert({ usuario_id: uid, valor: Number(valor), data: today() })
    await loadData()
  }

  const addLista = async (uid, numerosStr) => {
    const nums = numerosStr.split(/[\n,;]+/).map(n => {
      let clean = n.replace(/\D/g, '').trim()
      if (clean.length === 13 && clean.startsWith('55')) clean = clean.slice(2)
      if (clean.length === 12 && clean.startsWith('55')) clean = clean.slice(2)
      return clean
    }).filter(n => n.length >= 10 && n.length <= 11)
    if (nums.length === 0) return
    const { data: lista } = await supabase.from('listas').insert({ usuario_id: uid, data: today() }).select().single()
    if (lista) {
      await supabase.from('numeros').insert(nums.map(n => ({ lista_id: lista.id, numero: n })))
    }
    await loadData()
  }

  const marcarEnviado = async (numId) => {
    await supabase.from('numeros').update({ enviado: true, enviado_at: new Date().toISOString() }).eq('id', numId)
    await loadData()
  }

  const desmarcarEnviado = async (numId) => {
    await supabase.from('numeros').update({ enviado: false, enviado_at: null }).eq('id', numId)
    await loadData()
  }

  // ─── Bloqueio actions ───
  const reportarBloqueio = async (pessoaId, tipo) => {
    const pessoa = usuarios.find(u => u.id === pessoaId)
    const agora = new Date()
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    await supabase.from('bloqueios').insert({ usuario_id: pessoaId, tipo, data: today(), hora })
    // Send WhatsApp notification
    const msg = `⚠️ Bloqueio detectado - ${pessoa?.nome || 'Funcionário'} - ${tipo === '24h' ? 'Bloqueio de 24 horas' : 'Bloqueio permanente'} - ${formatDate(today())} ${hora}`
    const encoded = encodeURIComponent(msg)
    window.open(`https://wa.me/5553984434391?text=${encoded}`, '_blank')
    await loadData()
    setShowBloqueioMenu(false)
  }

  // ─── Timer actions ───
  const startTimer = async (pessoaId) => {
    const now = new Date().toISOString()
    const { data: sess } = await supabase.from('sessoes_tempo').insert({ usuario_id: pessoaId, data: today(), inicio: now }).select().single()
    if (sess) setActiveSessaoId(sess.id)
    setTimerRunning(true)
    setTimerStart(Date.now())
  }

  const pauseTimer = async () => {
    if (!activeSessaoId) return
    const elapsed = Math.round((Date.now() - timerStart) / 1000)
    await supabase.from('sessoes_tempo').update({ fim: new Date().toISOString(), segundos: elapsed }).eq('id', activeSessaoId)
    setTimerRunning(false)
    setTimerElapsed(prev => prev + elapsed)
    setTimerStart(null)
    setActiveSessaoId(null)
    await loadData()
  }

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return
    const interval = setInterval(() => {}, 1000) // force re-render
    return () => clearInterval(interval)
  }, [timerRunning])

  const getTimerDisplay = () => {
    const current = timerRunning && timerStart ? Math.round((Date.now() - timerStart) / 1000) : 0
    const total = timerElapsed + current
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const getTotalTempoHoje = (pessoaId) => {
    const total = sessoes.filter(s => s.usuario_id === pessoaId && s.data === today()).reduce((sum, s) => sum + (s.segundos || 0), 0)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    return total > 0 ? `${h > 0 ? h + 'h ' : ''}${m}min` : null
  }

  // ─── Week ───
  const weekDates = useMemo(() => {
    const wr = getWeekRange(selectedDate); const dates = []; const d = new Date(wr.start + 'T12:00:00')
    for (let i = 0; i < 7; i++) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1) }
    return dates
  }, [selectedDate])
  const shiftWeek = (dir) => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + dir * 7); setSelectedDate(d.toISOString().slice(0, 10)) }

  // ─── Dashboard ───
  const dashStats = useMemo(() => {
    const ativas = pessoasAtivas
    const ranking = ativas.map(p => ({ ...p, stats: getStats(p.id) })).sort((a, b) => b.stats.diasTrabalhados - a.stats.diasTrabalhados)
    const alertas = []
    ranking.forEach(p => {
      if (p.stats.diasSemana < 5) alertas.push({ tipo: 'warning', msg: `${p.nome} — só ${p.stats.diasSemana} dia(s) esta semana` })
      if (p.stats.saldo > 100) alertas.push({ tipo: 'danger', msg: `${p.nome} — saldo: ${formatCurrency(p.stats.saldo)}` })
    })
    return { totalAtivas: ativas.length, ranking, alertas }
  }, [pessoasAtivas, getStats])

  // Modal wrapper
  const Modal = ({ title, children, onClose }) => (
    <div style={css.overlay} onClick={onClose}><div style={css.modal} onClick={e => e.stopPropagation()}>
      <div style={css.modalH}>{title}<button onClick={onClose} style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer' }}><I d={ic.close} /></button></div>
      {children}
    </div></div>
  )

  // ═══════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════
  if (loading) return <div style={{ ...css.wrap, alignItems: 'center', justifyContent: 'center' }}><div style={{ color: T.dim }}>Carregando...</div></div>

  if (!user) {
    return (
      <div style={{ ...css.wrap, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ ...css.logo, width: 50, height: 50, fontSize: 18, margin: '0 auto 12px' }}>CP</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Disparo CinePlay</div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Digite a senha para entrar</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={css.input} type="password" placeholder="Senha" value={loginSenha} onChange={e => setLoginSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
            {loginError && <div style={{ fontSize: 12, color: T.red, textAlign: 'center' }}>{loginError}</div>}
            <button style={{ ...css.btn('primary'), width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14 }} onClick={handleLogin}>
              <I d={ic.lock} color="#fff" /> Entrar
            </button>
            <div style={{ fontSize: 10, color: T.dim, textAlign: 'center', marginTop: 4 }}>Gestor ou Funcionário</div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // FUNCIONÁRIO VIEW (só disparos)
  // ═══════════════════════════════════════
  if (!isAdmin) {
    // Funcionario needs to pick their name
    if (!dispPessoa) {
      return (
        <div style={css.wrap}>
          <div style={css.header}>
            <div style={css.logo}>CP</div>
            <div style={css.title}>Disparo CinePlay</div>
            <button onClick={handleLogout} style={css.btn('ghost')}><I d={ic.logout} size={14} color={T.dim} />Sair</button>
          </div>
          <div style={css.body}>
            <div style={css.cardH}><I d={ic.send} color={T.purple} /> Selecione seu nome</div>
            {pessoasAtivas.length === 0 ? (
              <div style={{ ...css.card, textAlign: 'center', color: T.dim, padding: 30 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                <div>Nenhum funcionário cadastrado ainda.</div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Peça ao gestor para te adicionar.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pessoasAtivas.map(p => {
                  const lh = listas.filter(l => l.usuario_id === p.id && l.data === today())
                  const nums = numeros.filter(n => lh.some(l => l.id === n.lista_id))
                  const tot = nums.length; const sent = nums.filter(n => n.enviado).length
                  const has = tot > 0; const done = has && sent === tot
                  return (
                    <button key={p.id} onClick={() => setDispPessoa(p.id)}
                      style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: T.r2, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: T.font, color: T.text }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: done ? T.greenGlow : has ? T.purpleGlow : T.s2, border: `2px solid ${done ? T.green : has ? T.purple : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {done ? <I d={ic.check} size={20} color={T.green} /> : <span style={{ fontSize: 16, fontWeight: 700, color: has ? T.purple : T.dim }}>{p.nome[0]}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: T.dim }}>{done ? '✅ Concluída' : has ? `${sent}/${tot} enviados` : 'Sem lista hoje'}</div>
                      </div>
                      <I d={ic.right} color={T.dim} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    }

    // Funcionario disparo view
    const pessoa = usuarios.find(u => u.id === dispPessoa)
    if (!pessoa) {
      return (
        <div style={css.wrap}>
          <div style={css.header}>
            <button onClick={() => setDispPessoa(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><I d={ic.left} color={T.dim} /></button>
            <div style={css.title}>Carregando...</div>
          </div>
          <div style={css.body}><div style={{ textAlign: 'center', color: T.dim, padding: 30 }}>Carregando dados...</div></div>
        </div>
      )
    }
    const minhasListas = listas.filter(l => l.usuario_id === pessoa.id && l.data === today())
    const meusNumeros = numeros.filter(n => minhasListas.some(l => l.id === n.lista_id))
    const pendentes = meusNumeros.filter(n => !n.enviado)
    const enviados = meusNumeros.filter(n => n.enviado)
    const totalNums = meusNumeros.length
    const allDone = totalNums > 0 && pendentes.length === 0

    // Historico
    const histDates = [...new Set(listas.filter(l => l.usuario_id === pessoa.id).map(l => l.data))].sort((a, b) => b.localeCompare(a))

    const openWhatsApp = (numero, numId, mensagem) => {
      const fullNum = '55' + numero
      const encoded = encodeURIComponent(mensagem)
      window.open(`https://wa.me/${fullNum}?text=${encoded}`, '_blank')
      setCopiedId(numId)
      setTimeout(() => setCopiedId(null), 1500)
      marcarEnviado(numId)
      setMsgPicker(null)
    }

    return (
      <div style={css.wrap}>
        <div style={css.header}>
          <button onClick={() => setDispPessoa(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><I d={ic.left} color={T.dim} /></button>
          <div style={css.title}>{pessoa.nome}</div>
          <button onClick={handleLogout} style={css.btn('ghost')}><I d={ic.logout} size={14} color={T.dim} />Sair</button>
        </div>
        <div style={css.body}>
          {/* TIMER CONTROLS */}
          {totalNums > 0 && !allDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: T.s1, borderRadius: T.r, border: `1px solid ${timerRunning ? T.green + '44' : T.border}` }}>
              {!timerRunning ? (
                <button onClick={() => startTimer(pessoa.id)} style={{ ...css.btn('success'), padding: '8px 16px' }}>▶ Play</button>
              ) : (
                <button onClick={pauseTimer} style={{ ...css.btn('ghost'), padding: '8px 16px', border: `1px solid ${T.amber}44`, color: T.amber }}>⏸ Pause</button>
              )}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: timerRunning ? T.green : T.dim }}>{getTimerDisplay()}</div>
              </div>
              {timerRunning && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, animation: 'pulse 1.5s infinite' }} />}
            </div>
          )}
          {getTotalTempoHoje(pessoa.id) && !timerRunning && (
            <div style={{ fontSize: 11, color: T.dim, marginBottom: 8, textAlign: 'center' }}>Tempo total hoje: {getTotalTempoHoje(pessoa.id)}</div>
          )}

          {/* Progress */}
          {totalNums > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.dim }}>Progresso de hoje</span>
                <span style={css.badge(allDone ? T.green : T.purple, allDone ? T.greenGlow : T.purpleGlow)}>{enviados.length}/{totalNums}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: T.s2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(enviados.length / totalNums) * 100}%`, borderRadius: 3, background: allDone ? T.green : `linear-gradient(90deg, ${T.purple}, ${T.blue})`, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {/* ALL DONE */}
          {allDone && (
            <div style={{ ...css.card, textAlign: 'center', padding: 30, border: `1px solid ${T.green}33` }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.green, marginBottom: 4 }}>Lista concluída!</div>
              <div style={{ fontSize: 12, color: T.dim }}>Todos os {totalNums} números enviados. Dia marcado!</div>
              {getTotalTempoHoje(pessoa.id) && <div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>Tempo total: {getTotalTempoHoje(pessoa.id)}</div>}
            </div>
          )}

          {/* NO LIST */}
          {totalNums === 0 && (
            <div style={{ ...css.card, textAlign: 'center', padding: 30 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Sem lista pra hoje</div>
              <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Aguarde o gestor adicionar sua lista.</div>
            </div>
          )}

          {/* BLOQUEIO BUTTON */}
          {totalNums > 0 && !allDone && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setShowBloqueioMenu(!showBloqueioMenu)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: T.r, background: T.redGlow, border: `1px solid ${T.red}33`, cursor: 'pointer', fontFamily: T.font, fontSize: 12, fontWeight: 500, color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                🚫 Reportar Bloqueio
              </button>
              {showBloqueioMenu && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => reportarBloqueio(pessoa.id, '24h')}
                    style={{ ...css.btn('ghost'), flex: 1, justifyContent: 'center', border: `1px solid ${T.amber}44`, color: T.amber, fontSize: 11 }}>
                    ⏰ Bloqueio 24h
                  </button>
                  <button onClick={() => reportarBloqueio(pessoa.id, 'permanente')}
                    style={{ ...css.btn('ghost'), flex: 1, justifyContent: 'center', border: `1px solid ${T.red}44`, color: T.red, fontSize: 11 }}>
                    🔒 Permanente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PENDING */}
          {pendentes.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500, marginBottom: 8 }}>A enviar ({pendentes.length})</div>
              {pendentes.map(n => (
                <button key={n.id} onClick={() => setMsgPicker({ numero: n.numero, id: n.id })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 4, borderRadius: T.r, background: copiedId === n.id ? T.greenGlow : T.s1, border: `1px solid ${copiedId === n.id ? T.green : T.border}`, cursor: 'pointer', fontFamily: T.font, color: T.text, textAlign: 'left' }}>
                  <WaIcon />
                  <div style={{ flex: 1 }}><div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 600 }}>{formatPhone(n.numero)}</div></div>
                  <div style={{ fontSize: 10, color: copiedId === n.id ? T.green : T.dim }}>{copiedId === n.id ? '✓ Enviado!' : 'Escolher msg'}</div>
                </button>
              ))}
            </div>
          )}

          {/* MESSAGE PICKER MODAL - moved to render below */}

          {/* SENT today */}
          {enviados.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setShowEnviados(!showEnviados)} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', fontFamily: T.font, color: T.dim, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <I d={showEnviados ? ic.up : ic.down} size={16} color={T.dim} />Enviados hoje ({enviados.length})
              </button>
              {showEnviados && enviados.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 2, borderRadius: T.r, background: T.s2, opacity: 0.7 }}>
                  <I d={ic.check} size={14} color={T.green} />
                  <div style={{ fontFamily: T.mono, fontSize: 13, flex: 1 }}>{formatPhone(n.numero)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Historico (funcionário) */}
          <HistoricoSection pessoaId={pessoa.id} listas={listas} numeros={numeros} />
          <GanhosMensais pessoaId={pessoa.id} registros={registros} pagamentos={pagamentos} usuarios={usuarios} />
        </div>
        {/* MESSAGE PICKER - bottom sheet */}
        {msgPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 9999 }} onClick={() => setMsgPicker(null)}>
            <div style={{ background: T.s1, borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 14px" }} />
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Escolha a mensagem</div>
              <div style={{ fontSize: 13, color: T.dim, fontFamily: T.mono, marginBottom: 14 }}>{formatPhone(msgPicker.numero)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MENSAGENS.map(msg => (
                  <button key={msg.id} onClick={() => openWhatsApp(msgPicker.numero, msgPicker.id, msg.texto)}
                    style={{ width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: T.r, background: T.s2, border: `2px solid ${msg.color}33`, cursor: "pointer", fontFamily: T.font, color: T.text }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: msg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: msg.color }}>{msg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {msg.texto.replace(/\n/g, " ")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════
  // ADMIN VIEW (tudo)
  // ═══════════════════════════════════════
  
  // Add pessoa modal (admin creates funcionario)
  const NovaPessoaModal = ({ pessoa, onClose }) => {
    const [nome, setNome] = useState(pessoa?.nome || '')
    const [valor, setValor] = useState(pessoa?.valor_dia || 15)
    const [status, setStatus] = useState(pessoa?.status || 'ATIVO')
    const [saving, setSaving] = useState(false)
    return (
      <Modal title={pessoa ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label style={{ fontSize: 11, color: T.dim, display: 'block', marginBottom: 3 }}>Nome</label>
            <input style={css.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" autoFocus /></div>
          <div><label style={{ fontSize: 11, color: T.dim, display: 'block', marginBottom: 3 }}>Valor por dia (R$)</label>
            <input style={css.input} type="number" value={valor} onChange={e => setValor(e.target.value)} /></div>
          {pessoa && <div><label style={{ fontSize: 11, color: T.dim, display: 'block', marginBottom: 3 }}>Status</label>
            <select style={{ ...css.select, width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button disabled={saving} style={css.btn('primary')} onClick={async () => {
              if (!nome.trim()) return
              setSaving(true)
              if (pessoa) {
                await editarUsuario(pessoa.id, nome, valor, status)
              } else {
                // Create with dummy email/password (not used for login)
                const dummyEmail = nome.toLowerCase().replace(/\s+/g, '.') + '@func.cineplay'
                await criarFuncionario(nome, dummyEmail, 'func123', valor)
              }
              setSaving(false); onClose()
            }}><I d={ic.check} color="#fff" />{saving ? 'Salvando...' : pessoa ? 'Salvar' : 'Adicionar'}</button>
            {pessoa && <button style={css.btn('danger')} onClick={async () => { if (confirm(`Excluir ${pessoa.nome}?`)) { await deletarUsuario(pessoa.id); onClose() } }}><I d={ic.del} color={T.red} />Excluir</button>}
          </div>
        </div>
      </Modal>
    )
  }

  const PagamentoModal = ({ pessoa, onClose }) => {
    const [valor, setValor] = useState('')
    const [saving, setSaving] = useState(false)
    const st = getStats(pessoa.id)
    const hist = pagamentos.filter(pg => pg.usuario_id === pessoa.id).sort((a, b) => b.data.localeCompare(a.data))
    return (
      <Modal title={`Pagamento — ${pessoa.nome}`} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <div style={css.stat(T.blue, T.blueGlow)}><div style={css.statL}>Receber</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.blue }}>{formatCurrency(st.totalReceber)}</div></div>
            <div style={css.stat(T.green, T.greenGlow)}><div style={css.statL}>Pago</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.green }}>{formatCurrency(st.totalPago)}</div></div>
            <div style={css.stat(st.saldo > 0 ? T.amber : T.green, st.saldo > 0 ? T.amberGlow : T.greenGlow)}><div style={css.statL}>Saldo</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: st.saldo > 0 ? T.amber : T.green }}>{formatCurrency(st.saldo)}</div></div>
          </div>
          <input style={css.input} type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor R$" />
          {hist.length > 0 && <div style={{ maxHeight: 80, overflowY: 'auto' }}>{hist.slice(0, 5).map(pg => (
            <div key={pg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}><span style={{ color: T.dim }}>{formatDate(pg.data)}</span><span style={{ color: T.green, fontFamily: T.mono }}>{formatCurrency(pg.valor)}</span></div>
          ))}</div>}
          <button disabled={saving} style={css.btn('success')} onClick={async () => { if (!valor || Number(valor) <= 0) return; setSaving(true); await addPagamento(pessoa.id, valor); setSaving(false); onClose() }}><I d={ic.pay} color={T.green} />{saving ? '...' : 'Registrar'}</button>
        </div>
      </Modal>
    )
  }

  // ─── Admin Disparos ───
  const DisparosTab = () => {
    const [showHist, setShowHist] = useState(false)
    const [expandedDate, setExpandedDate] = useState(null)

    if (!dispPessoa) {
      return (
        <div>
          <div style={css.cardH}><I d={ic.send} color={T.purple} /> Selecione o funcionário</div>
          {pessoasAtivas.length === 0 ? (
            <div style={{ ...css.card, textAlign: 'center', color: T.dim, padding: 30 }}>Nenhum funcionário ativo.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pessoasAtivas.map(p => {
                const lh = listas.filter(l => l.usuario_id === p.id && l.data === today())
                const nums = numeros.filter(n => lh.some(l => l.id === n.lista_id))
                const tot = nums.length; const sent = nums.filter(n => n.enviado).length
                const has = tot > 0; const done = has && sent === tot
                return (
                  <button key={p.id} onClick={() => { setDispPessoa(p.id); setShowEnviados(false); setAddingList(false) }}
                    style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: T.r2, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: T.font, color: T.text }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: done ? T.greenGlow : has ? T.purpleGlow : T.s2, border: `2px solid ${done ? T.green : has ? T.purple : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done ? <I d={ic.check} size={20} color={T.green} /> : <span style={{ fontSize: 16, fontWeight: 700, color: has ? T.purple : T.dim }}>{p.nome[0]}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: T.dim }}>{done ? '✅ Concluída' : has ? `${sent}/${tot} enviados` : 'Sem lista'}</div>
                    </div>
                    <I d={ic.right} color={T.dim} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const pessoa = usuarios.find(u => u.id === dispPessoa)
    if (!pessoa) { setDispPessoa(null); return null }

    const pListas = listas.filter(l => l.usuario_id === pessoa.id && l.data === today())
    const pNums = numeros.filter(n => pListas.some(l => l.id === n.lista_id))
    const pendentes = pNums.filter(n => !n.enviado)
    const enviados_ = pNums.filter(n => n.enviado)
    const totalNums = pNums.length
    const allDone = totalNums > 0 && pendentes.length === 0

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setDispPessoa(null)} style={{ ...css.btn('ghost'), padding: 6 }}><I d={ic.left} color={T.dim} /></button>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{pessoa.nome}</div><div style={{ fontSize: 11, color: T.dim }}>{formatDate(today())}</div></div>
          {totalNums > 0 && <div style={css.badge(allDone ? T.green : T.purple, allDone ? T.greenGlow : T.purpleGlow)}>{enviados_.length}/{totalNums}</div>}
        </div>

        {totalNums > 0 && <div style={{ height: 6, borderRadius: 3, background: T.s2, marginBottom: 16, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(enviados_.length / totalNums) * 100}%`, borderRadius: 3, background: allDone ? T.green : `linear-gradient(90deg, ${T.purple}, ${T.blue})`, transition: 'width .3s' }} /></div>}

        {(allDone || totalNums === 0) && (
          <div style={{ ...css.card, textAlign: 'center', padding: 24, border: allDone ? `1px solid ${T.green}33` : undefined }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{allDone ? '🎉' : '📋'}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: allDone ? T.green : T.text, marginBottom: 10 }}>{allDone ? 'Lista concluída!' : 'Sem lista pra hoje'}</div>
            <button style={css.btn('primary')} onClick={() => setAddingList(true)}><I d={ic.add} color="#fff" />{allDone ? 'Nova Lista' : 'Adicionar Lista'}</button>
          </div>
        )}

        {addingList && (
          <div style={{ ...css.card, border: `1px solid ${T.blue}33` }}>
            <div style={css.cardH}><I d={ic.add} color={T.blue} />Nova Lista para {pessoa.nome}</div>
            <textarea style={{ ...css.input, minHeight: 120, resize: 'vertical', fontFamily: T.mono }} value={newNumbers} onChange={e => setNewNumbers(e.target.value)} placeholder={'11999887766\n11988776655'} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={css.btn('primary')} onClick={async () => { await addLista(pessoa.id, newNumbers); setNewNumbers(''); setAddingList(false) }}><I d={ic.check} color="#fff" />Adicionar</button>
              <button style={css.btn('ghost')} onClick={() => { setAddingList(false); setNewNumbers('') }}>Cancelar</button>
            </div>
            {newNumbers.trim() && <div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>{newNumbers.split(/[\n,;]+/).map(n => { let c = n.replace(/\D/g, '').trim(); if (c.length >= 12 && c.startsWith('55')) c = c.slice(2); return c; }).filter(n => n.length >= 10 && n.length <= 11).length} números válidos</div>}
          </div>
        )}

        {pendentes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', marginBottom: 8 }}>A enviar ({pendentes.length})</div>
            {pendentes.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 2, borderRadius: T.r, background: T.s1, border: `1px solid ${T.border}` }}>
                <I d={ic.send} size={14} color={T.purple} />
                <div style={{ fontFamily: T.mono, fontSize: 14, flex: 1 }}>{formatPhone(n.numero)}</div>
                <span style={{ fontSize: 10, color: T.dim }}>Pendente</span>
              </div>
            ))}
          </div>
        )}

        {enviados_.length > 0 && (
          <div>
            <button onClick={() => setShowEnviados(!showEnviados)} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', fontFamily: T.font, color: T.dim, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <I d={showEnviados ? ic.up : ic.down} size={16} color={T.dim} />Enviados ({enviados_.length})
            </button>
            {showEnviados && enviados_.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', marginBottom: 2, borderRadius: T.r, background: T.s2, opacity: 0.7 }}>
                <I d={ic.check} size={14} color={T.green} /><div style={{ fontFamily: T.mono, fontSize: 12, flex: 1 }}>{formatPhone(n.numero)}</div>
              </div>
            ))}
          </div>
        )}

        {!addingList && totalNums > 0 && !allDone && <button style={{ ...css.btn('ghost'), width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setAddingList(true)}><I d={ic.add} color={T.dim} />Mais números</button>}

        <HistoricoSection pessoaId={pessoa.id} listas={listas} numeros={numeros} />
        <BloqueioHistorico pessoaId={pessoa.id} bloqueios={bloqueios} />
        <TempoHistorico pessoaId={pessoa.id} sessoes={sessoes} />
        <GanhosMensais pessoaId={pessoa.id} registros={registros} pagamentos={pagamentos} usuarios={usuarios} />
      </div>
    )
  }

  // Tabs config
  const adminTabs = [
    { id: 'disparos', label: 'Disparos', icon: ic.send },
    { id: 'registro', label: 'Registro', icon: ic.cal },
    { id: 'dashboard', label: 'Dashboard', icon: ic.dash },
    { id: 'equipe', label: 'Equipe', icon: ic.people },
    { id: 'pagamentos', label: 'Pagam.', icon: ic.pay },
    { id: 'ranking', label: 'Ranking', icon: ic.rank },
  ]

  return (
    <div style={css.wrap}>
      <div style={css.header}>
        <div style={css.logo}>CP</div>
        <div style={css.title}>Disparo CinePlay</div>
        <span style={css.badge(T.blue, T.blueGlow)}>Admin</span>
        <button onClick={handleLogout} style={css.btn('ghost')}><I d={ic.logout} size={14} color={T.dim} /></button>
      </div>
      <div style={css.nav}>{adminTabs.map(t => <button key={t.id} style={css.navBtn(tab === t.id)} onClick={() => setTab(t.id)}><I d={t.icon} size={14} color={tab === t.id ? T.blue : T.dim} />{t.label}</button>)}</div>
      <div style={css.body}>
        {(tab === 'equipe' || tab === 'pagamentos' || tab === 'dashboard') && (
          <div style={css.filters}>
            <select style={css.select} value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}><option value="semana">Semana</option><option value="mes">Mês</option><option value="tudo">Tudo</option></select>
            <select style={css.select} value={filterPessoa} onChange={e => setFilterPessoa(e.target.value)}><option value="todos">Todas</option>{pessoasAtivas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            {tab === 'equipe' && <select style={css.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="todos">Todos</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select>}
          </div>
        )}

        {tab === 'disparos' && <DisparosTab />}
        {tab === 'registro' && <RegistroTab weekDates={weekDates} shiftWeek={shiftWeek} pessoasAtivas={pessoasAtivas} getRegistro={getRegistro} toggleRegistro={toggleRegistro} getDayLabel={getDayLabel} />}
        {tab === 'dashboard' && <DashboardTab dashStats={dashStats} />}
        {tab === 'equipe' && <EquipeTab pessoasFiltradas={pessoasFiltradas} getStats={getStats} setModal={setModal} />}
        {tab === 'pagamentos' && <PagamentosTab pagamentos={pagamentos} usuarios={usuarios} filterPessoa={filterPessoa} pessoasAtivas={pessoasAtivas} setModal={setModal} getStats={getStats} />}
        {tab === 'ranking' && <RankingTab pessoasAtivas={pessoasAtivas} getStats={getStats} />}
      </div>

      {modal?.type === 'addPessoa' && <NovaPessoaModal onClose={() => setModal(null)} />}
      {modal?.type === 'editPessoa' && <NovaPessoaModal pessoa={modal.pessoa} onClose={() => setModal(null)} />}
      {modal?.type === 'pagamento' && <PagamentoModal pessoa={modal.pessoa} onClose={() => setModal(null)} />}

      {/* Floating add button */}
      <button onClick={() => setModal({ type: 'addPessoa' })} style={{ position: 'fixed', bottom: 20, right: 20, width: 50, height: 50, borderRadius: '50%', background: T.blue, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,143,247,.4)', zIndex: 50 }}>
        <I d={ic.add} size={24} color="#fff" />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function HistoricoSection({ pessoaId, listas, numeros }) {
  const [showHist, setShowHist] = useState(false)
  const [expandedDate, setExpandedDate] = useState(null)
  const histDates = [...new Set(listas.filter(l => l.usuario_id === pessoaId).map(l => l.data))].sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
      <button onClick={() => setShowHist(!showHist)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontFamily: T.font, color: T.text, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
        <I d={showHist ? ic.up : ic.down} size={16} color={T.dim} />
        Histórico ({histDates.length} dias)
      </button>
      {showHist && (
        <div style={{ marginTop: 8 }}>
          {histDates.length === 0 ? <div style={{ fontSize: 12, color: T.dim }}>Nenhum disparo.</div> :
            histDates.map(dateStr => {
              const dListas = listas.filter(l => l.usuario_id === pessoaId && l.data === dateStr)
              const dNums = numeros.filter(n => dListas.some(l => l.id === n.lista_id))
              const tot = dNums.length; const snt = dNums.filter(n => n.enviado).length
              const isExp = expandedDate === dateStr
              return (
                <div key={dateStr} style={{ marginBottom: 6 }}>
                  <button onClick={() => setExpandedDate(isExp ? null : dateStr)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: T.r, background: isExp ? T.s2 : T.s1, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: T.font, color: T.text, textAlign: 'left' }}>
                    <I d={isExp ? ic.up : ic.down} size={14} color={T.dim} />
                    <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(dateStr)}</span>{dateStr === today() && <span style={{ fontSize: 10, color: T.blue, marginLeft: 6 }}>hoje</span>}</div>
                    <span style={css.badge(snt === tot ? T.green : T.amber, snt === tot ? T.greenGlow : T.amberGlow)}>{snt}/{tot}</span>
                  </button>
                  {isExp && (
                    <div style={{ padding: '8px 12px', background: T.s2, borderRadius: `0 0 ${T.r} ${T.r}`, marginTop: -1, border: `1px solid ${T.border}`, borderTop: 'none' }}>
                      {dNums.map(n => (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12, fontFamily: T.mono, borderBottom: `1px solid ${T.border}15` }}>
                          <I d={n.enviado ? ic.check : ic.close} size={12} color={n.enviado ? T.green : T.red} />
                          {formatPhone(n.numero)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

function RegistroTab({ weekDates, shiftWeek, pessoasAtivas, getRegistro, toggleRegistro, getDayLabel }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={() => shiftWeek(-1)} style={{ ...css.btn('ghost'), padding: 6 }}><I d={ic.left} color={T.dim} /></button>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(weekDates[0])} a {formatDate(weekDates[6])}</div></div>
        <button onClick={() => shiftWeek(1)} style={{ ...css.btn('ghost'), padding: 6 }}><I d={ic.right} color={T.dim} /></button>
      </div>
      {pessoasAtivas.length === 0 ? <div style={{ ...css.card, textAlign: 'center', color: T.dim }}>Nenhuma pessoa.</div> : (
        <div style={{ overflowX: 'auto' }}><table style={css.table}><thead><tr>
          <th style={{ ...css.th, position: 'sticky', left: 0, background: T.s1, zIndex: 2, minWidth: 90 }}>Nome</th>
          {weekDates.map(d => <th key={d} style={{ ...css.th, textAlign: 'center', minWidth: 48, background: d === today() ? T.blueGlow : 'transparent' }}><div style={{ color: d === today() ? T.blue : T.dim }}>{getDayLabel(d)}</div><div style={{ fontFamily: T.mono, fontSize: 9 }}>{d.slice(8)}</div></th>)}
          <th style={{ ...css.th, textAlign: 'center' }}>Sem</th>
        </tr></thead><tbody>{pessoasAtivas.map(p => {
          const wc = weekDates.filter(d => getRegistro(p.id, d)?.concluiu).length
          return <tr key={p.id}>
            <td style={{ ...css.td, fontWeight: 500, position: 'sticky', left: 0, background: T.s1, zIndex: 1, fontSize: 13 }}>{p.nome}</td>
            {weekDates.map(d => { const on = getRegistro(p.id, d)?.concluiu || false; return <td key={d} style={{ ...css.td, textAlign: 'center', background: d === today() ? T.blueGlow : 'transparent' }}><button style={css.chk(on)} onClick={() => toggleRegistro(p.id, d)}>{on && <I d={ic.check} size={16} color={T.green} />}</button></td> })}
            <td style={{ ...css.td, textAlign: 'center', fontFamily: T.mono, fontWeight: 600, color: wc >= 5 ? T.green : wc >= 3 ? T.amber : T.red }}>{wc}</td>
          </tr>
        })}</tbody></table></div>
      )}
    </div>
  )
}

function DashboardTab({ dashStats }) {
  return (
    <div>
      <div style={css.grid}>
        <div style={css.stat(T.blue, T.blueGlow)}><div style={css.statL}>Ativas</div><div style={css.statV(T.blue)}>{dashStats.totalAtivas}</div></div>
        <div style={css.stat(T.green, T.greenGlow)}><div style={css.statL}>Top</div><div style={{ fontSize: 13, fontWeight: 600, color: T.green }}>{dashStats.ranking[0]?.nome || '—'}</div></div>
        <div style={css.stat(T.amber, T.amberGlow)}><div style={css.statL}>Alertas</div><div style={css.statV(T.amber)}>{dashStats.alertas.length}</div></div>
      </div>
      {dashStats.alertas.length > 0 && <div style={css.card}><div style={css.cardH}><I d={ic.warn} color={T.amber} />Alertas</div>{dashStats.alertas.map((a, i) => <div key={i} style={css.alert(a.tipo)}><I d={ic.warn} size={14} color={a.tipo === 'danger' ? T.red : T.amber} />{a.msg}</div>)}</div>}
      <div style={css.card}><div style={css.cardH}><I d={ic.rank} color={T.purple} />Ranking</div>
        {dashStats.ranking.map((p, i) => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}15` }}>
          <div style={css.rnk(i)}>{i + 1}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{p.nome}</div><div style={{ fontSize: 10, color: T.dim }}>{p.stats.diasTrabalhados}d • {formatCurrency(p.stats.totalReceber)}</div></div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: p.stats.saldo > 0 ? T.amber : T.green }}>{p.stats.saldo > 0 ? formatCurrency(p.stats.saldo) : '✓'}</div>
        </div>)}
      </div>
    </div>
  )
}

function EquipeTab({ pessoasFiltradas, getStats, setModal }) {
  return (
    <div>
      {pessoasFiltradas.length === 0 ? <div style={{ ...css.card, textAlign: 'center', color: T.dim }}>Nenhuma pessoa.</div> : (
        <div style={{ overflowX: 'auto' }}><table style={css.table}><thead><tr><th style={css.th}>Nome</th><th style={css.th}>Status</th><th style={css.th}>Dias</th><th style={css.th}>Saldo</th><th style={css.th}></th></tr></thead>
          <tbody>{pessoasFiltradas.map(p => { const st = getStats(p.id); return <tr key={p.id}>
            <td style={css.td}><div style={{ fontWeight: 500, fontSize: 13 }}>{p.nome}</div><div style={{ fontSize: 10, color: T.dim }}>{p.email}</div></td>
            <td style={css.td}><span style={css.badge(p.status === 'ATIVO' ? T.green : T.dim, p.status === 'ATIVO' ? T.greenGlow : T.s2)}>{p.status}</span></td>
            <td style={{ ...css.td, fontFamily: T.mono }}>{st.diasTrabalhados}</td>
            <td style={{ ...css.td, fontFamily: T.mono, color: st.saldo > 0 ? T.amber : T.green }}>{formatCurrency(st.saldo)}</td>
            <td style={css.td}><div style={{ display: 'flex', gap: 4 }}>
              <button style={css.btn('ghost')} onClick={() => setModal({ type: 'editPessoa', pessoa: p })}><I d={ic.edit} size={13} /></button>
              <button style={css.btn('success')} onClick={() => setModal({ type: 'pagamento', pessoa: p })}><I d={ic.pay} size={13} color={T.green} /></button>
            </div></td>
          </tr> })}</tbody></table></div>
      )}
    </div>
  )
}

function PagamentosTab({ pagamentos, usuarios, filterPessoa, pessoasAtivas, setModal, getStats }) {
  const list = pagamentos.map(pg => ({ ...pg, pessoa: usuarios.find(u => u.id === pg.usuario_id) })).filter(pg => pg.pessoa && (filterPessoa === 'todos' || pg.usuario_id === filterPessoa)).sort((a, b) => b.data.localeCompare(a.data))
  const total = list.reduce((s, pg) => s + Number(pg.valor), 0)
  const pendentes = pessoasAtivas.map(p => ({ ...p, stats: getStats(p.id) })).filter(p => p.stats.saldo > 0).sort((a, b) => b.stats.saldo - a.stats.saldo)
  const totalPendente = pendentes.reduce((s, p) => s + p.stats.saldo, 0)
  return (
    <div>
      {/* PAGAMENTOS PENDENTES */}
      {pendentes.length > 0 && (
        <div style={{ ...css.card, border: `1px solid ${T.amber}25` }}>
          <div style={{ ...css.cardH, marginBottom: 10 }}><I d={ic.warn} color={T.amber} />Pagamentos Pendentes</div>
          {pendentes.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.border}15` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{p.nome}</div>
                <div style={{ fontSize: 10, color: T.dim }}>{p.stats.diasTrabalhados} dias trabalhados</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.amber, marginRight: 8 }}>{formatCurrency(p.stats.saldo)}</div>
              <button style={css.btn('success')} onClick={() => setModal({ type: 'pagamento', pessoa: p })}><I d={ic.pay} size={13} color={T.green} />Pagar</button>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: 10, background: T.amberGlow, borderRadius: T.r, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Total Pendente</span>
            <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.amber, fontSize: 16 }}>{formatCurrency(totalPendente)}</span>
          </div>
        </div>
      )}
      {pendentes.length === 0 && (
        <div style={{ ...css.card, textAlign: 'center', border: `1px solid ${T.green}25`, padding: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.green }}>Nenhum pagamento pendente!</div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Todos os funcionários estão em dia.</div>
        </div>
      )}

      {/* HISTORICO */}
      <div style={css.cardH}><I d={ic.pay} color={T.green} />Histórico ({list.length})</div>
      {list.length === 0 ? <div style={{ ...css.card, textAlign: 'center', color: T.dim }}>Nenhum.</div> : <>
        <div style={{ overflowX: 'auto' }}><table style={css.table}><thead><tr><th style={css.th}>Data</th><th style={css.th}>Pessoa</th><th style={css.th}>Valor</th></tr></thead>
          <tbody>{list.map(pg => <tr key={pg.id}><td style={{ ...css.td, fontFamily: T.mono }}>{formatDate(pg.data)}</td><td style={{ ...css.td, fontWeight: 500 }}>{pg.pessoa?.nome}</td><td style={{ ...css.td, fontFamily: T.mono, color: T.green, fontWeight: 600 }}>{formatCurrency(pg.valor)}</td></tr>)}</tbody>
        </table></div>
        <div style={{ marginTop: 10, padding: 10, background: T.greenGlow, borderRadius: T.r, display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12 }}>Total</span><span style={{ fontFamily: T.mono, fontWeight: 700, color: T.green }}>{formatCurrency(total)}</span></div>
      </>}
      {pessoasAtivas.length > 0 && <div style={{ ...css.card, marginTop: 12 }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{pessoasAtivas.map(p => <button key={p.id} style={css.btn('success')} onClick={() => setModal({ type: 'pagamento', pessoa: p })}>{p.nome}</button>)}</div></div>}
    </div>
  )
}

function RankingTab({ pessoasAtivas, getStats }) {
  const [sortBy, setSortBy] = useState('dias')
  const ranked = pessoasAtivas.map(p => ({ ...p, stats: getStats(p.id) })).sort((a, b) => sortBy === 'dias' ? b.stats.diasTrabalhados - a.stats.diasTrabalhados : b.stats.totalReceber - a.stats.totalReceber)
  const max = ranked[0]?.stats[sortBy === 'dias' ? 'diasTrabalhados' : 'totalReceber'] || 1
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={css.cardH}><I d={ic.star} color={T.amber} />Ranking</div>
        <div style={{ display: 'flex', gap: 4 }}><button style={css.btn(sortBy === 'dias' ? 'primary' : 'ghost')} onClick={() => setSortBy('dias')}>Dias</button><button style={css.btn(sortBy === 'valor' ? 'primary' : 'ghost')} onClick={() => setSortBy('valor')}>Valor</button></div>
      </div>
      {ranked.map((p, i) => <div key={p.id} style={{ ...css.card, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
        <div style={{ ...css.rnk(i), width: 34, height: 34, background: i === 0 ? `linear-gradient(135deg, ${T.amber}, #f97316)` : T.s3, color: i < 1 ? '#fff' : T.dim }}>{i + 1}</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{p.nome}</div><div style={{ height: 5, borderRadius: 3, background: T.s2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${((sortBy === 'dias' ? p.stats.diasTrabalhados : p.stats.totalReceber) / max) * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${T.blue}, ${T.purple})` }} /></div></div>
        <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.blue }}>{sortBy === 'dias' ? `${p.stats.diasTrabalhados}d` : formatCurrency(p.stats.totalReceber)}</div>
      </div>)}
    </div>
  )
}

function GanhosMensais({ pessoaId, registros, pagamentos, usuarios }) {
  const [showGanhos, setShowGanhos] = useState(false)
  const pessoa = usuarios.find(u => u.id === pessoaId)
  const valorDia = pessoa?.valor_dia || 15

  // Group by month
  const meses = useMemo(() => {
    const map = {}
    // Count days worked per month
    registros.filter(r => r.usuario_id === pessoaId && r.concluiu).forEach(r => {
      const mes = r.data.slice(0, 7) // "2026-04"
      if (!map[mes]) map[mes] = { dias: 0, ganho: 0, pago: 0 }
      map[mes].dias++
      map[mes].ganho += Number(valorDia)
    })
    // Sum payments per month
    pagamentos.filter(p => p.usuario_id === pessoaId).forEach(p => {
      const mes = p.data.slice(0, 7)
      if (!map[mes]) map[mes] = { dias: 0, ganho: 0, pago: 0 }
      map[mes].pago += Number(p.valor)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([mes, data]) => ({ mes, ...data }))
  }, [registros, pagamentos, pessoaId, valorDia])

  const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const formatMes = (m) => {
    const [y, mo] = m.split('-')
    return `${mesesNomes[Number(mo) - 1]} ${y}`
  }

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
      <button onClick={() => setShowGanhos(!showGanhos)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontFamily: T.font, color: T.text, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
        <I d={showGanhos ? ic.up : ic.down} size={16} color={T.dim} />
        Ganhos por Mês ({meses.length})
      </button>
      {showGanhos && (
        <div style={{ marginTop: 8 }}>
          {meses.length === 0 ? (
            <div style={{ fontSize: 12, color: T.dim, padding: 8 }}>Nenhum registro ainda.</div>
          ) : meses.map(m => (
            <div key={m.mes} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 14, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{formatMes(m.mes)}</span>
                <span style={{ fontSize: 11, color: T.dim }}>{m.dias} dias</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div style={{ background: T.blueGlow, borderRadius: T.r, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', marginBottom: 2 }}>Ganhou</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.blue }}>{formatCurrency(m.ganho)}</div>
                </div>
                <div style={{ background: T.greenGlow, borderRadius: T.r, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', marginBottom: 2 }}>Recebeu</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.green }}>{formatCurrency(m.pago)}</div>
                </div>
                <div style={{ background: m.ganho - m.pago > 0 ? T.amberGlow : T.greenGlow, borderRadius: T.r, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', marginBottom: 2 }}>Saldo</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: m.ganho - m.pago > 0 ? T.amber : T.green }}>{formatCurrency(m.ganho - m.pago)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BloqueioHistorico({ pessoaId, bloqueios }) {
  const [show, setShow] = useState(false)
  const meus = bloqueios.filter(b => b.usuario_id === pessoaId)
  if (meus.length === 0) return null
  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
      <button onClick={() => setShow(!show)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontFamily: T.font, color: T.text, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
        <I d={show ? ic.up : ic.down} size={16} color={T.red} />
        🚫 Bloqueios ({meus.length})
      </button>
      {show && (
        <div style={{ marginTop: 8 }}>
          {meus.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4, borderRadius: T.r, background: T.s1, border: `1px solid ${b.tipo === 'permanente' ? T.red : T.amber}25` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.tipo === 'permanente' ? T.red : T.amber, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{b.tipo === '24h' ? 'Bloqueio 24h' : 'Bloqueio Permanente'}</div>
                <div style={{ fontSize: 10, color: T.dim }}>{formatDate(b.data)} às {b.hora}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TempoHistorico({ pessoaId, sessoes }) {
  const [show, setShow] = useState(false)
  const meus = sessoes.filter(s => s.usuario_id === pessoaId && s.segundos > 0)
  const porDia = {}
  meus.forEach(s => {
    if (!porDia[s.data]) porDia[s.data] = 0
    porDia[s.data] += s.segundos || 0
  })
  const dias = Object.entries(porDia).sort((a, b) => b[0].localeCompare(a[0]))
  if (dias.length === 0) return null
  const fmtTempo = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h > 0 ? h + 'h ' : ''}${m}min`
  }
  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
      <button onClick={() => setShow(!show)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', fontFamily: T.font, color: T.text, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
        <I d={show ? ic.up : ic.down} size={16} color={T.blue} />
        ⏱ Tempo de Trabalho ({dias.length} dias)
      </button>
      {show && (
        <div style={{ marginTop: 8 }}>
          {dias.map(([data, seg]) => (
            <div key={data} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 4, borderRadius: T.r, background: T.s1, border: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(data)}</span>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.blue }}>{fmtTempo(seg)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
