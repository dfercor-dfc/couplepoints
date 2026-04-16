import { useState } from 'react'
import { db, type RoomState, type PendingTask, type HistoryEntry, type Player } from '../firebase'
import { ref, update } from 'firebase/database'
import { TASKS, REWARDS, type Task, type Reward } from '../data'

interface Props {
  roomId: string
  myPlayer: number
  roomState: RoomState
  onLeave: () => void
}

type Tab = 'home' | 'earn' | 'spend' | 'history'

const C = {
  purple: '#6C63FF', purpleLight: '#EEEDFE', green: '#1DB97A', greenLight: '#E3F9EE',
  red: '#F05A28', redLight: '#FEF0EB', amber: '#F5A623', amberLight: '#FFF8E8',
  blue: '#185FA5', blueLight: '#EFF6FF', white: '#FFFFFF', bg: '#F7F7FB',
  text: '#1A1A2E', textSec: '#6B6B8A', textMut: '#A0A0B8', border: '#EBEBF5',
}

export function Game({ roomId, myPlayer, roomState, onLeave }: Props) {
  const [tab, setTab] = useState<Tab>('home')
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null)
  const [sent, setSent] = useState<Task | null>(null)
  const [success, setSuccess] = useState<Reward | null>(null)

  const { players, pending = [], history = [] } = roomState
  const me = players[myPlayer]
  const other = players[myPlayer === 0 ? 1 : 0]
  const toValidate = pending.filter(p => p.pendingFor === myPlayer && p.status === 'pending')
  const myPending = pending.filter(p => p.requestedBy === myPlayer && p.status === 'pending')

  async function submitTask(task: Task) {
    const newItem: PendingTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      taskName: task.name, taskIcon: task.icon, pts: task.pts,
      requestedBy: myPlayer, pendingFor: myPlayer === 0 ? 1 : 0,
      timestamp: Date.now(), status: 'pending',
    }
    await update(ref(db, `rooms/${roomId}`), { pending: [newItem, ...pending] })
  }

  async function approveTask(id: string) {
    const item = pending.find(p => p.id === id)
    if (!item) return
    const updatedPending = pending.map(p => p.id === id ? { ...p, status: 'approved' } : p)
    const updatedPlayers = players.map(p => p.id === item.requestedBy
      ? { ...p, points: p.points + item.pts, streak: (p.streak ?? 0) + 1, totalEarned: (p.totalEarned ?? 0) + item.pts }
      : p)
    const entry: HistoryEntry = { id: Date.now().toString(), type: 'earn', playerId: item.requestedBy, label: item.taskName, pts: item.pts, timestamp: Date.now(), validated: true }
    await update(ref(db, `rooms/${roomId}`), { pending: updatedPending, players: updatedPlayers, history: [entry, ...history].slice(0, 60) })
  }

  async function rejectTask(id: string) {
    const item = pending.find(p => p.id === id)
    if (!item) return
    const updatedPending = pending.map(p => p.id === id ? { ...p, status: 'rejected' } : p)
    const entry: HistoryEntry = { id: Date.now().toString(), type: 'rejected', playerId: item.requestedBy, label: item.taskName, pts: item.pts, timestamp: Date.now() }
    await update(ref(db, `rooms/${roomId}`), { pending: updatedPending, history: [entry, ...history].slice(0, 60) })
  }

  async function spendPoints(reward: Reward) {
    if (me.points < reward.cost) return
    const updatedPlayers = players.map(p => p.id === myPlayer
      ? { ...p, points: p.points - reward.cost, totalSpent: (p.totalSpent ?? 0) + reward.cost } : p)
    const entry: HistoryEntry = { id: Date.now().toString(), type: 'spend', playerId: myPlayer, label: reward.name, pts: reward.cost, timestamp: Date.now() }
    await update(ref(db, `rooms/${roomId}`), { players: updatedPlayers, history: [entry, ...history].slice(0, 60) })
  }

  async function resetPoints() {
    if (!window.confirm('¿Resetear puntos a cero? El historial se mantiene.')) return
    const updatedPlayers = players.map(p => ({ ...p, points: 0, streak: 0, totalEarned: 0, totalSpent: 0 }))
    await update(ref(db, `rooms/${roomId}`), { players: updatedPlayers })
  }

  async function resetHistory() {
    if (!window.confirm('¿Borrar todo el historial?')) return
    await update(ref(db, `rooms/${roomId}`), { history: [], pending: [] })
  }

  const modal = (content: React.ReactNode) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {content}
      </div>
    </div>
  )

  const homeTasks = TASKS.filter(t => t.category === 'home')
  const socialTasks = TASKS.filter(t => t.category === 'social')
  const total = players[0].points + players[1].points
  const pct0 = total > 0 ? Math.round((players[0].points / total) * 100) : 50

  const ValidateCards = () => (
    <>
      {toValidate.length > 0 && (
        <div style={{ margin: '0 16px 14px', background: C.amberLight, border: `1.5px solid ${C.amber}`, borderRadius: 16, padding: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', margin: '0 0 10px' }}>🔔 {other.emoji} {other.name} pide tu validación</p>
          {toValidate.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 10, padding: 10, marginBottom: 6, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 22 }}>{item.taskIcon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{item.taskName}</p>
                <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>+{item.pts} puntos</p>
              </div>
              <button onClick={() => rejectTask(item.id)} style={{ width: 36, height: 36, borderRadius: 18, background: C.redLight, border: 'none', fontSize: 14, fontWeight: 800, color: C.red, cursor: 'pointer' }}>✕</button>
              <button onClick={() => approveTask(item.id)} style={{ width: 36, height: 36, borderRadius: 18, background: C.greenLight, border: 'none', fontSize: 14, fontWeight: 800, color: C.green, cursor: 'pointer' }}>✓</button>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const renderHome = () => (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>CouplePoints</h1>
        <p style={{ fontSize: 13, color: C.textSec, margin: '2px 0 0' }}>El hogar tiene reglas, ahora también tiene puntos.</p>
      </div>
      <ValidateCards />
      <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px' }}>
        {players.map(p => (
          <div key={p.id} style={{ flex: 1, background: 'white', borderRadius: 16, padding: 16, textAlign: 'center', border: `${p.id === myPlayer ? 2 : 1.5}px solid ${p.id === myPlayer ? C.purple : C.border}` }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 6 }}>{p.emoji}</span>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textSec, margin: '0 0 4px' }}>{p.name}{p.id === myPlayer ? ' (tú)' : ''}</p>
            <p style={{ fontSize: 30, fontWeight: 700, color: C.purple, margin: 0 }}>{p.points}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', margin: '2px 0 0' }}>puntos</p>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.textMut, letterSpacing: 0.8, margin: '0 0 8px', textTransform: 'uppercase' }}>COMPARATIVA</p>
        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: C.text }}>{players[0].emoji} {players[0].name}</span>
            <span style={{ fontSize: 13, color: C.textSec }}>{players[0].points} pts</span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, margin: '8px 0', overflow: 'hidden' }}>
            <div style={{ height: 8, background: C.purple, borderRadius: 4, width: `${pct0}%`, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: C.text }}>{players[1].emoji} {players[1].name}</span>
            <span style={{ fontSize: 13, color: C.textSec }}>{players[1].points} pts</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 10 }}>
        <button onClick={resetPoints} style={{ flex: 1, padding: '10px 8px', background: 'white', border: `1px solid ${C.red}`, borderRadius: 12, fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>
          🔄 Resetear puntos
        </button>
        <button onClick={resetHistory} style={{ flex: 1, padding: '10px 8px', background: 'white', border: `1px solid ${C.textMut}`, borderRadius: 12, fontSize: 12, fontWeight: 600, color: C.textMut, cursor: 'pointer', fontFamily: 'inherit' }}>
          🗑️ Borrar historial
        </button>
      </div>
      {history.slice(0, 4).map(entry => {
        const player = players.find(p => p.id === entry.playerId)
        const isEarn = entry.type === 'earn'
        const isRej = entry.type === 'rejected'
        return (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: isRej ? C.textMut : isEarn ? C.green : C.red }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: isRej ? C.textMut : C.text, margin: 0, textDecoration: isRej ? 'line-through' : 'none' }}>{entry.label}</p>
              <p style={{ fontSize: 11, color: C.textMut, margin: '2px 0 0' }}>{player?.emoji} {player?.name}{isEarn && entry.validated ? ' · ✓ validado' : ''}{isRej ? ' · rechazado' : ''}</p>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: isRej ? C.textMut : isEarn ? C.green : C.red }}>{isEarn ? '+' : isRej ? '' : '-'}{entry.pts}</span>
          </div>
        )
      })}
      {history.length === 0 && toValidate.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 32px' }}>
          <p style={{ fontSize: 56, margin: '0 0 16px' }}>🎮</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>¡Empieza a jugar!</p>
          <p style={{ fontSize: 14, color: C.textSec, margin: 0 }}>Completa una tarea y pide validación a tu pareja.</p>
        </div>
      )}
    </div>
  )

  const renderEarn = () => (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Ganar puntos</h2>
        <p style={{ fontSize: 13, color: C.textSec, margin: '3px 0 0' }}>Pide validación a {other.emoji} {other.name}</p>
      </div>
      <ValidateCards />
      {myPending.length > 0 && (
        <div style={{ margin: '0 16px 14px', background: C.blueLight, borderRadius: 14, padding: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.blue, margin: '0 0 8px' }}>⏳ Esperando validación de {other.emoji} {other.name}</p>
          {myPending.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 8, padding: '8px 10px', marginBottom: 4 }}>
              <span>{item.taskIcon}</span>
              <span style={{ flex: 1, fontSize: 13, color: C.textSec }}>{item.taskName}</span>
              <span style={{ fontWeight: 700, color: C.blue }}>+{item.pts}</span>
            </div>
          ))}
        </div>
      )}
      {[{ label: 'TAREAS DEL HOGAR', tasks: homeTasks }, { label: 'PLANES INCÓMODOS', tasks: socialTasks }].map(({ label, tasks }) => (
        <div key={label} style={{ padding: '0 16px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMut, letterSpacing: 0.8, margin: '0 0 8px', textTransform: 'uppercase' }}>{label}</p>
          {tasks.map(task => (
            <button key={task.id} onClick={() => setConfirmTask(task)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{task.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{task.name}</p>
                <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{task.desc}</p>
              </div>
              <span style={{ background: C.greenLight, color: C.green, fontSize: 13, fontWeight: 700, borderRadius: 20, padding: '4px 12px' }}>+{task.pts}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )

  const renderSpend = () => (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Gastar puntos</h2>
        <p style={{ fontSize: 13, color: C.textSec, margin: '3px 0 0' }}>Tienes <strong>{me.points} puntos</strong> disponibles</p>
      </div>
      <div style={{ padding: '0 16px' }}>
        {REWARDS.map(r => {
          const can = me.points >= r.cost
          return (
            <button key={r.id} onClick={() => can && setConfirmReward(r)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: can ? 'pointer' : 'not-allowed', opacity: can ? 1 : 0.45, textAlign: 'left', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{r.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{r.name}</p>
                <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{r.desc}</p>
              </div>
              <span style={{ background: can ? C.redLight : C.border, color: can ? C.red : C.textMut, fontSize: 13, fontWeight: 700, borderRadius: 20, padding: '4px 12px', flexShrink: 0 }}>-{r.cost}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderHistory = () => (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Historial</h2>
        <p style={{ fontSize: 13, color: C.textSec, margin: '3px 0 0' }}>Todo lo que ha pasado en casa</p>
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px' }}>
        {players.map(p => (
          <div key={p.id} style={{ flex: 1, background: 'white', borderRadius: 14, border: `1px solid ${C.border}`, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 30 }}>{p.emoji}</span>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.textSec, margin: 0 }}>{p.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: 0 }}>+{p.totalEarned ?? 0}</p>
                <p style={{ fontSize: 10, color: C.textMut, margin: 0, textTransform: 'uppercase' }}>ganado</p>
              </div>
              <div style={{ width: 1, height: 30, background: C.border }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: C.red, margin: 0 }}>-{p.totalSpent ?? 0}</p>
                <p style={{ fontSize: 10, color: C.textMut, margin: 0, textTransform: 'uppercase' }}>gastado</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {history.length === 0 && <div style={{ textAlign: 'center', padding: 48 }}><p style={{ fontSize: 48, margin: '0 0 12px' }}>📋</p><p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Sin actividad aún</p></div>}
      <div style={{ padding: '0 16px' }}>
        {history.map(entry => {
          const player = players.find(p => p.id === entry.playerId)
          const isEarn = entry.type === 'earn'
          const isRej = entry.type === 'rejected'
          return (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: isRej ? C.textMut : isEarn ? C.green : C.red }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: isRej ? C.textMut : C.text, margin: 0, textDecoration: isRej ? 'line-through' : 'none' }}>{entry.label}</p>
                <p style={{ fontSize: 11, color: C.textMut, margin: '2px 0 0' }}>{player?.emoji} {player?.name}{isEarn && entry.validated ? ' · ✓' : ''}{isRej ? ' · rechazado' : ''} · {new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: isRej ? C.textMut : isEarn ? C.green : C.red }}>{isEarn ? '+' : isRej ? '' : '-'}{entry.pts}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const tabs = [{ id: 'home', label: 'Inicio', icon: '🏠' }, { id: 'earn', label: 'Ganar', icon: '⭐' }, { id: 'spend', label: 'Gastar', icon: '🎁' }, { id: 'history', label: 'Historial', icon: '📋' }] as const

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg, maxWidth: 480, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: C.textSec }}>Sala: <strong style={{ color: C.purple, fontFamily: 'monospace' }}>{roomId}</strong></span>
        <button onClick={onLeave} style={{ fontSize: 12, fontWeight: 600, color: C.textMut, background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {tab === 'home' && renderHome()}
        {tab === 'earn' && renderEarn()}
        {tab === 'spend' && renderSpend()}
        {tab === 'history' && renderHistory()}
      </div>
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: `1px solid ${C.border}`, display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 22, position: 'relative', display: 'inline-block' }}>
              {t.icon}
              {t.id === 'earn' && toValidate.length > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: C.amber, color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>{toValidate.length}</span>}
            </span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.purple : C.textMut }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {confirmTask && modal(<>
        <span style={{ fontSize: 52 }}>{confirmTask.icon}</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>{confirmTask.name}</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>Le vas a pedir a {other.emoji} {other.name} que valide esta tarea.</p>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.greenLight, borderRadius: 10, padding: '12px 16px' }}>
          <span style={{ fontSize: 14, color: C.textSec }}>Puntos si aprueba</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.green }}>+{confirmTask.pts}</span>
        </div>
        <div style={{ width: '100%', background: C.amberLight, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#BA7517', textAlign: 'center' }}>Los puntos se añaden solo cuando tu pareja confirme.</div>
        <button onClick={async () => { await submitTask(confirmTask); setSent(confirmTask); setConfirmTask(null) }} style={{ width: '100%', padding: 14, background: C.purple, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Enviar para validar</button>
        <button onClick={() => setConfirmTask(null)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {sent && modal(<>
        <span style={{ fontSize: 64 }}>📤</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.purple, margin: 0 }}>¡Enviado!</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>Le has pedido a {other.emoji} {other.name} que valide "{sent.name}". Recibirás {sent.pts} puntos cuando lo confirme.</p>
        <button onClick={() => setSent(null)} style={{ width: '100%', padding: 14, background: C.purple, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Entendido</button>
      </>)}

      {confirmReward && modal(<>
        <span style={{ fontSize: 52 }}>{confirmReward.icon}</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>{confirmReward.name}</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>Vas a gastar <strong>{confirmReward.cost} puntos</strong>. Te quedarán {me.points - confirmReward.cost} pts.</p>
        <button onClick={async () => { await spendPoints(confirmReward); setSuccess(confirmReward); setConfirmReward(null) }} style={{ width: '100%', padding: 14, background: C.purple, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>¡Canjear ahora!</button>
        <button onClick={() => setConfirmReward(null)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {success && modal(<>
        <span style={{ fontSize: 72 }}>{success.icon}</span>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: C.purple, margin: 0 }}>¡Disfrutado!</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>Has canjeado "{success.name}". Te lo mereces.</p>
        <button onClick={() => setSuccess(null)} style={{ width: '100%', padding: 14, background: C.purple, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Perfecto</button>
      </>)}
    </div>
  )
}
