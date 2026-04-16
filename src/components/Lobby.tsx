import { useState } from 'react'
import { EMOJIS } from '../data'

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F7F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: 'white', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 420, border: '1px solid #EBEBF5' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoEmoji: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: 700, color: '#1A1A2E', margin: 0, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#6B6B8A', margin: '2px 0 0' },
  tabs: { display: 'flex', background: '#F7F7FB', borderRadius: 12, padding: 3, marginBottom: 24, gap: 3 },
  tab: { flex: 1, padding: '9px 8px', fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent', borderRadius: 10, color: '#A0A0B8', cursor: 'pointer' },
  tabActive: { flex: 1, padding: '9px 8px', fontSize: 13, fontWeight: 600, border: '1px solid #EBEBF5', background: 'white', borderRadius: 10, color: '#1A1A2E', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  hint: { fontSize: 13, color: '#6B6B8A', margin: 0, lineHeight: 1.5 },
  playersRow: { display: 'flex', gap: 12 },
  playerSetup: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emojiBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: '#F7F7FB', border: '1px solid #EBEBF5', borderRadius: 16, padding: 12, cursor: 'pointer', width: '100%' },
  emojiDisplay: { fontSize: 36 },
  emojiChange: { fontSize: 10, fontWeight: 600, color: '#6C63FF', textTransform: 'uppercase' as const },
  input: { width: '100%', border: '1px solid #EBEBF5', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#1A1A2E', background: 'white', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  codeInput: { width: '100%', border: '1.5px solid #EBEBF5', borderRadius: 12, padding: '14px 16px', fontSize: 20, fontWeight: 600, color: '#1A1A2E', background: '#F7F7FB', outline: 'none', boxSizing: 'border-box' as const, textAlign: 'center' as const, fontFamily: 'monospace' },
  label: { fontSize: 12, fontWeight: 600, color: '#A0A0B8', textTransform: 'uppercase' as const, letterSpacing: 0.5, margin: 0 },
  joinAsRow: { display: 'flex', gap: 10 },
  joinAsBtn: { flex: 1, padding: 12, border: '1.5px solid #EBEBF5', borderRadius: 12, background: 'white', fontSize: 14, fontWeight: 600, color: '#6B6B8A', cursor: 'pointer', fontFamily: 'inherit' },
  joinAsBtnActive: { flex: 1, padding: 12, border: '1.5px solid #6C63FF', borderRadius: 12, background: '#EEEDFE', fontSize: 14, fontWeight: 600, color: '#6C63FF', cursor: 'pointer', fontFamily: 'inherit' },
  primaryBtn: { width: '100%', padding: 15, background: '#6C63FF', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  error: { background: '#FEF0EB', border: '1px solid #F05A28', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#F05A28', margin: 0 },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: 20 },
  emojiPanel: { background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  emojiPanelTitle: { fontSize: 16, fontWeight: 700, color: '#1A1A2E', textAlign: 'center' as const, margin: '0 0 16px' },
  emojiGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' },
  emojiOption: { width: 52, height: 52, fontSize: 28, background: '#F7F7FB', border: '1px solid #EBEBF5', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}

interface Props {
  onCreateRoom: (n1: string, n2: string, e1: string, e2: string) => void
  onJoinRoom: (id: string, playerIdx: number) => void
  loading: boolean
  error: string
}

export function Lobby({ onCreateRoom, onJoinRoom, loading, error }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [emoji1, setEmoji1] = useState('👩')
  const [emoji2, setEmoji2] = useState('👨')
  const [emojiTarget, setEmojiTarget] = useState<1 | 2 | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinAs, setJoinAs] = useState<0 | 1>(0)

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <span style={s.logoEmoji}>💜</span>
          <div>
            <h1 style={s.title}>CouplePoints</h1>
            <p style={s.sub}>El hogar tiene reglas. Ahora tienen puntos.</p>
          </div>
        </div>
        <div style={s.tabs}>
          <button style={tab === 'create' ? s.tabActive : s.tab} onClick={() => setTab('create')}>Crear sala</button>
          <button style={tab === 'join' ? s.tabActive : s.tab} onClick={() => setTab('join')}>Unirme</button>
        </div>
        {tab === 'create' && (
          <div style={s.form}>
            <p style={s.hint}>Uno crea la sala y comparte el código con el otro.</p>
            <div style={s.playersRow}>
              {([1, 2] as const).map(n => {
                const emoji = n === 1 ? emoji1 : emoji2
                const name = n === 1 ? name1 : name2
                const setName = n === 1 ? setName1 : setName2
                return (
                  <div key={n} style={s.playerSetup}>
                    <button style={s.emojiBtn} onClick={() => setEmojiTarget(n)}>
                      <span style={s.emojiDisplay}>{emoji}</span>
                      <span style={s.emojiChange}>cambiar</span>
                    </button>
                    <input style={s.input} placeholder={`Nombre ${n}`} value={name} onChange={e => setName(e.target.value)} maxLength={16} />
                  </div>
                )
              })}
            </div>
            {error && <p style={s.error}>{error}</p>}
            <button style={s.primaryBtn} onClick={() => onCreateRoom(name1, name2, emoji1, emoji2)} disabled={!name1.trim() || !name2.trim() || loading}>
              {loading ? 'Creando...' : 'Crear sala'}
            </button>
          </div>
        )}
        {tab === 'join' && (
          <div style={s.form}>
            <p style={s.hint}>Introduce el código que te pasó tu pareja.</p>
            <input style={s.codeInput} placeholder="ej: hogar-4821" value={joinCode} onChange={e => setJoinCode(e.target.value)} autoCapitalize="none" />
            <p style={s.label}>¿Quién eres tú?</p>
            <div style={s.joinAsRow}>
              <button style={joinAs === 0 ? s.joinAsBtnActive : s.joinAsBtn} onClick={() => setJoinAs(0)}>Jugador 1</button>
              <button style={joinAs === 1 ? s.joinAsBtnActive : s.joinAsBtn} onClick={() => setJoinAs(1)}>Jugador 2</button>
            </div>
            {error && <p style={s.error}>{error}</p>}
            <button style={s.primaryBtn} onClick={() => onJoinRoom(joinCode, joinAs)} disabled={!joinCode.trim() || loading}>
              {loading ? 'Conectando...' : 'Unirme'}
            </button>
          </div>
        )}
      </div>
      {emojiTarget && (
        <div style={s.overlay} onClick={() => setEmojiTarget(null)}>
          <div style={s.emojiPanel} onClick={e => e.stopPropagation()}>
            <p style={s.emojiPanelTitle}>Elige un avatar</p>
            <div style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <button key={e} style={s.emojiOption} onClick={() => {
                  if (emojiTarget === 1) setEmoji1(e); else setEmoji2(e)
                  setEmojiTarget(null)
                }}>{e}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
