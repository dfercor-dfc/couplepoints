import { useState } from 'react'
import { db, type RoomState, type PendingTask, type HistoryEntry, type Notification, type CustomTask, type CustomReward, type NegotiationRound } from '../firebase'
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

const TASK_EMOJIS = ['🏠','🧹','🛒','🍳','🚗','🔧','📋','🌿','🐕','🧺','👶','🎂','🏋️','📚','🎨','🛁','🌅','🍽️','🎯','💡','🍻','⚽','🎮','🃏','😴','🌅','✈️','💅','🎲','💆','📺','👯','🛍️']

export function Game({ roomId, myPlayer, roomState, onLeave }: Props) {
  const [tab, setTab] = useState<Tab>('home')
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null)
  const [sent, setSent] = useState<Task | null>(null)
  const [success, setSuccess] = useState<Reward | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState<'points' | 'history' | null>(null)
  const [validateItem, setValidateItem] = useState<PendingTask | null>(null)
  const [validateNote, setValidateNote] = useState('')
  const [validateAction, setValidateAction] = useState<'approve' | 'reject' | null>(null)

  // Custom task
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPts, setNewTaskPts] = useState('15')
  const [newTaskIcon, setNewTaskIcon] = useState('🏠')
  const [showTaskIconPicker, setShowTaskIconPicker] = useState(false)
  const [negotiatingTask, setNegotiatingTask] = useState<CustomTask | null>(null)
  const [counterTaskPts, setCounterTaskPts] = useState('')
  const [counterTaskMsg, setCounterTaskMsg] = useState('')

  // Custom reward
  const [showCreateReward, setShowCreateReward] = useState(false)
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardDesc, setNewRewardDesc] = useState('')
  const [newRewardPts, setNewRewardPts] = useState('25')
  const [newRewardIcon, setNewRewardIcon] = useState('🎁')
  const [showRewardIconPicker, setShowRewardIconPicker] = useState(false)
  const [negotiatingReward, setNegotiatingReward] = useState<CustomReward | null>(null)
  const [counterRewardPts, setCounterRewardPts] = useState('')
  const [counterRewardMsg, setCounterRewardMsg] = useState('')

  const { players, pending = [], history = [], notifications = [], customTasks = [], customRewards = [] } = roomState
  const me = players[myPlayer]
  const other = players[myPlayer === 0 ? 1 : 0]
  const toValidate = pending.filter(p => p.pendingFor === myPlayer && p.status === 'pending')
  const myPending = pending.filter(p => p.requestedBy === myPlayer && p.status === 'pending')
  const myNotifications = notifications.filter(n => n.forPlayer === myPlayer && !n.read)
  const myTaskNegotiations = customTasks.filter(t => t.status === 'negotiating' && t.pendingFor === myPlayer)
  const myRewardNegotiations = customRewards.filter(r => r.status === 'negotiating' && r.pendingFor === myPlayer)
  const acceptedCustomTasks = customTasks.filter(t => t.status === 'accepted')
  const acceptedCustomRewards = customRewards.filter(r => r.status === 'accepted')

  async function submitTask(task: Task) {
    const newItem: PendingTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      taskName: task.name, taskIcon: task.icon, pts: task.pts,
      requestedBy: myPlayer, pendingFor: myPlayer === 0 ? 1 : 0,
      timestamp: Date.now(), status: 'pending',
    }
    await update(ref(db, `rooms/${roomId}`), { pending: [newItem, ...pending] })
  }

  async function createCustomTask() {
    if (!newTaskName.trim() || !newTaskPts) return
    const otherId = myPlayer === 0 ? 1 : 0
    const task: CustomTask = {
      id: `ct-${Date.now()}`, name: newTaskName.trim(),
      desc: newTaskDesc.trim() || 'Tarea personalizada',
      pts: parseInt(newTaskPts), icon: newTaskIcon, createdBy: myPlayer,
      status: 'negotiating', currentPts: parseInt(newTaskPts), pendingFor: otherId,
      rounds: [{ proposedBy: myPlayer, pts: parseInt(newTaskPts), timestamp: Date.now() }]
    }
    const notif: Notification = { id: `n-${Date.now()}`, forPlayer: otherId, type: 'task_negotiation', taskName: task.name, pts: task.pts, timestamp: Date.now(), read: false }
    await update(ref(db, `rooms/${roomId}`), { customTasks: [task, ...customTasks], notifications: [notif, ...notifications].slice(0, 20) })
    setShowCreateTask(false); setNewTaskName(''); setNewTaskDesc(''); setNewTaskPts('15'); setNewTaskIcon('🏠')
  }

  async function acceptTaskNegotiation(task: CustomTask) {
    const updated = customTasks.map(t => t.id === task.id ? { ...t, status: 'accepted', pts: task.currentPts } : t)
    const notif: Notification = { id: `n-${Date.now()}`, forPlayer: task.createdBy, type: 'approved', taskName: task.name, pts: task.currentPts, note: `Tarea aceptada con ${task.currentPts} puntos ✓`, timestamp: Date.now(), read: false }
    await update(ref(db, `rooms/${roomId}`), { customTasks: updated, notifications: [notif, ...notifications].slice(0, 20) })
    setNegotiatingTask(null)
  }

  async function counterProposeTask(task: CustomTask) {
    if (!counterTaskPts) return
    const pts = parseInt(counterTaskPts)
    const otherId = myPlayer === 0 ? 1 : 0
    const newRound: NegotiationRound = { proposedBy: myPlayer, pts, timestamp: Date.now(), message: counterTaskMsg.trim() || undefined }
    const updatedTask: CustomTask = { ...task, currentPts: pts, pendingFor: otherId, rounds: [...task.rounds, newRound] }
    const notif: Notification = { id: `n-${Date.now()}`, forPlayer: otherId, type: 'task_negotiation', taskName: task.name, pts, note: counterTaskMsg.trim() || undefined, timestamp: Date.now(), read: false }
    await update(ref(db, `rooms/${roomId}`), { customTasks: customTasks.map(t => t.id === task.id ? updatedTask : t), notifications: [notif, ...notifications].slice(0, 20) })
    setNegotiatingTask(null); setCounterTaskPts(''); setCounterTaskMsg('')
  }

  async function rejectTaskNegotiation(task: CustomTask) {
    await update(ref(db, `rooms/${roomId}`), { customTasks: customTasks.map(t => t.id === task.id ? { ...t, status: 'rejected' } : t) })
    setNegotiatingTask(null)
  }

  async function createCustomReward() {
    if (!newRewardName.trim() || !newRewardPts) return
    const otherId = myPlayer === 0 ? 1 : 0
    const reward: CustomReward = {
      id: `cr-${Date.now()}`, name: newRewardName.trim(),
      desc: newRewardDesc.trim() || 'Recompensa personalizada',
      pts: parseInt(newRewardPts), icon: newRewardIcon, createdBy: myPlayer,
      status: 'negotiating', currentPts: parseInt(newRewardPts), pendingFor: otherId,
      rounds: [{ proposedBy: myPlayer, pts: parseInt(newRewardPts), timestamp: Date.now() }]
    }
    const notif: Notification = { id: `n-${Date.now()}`, forPlayer: otherId, type: 'reward_negotiation', taskName: reward.name, pts: reward.pts, timestamp: Date.now(), read: false }
    await update(ref(db, `rooms/${roomId}`), { customRewards: [reward, ...customRewards], notifications: [notif, ...notifications].slice(0, 20) })
    setShowCreateReward(false); setNewRewardName(''); setNewRewardDesc(''); setNewRewardPts('25'); setNewRewardIcon('🎁')
  }

  async function acceptRewardNegotiation(reward: CustomReward) {
    const updated = customRewards.map(r => r.id === reward.id ? { ...r, status: 'accepted', pts: reward.currentPts } : r)
    const notif: Notification = { id: `n-${Date.now()}`, forPlayer: reward.createdBy, type: 'approved', taskName: reward.name, pts: reward.currentPts, note: `Recompensa aceptada con ${reward.currentPts} puntos ✓`, timestamp: Date.now(), read: false }
    await update(ref(db, `rooms/${roomId}`), { customRewards: updated, notifications: [notif, ...notifications].slice(0, 20) })
    setNegotiatingReward(null)
  }

  async function counterProposeReward(reward: CustomReward) {
    if (!counterRewardPts) return
    const pts = parseInt(counterRewardPts)
    const otherId = myPlayer === 0 ? 1 : 0
    const newRound: NegotiationRound = { proposedBy: myPlayer, pts, timestamp: Date.now(), message: counterRewardMsg.trim() || undefined }
    const updatedReward: CustomReward = { ...reward, currentPts: pts, pendingFor: otherId, rounds: [...reward.rounds, newRound] }
    const notif: Notification = { id: `n-${Date.now()}`, forPlayer: otherId, type: 'reward_negotiation', taskName: reward.name, pts, note: counterRewardMsg.trim() || undefined, timestamp: Date.now(), read: false }
    await update(ref(db, `rooms/${roomId}`), { customRewards: customRewards.map(r => r.id === reward.id ? updatedReward : r), notifications: [notif, ...notifications].slice(0, 20) })
    setNegotiatingReward(null); setCounterRewardPts(''); setCounterRewardMsg('')
  }

  async function rejectRewardNegotiation(reward: CustomReward) {
    await update(ref(db, `rooms/${roomId}`), { customRewards: customRewards.map(r => r.id === reward.id ? { ...r, status: 'rejected' } : r) })
    setNegotiatingReward(null)
  }

  async function spendCustomReward(reward: CustomReward) {
    if (me.points < reward.pts) return
    const updatedPlayers = players.map(p => p.id === myPlayer
      ? { ...p, points: p.points - reward.pts, totalSpent: (p.totalSpent ?? 0) + reward.pts } : p)
    const entry: HistoryEntry = { id: Date.now().toString(), type: 'spend', playerId: myPlayer, label: reward.name, pts: reward.pts, timestamp: Date.now() }
    await update(ref(db, `rooms/${roomId}`), { players: updatedPlayers, history: [entry, ...history].slice(0, 60) })
  }

  async function confirmValidate() {
    if (!validateItem || !validateAction) return
    const note = validateNote.trim()
    if (validateAction === 'approve') {
      const updatedPending = pending.map(p => p.id === validateItem.id ? { ...p, status: 'approved' } : p)
      const updatedPlayers = players.map(p => p.id === validateItem.requestedBy
        ? { ...p, points: p.points + validateItem.pts, streak: (p.streak ?? 0) + 1, totalEarned: (p.totalEarned ?? 0) + validateItem.pts } : p)
      const entry: HistoryEntry = { id: Date.now().toString(), type: 'earn', playerId: validateItem.requestedBy, label: validateItem.taskName, pts: validateItem.pts, timestamp: Date.now(), validated: true, note }
      const notif: Notification = { id: `n-${Date.now()}`, forPlayer: validateItem.requestedBy, type: 'approved', taskName: validateItem.taskName, pts: validateItem.pts, note, timestamp: Date.now(), read: false }
      await update(ref(db, `rooms/${roomId}`), { pending: updatedPending, players: updatedPlayers, history: [entry, ...history].slice(0, 60), notifications: [notif, ...notifications].slice(0, 20) })
    } else {
      const updatedPending = pending.map(p => p.id === validateItem.id ? { ...p, status: 'rejected' } : p)
      const entry: HistoryEntry = { id: Date.now().toString(), type: 'rejected', playerId: validateItem.requestedBy, label: validateItem.taskName, pts: validateItem.pts, timestamp: Date.now(), note }
      const notif: Notification = { id: `n-${Date.now()}`, forPlayer: validateItem.requestedBy, type: 'rejected', taskName: validateItem.taskName, pts: validateItem.pts, note, timestamp: Date.now(), read: false }
      await update(ref(db, `rooms/${roomId}`), { pending: updatedPending, history: [entry, ...history].slice(0, 60), notifications: [notif, ...notifications].slice(0, 20) })
    }
    setValidateItem(null); setValidateNote(''); setValidateAction(null)
  }

  async function dismissNotifications() {
    const updated = notifications.map(n => n.forPlayer === myPlayer ? { ...n, read: true } : n)
    await update(ref(db, `rooms/${roomId}`), { notifications: updated })
  }

  async function spendPoints(reward: Reward) {
    if (me.points < reward.cost) return
    const updatedPlayers = players.map(p => p.id === myPlayer
      ? { ...p, points: p.points - reward.cost, totalSpent: (p.totalSpent ?? 0) + reward.cost } : p)
    const entry: HistoryEntry = { id: Date.now().toString(), type: 'spend', playerId: myPlayer, label: reward.name, pts: reward.cost, timestamp: Date.now() }
    await update(ref(db, `rooms/${roomId}`), { players: updatedPlayers, history: [entry, ...history].slice(0, 60) })
  }

  async function doResetPoints() {
    const updatedPlayers = players.map(p => ({ ...p, points: 0, streak: 0, totalEarned: 0, totalSpent: 0 }))
    await update(ref(db, `rooms/${roomId}`), { players: updatedPlayers })
    setShowResetConfirm(null)
  }

  async function doResetHistory() {
    await update(ref(db, `rooms/${roomId}`), { history: [], pending: [], notifications: [] })
    setShowResetConfirm(null)
  }

  const modal = (content: React.ReactNode) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxHeight: '90vh', overflowY: 'auto' }}>
        {content}
      </div>
    </div>
  )

  const homeTasks = TASKS.filter(t => t.category === 'home')
  const socialTasks = TASKS.filter(t => t.category === 'social')

  const PlayerBar = ({ p }: { p: typeof players[0] }) => {
    const maxVal = Math.max(p.totalEarned ?? 0, 1)
    const pctEarned = Math.round(((p.points ?? 0) / maxVal) * 100)
    const pctSpent = Math.round(((p.totalSpent ?? 0) / maxVal) * 100)
    return (
      <div style={{ background: 'white', borderRadius: 14, padding: '12px 16px', border: `1px solid ${C.border}`, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>{p.emoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>{p.points ?? 0} pts</span>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>Disponibles</span>
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{p.points ?? 0} pts</span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: 8, background: C.blue, borderRadius: 4, width: `${pctEarned}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>Gastados</span>
            <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>{p.totalSpent ?? 0} pts</span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: 8, background: C.red, borderRadius: 4, width: `${pctSpent}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>
    )
  }

  const NotificationBanner = () => {
    if (myNotifications.filter(n => n.type !== 'task_negotiation' && n.type !== 'reward_negotiation').length === 0) return null
    return (
      <div style={{ margin: '0 16px 14px' }}>
        {myNotifications.filter(n => n.type !== 'task_negotiation' && n.type !== 'reward_negotiation').map(n => (
          <div key={n.id} style={{ background: n.type === 'approved' ? C.greenLight : C.redLight, border: `1.5px solid ${n.type === 'approved' ? C.green : C.red}`, borderRadius: 14, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{n.type === 'approved' ? '✅' : '❌'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: n.type === 'approved' ? C.green : C.red, margin: 0 }}>
                  {n.type === 'approved' ? `¡${other.name} aprobó tu tarea!` : `${other.name} rechazó tu tarea`}
                </p>
                <p style={{ fontSize: 13, color: C.textSec, margin: '2px 0 0' }}>{n.taskName} · {n.type === 'approved' ? `+${n.pts} puntos` : 'sin puntos'}</p>
              </div>
              <button onClick={dismissNotifications} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textMut, padding: 4 }}>✕</button>
            </div>
            {n.note && <div style={{ marginTop: 8, background: 'white', borderRadius: 8, padding: '8px 12px' }}><p style={{ fontSize: 12, color: C.textSec, margin: 0, fontStyle: 'italic' }}>💬 "{n.note}"</p></div>}
          </div>
        ))}
      </div>
    )
  }

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
              <button onClick={() => { setValidateItem(item); setValidateAction('reject'); setValidateNote('') }} style={{ width: 36, height: 36, borderRadius: 18, background: C.redLight, border: 'none', fontSize: 14, fontWeight: 800, color: C.red, cursor: 'pointer' }}>✕</button>
              <button onClick={() => { setValidateItem(item); setValidateAction('approve'); setValidateNote('') }} style={{ width: 36, height: 36, borderRadius: 18, background: C.greenLight, border: 'none', fontSize: 14, fontWeight: 800, color: C.green, cursor: 'pointer' }}>✓</button>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const TaskNegotiationCards = () => (
    <>
      {myTaskNegotiations.length > 0 && (
        <div style={{ margin: '0 16px 14px', background: C.purpleLight, border: `1.5px solid ${C.purple}`, borderRadius: 16, padding: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.purple, margin: '0 0 10px' }}>🤝 {other.emoji} {other.name} propone una tarea</p>
          {myTaskNegotiations.map(task => {
            const lastRound = task.rounds[task.rounds.length - 1]
            const roundNum = task.rounds.length
            return (
              <div key={task.id} style={{ background: 'white', borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{task.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{task.name}</p>
                    <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{task.desc}</p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{task.currentPts} pts</span>
                </div>
                {lastRound.message && <p style={{ fontSize: 12, color: C.textSec, fontStyle: 'italic', margin: '0 0 8px' }}>💬 "{lastRound.message}"</p>}
                <p style={{ fontSize: 11, color: C.textMut, margin: '0 0 8px' }}>Ronda {roundNum} de 3</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {roundNum < 3 && <button onClick={() => { setNegotiatingTask(task); setCounterTaskPts(String(task.currentPts)); setCounterTaskMsg('') }} style={{ flex: 1, padding: '8px 4px', background: C.amberLight, border: `1px solid ${C.amber}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.amber, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Contraproponer</button>}
                  <button onClick={() => rejectTaskNegotiation(task)} style={{ flex: 1, padding: '8px 4px', background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Rechazar</button>
                  <button onClick={() => acceptTaskNegotiation(task)} style={{ flex: 1, padding: '8px 4px', background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.green, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Aceptar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  const RewardNegotiationCards = () => (
    <>
      {myRewardNegotiations.length > 0 && (
        <div style={{ margin: '0 16px 14px', background: '#FEF0EB', border: `1.5px solid ${C.red}`, borderRadius: 16, padding: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.red, margin: '0 0 10px' }}>🎁 {other.emoji} {other.name} propone una recompensa</p>
          {myRewardNegotiations.map(reward => {
            const lastRound = reward.rounds[reward.rounds.length - 1]
            const roundNum = reward.rounds.length
            return (
              <div key={reward.id} style={{ background: 'white', borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{reward.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{reward.name}</p>
                    <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{reward.desc}</p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.red }}>{reward.currentPts} pts</span>
                </div>
                {lastRound.message && <p style={{ fontSize: 12, color: C.textSec, fontStyle: 'italic', margin: '0 0 8px' }}>💬 "{lastRound.message}"</p>}
                <p style={{ fontSize: 11, color: C.textMut, margin: '0 0 8px' }}>Ronda {roundNum} de 3</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {roundNum < 3 && <button onClick={() => { setNegotiatingReward(reward); setCounterRewardPts(String(reward.currentPts)); setCounterRewardMsg('') }} style={{ flex: 1, padding: '8px 4px', background: C.amberLight, border: `1px solid ${C.amber}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.amber, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Contraproponer</button>}
                  <button onClick={() => rejectRewardNegotiation(reward)} style={{ flex: 1, padding: '8px 4px', background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Rechazar</button>
                  <button onClick={() => acceptRewardNegotiation(reward)} style={{ flex: 1, padding: '8px 4px', background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.green, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Aceptar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  const MyPendingCards = () => (
    <>
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
    </>
  )

  const IconPicker = ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', background: C.bg, borderRadius: 12, padding: 12, width: '100%' }}>
      {TASK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose() }} style={{ fontSize: 24, background: 'white', border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, cursor: 'pointer' }}>{e}</button>
      ))}
    </div>
  )

  const PtsSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {[5, 10, 15, 20, 25, 30].map(pts => (
          <button key={pts} onClick={() => onChange(String(pts))} style={{ flex: 1, padding: '8px 4px', background: value === String(pts) ? C.purple : 'white', border: `1px solid ${value === String(pts) ? C.purple : C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: value === String(pts) ? 'white' : C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>{pts}</button>
        ))}
      </div>
      <input value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))} placeholder="O escribe otro número" style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
    </div>
  )

  const renderHome = () => (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>CouplePoints</h1>
        <p style={{ fontSize: 13, color: C.textSec, margin: '2px 0 0' }}>El hogar tiene reglas, ahora también tiene puntos.</p>
      </div>
      <NotificationBanner />
      <ValidateCards />
      <TaskNegotiationCards />
      <RewardNegotiationCards />
      <MyPendingCards />
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
        <p style={{ fontSize: 11, fontWeight: 700, color: C.textMut, letterSpacing: 0.8, margin: '0 0 8px', textTransform: 'uppercase' }}>ESTADÍSTICAS</p>
        {players.map(p => <PlayerBar key={p.id} p={p} />)}
      </div>
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 10 }}>
        <button onClick={() => setShowResetConfirm('points')} style={{ flex: 1, padding: '10px 8px', background: 'white', border: `1px solid ${C.red}`, borderRadius: 12, fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Resetear puntos</button>
        <button onClick={() => setShowResetConfirm('history')} style={{ flex: 1, padding: '10px 8px', background: 'white', border: `1px solid ${C.textMut}`, borderRadius: 12, fontSize: 12, fontWeight: 600, color: C.textMut, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️ Borrar historial</button>
      </div>
      {history.slice(0, 4).map(entry => {
        const player = players.find(p => p.id === entry.playerId)
        const isEarn = entry.type === 'earn'; const isRej = entry.type === 'rejected'
        return (
          <div key={entry.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: isRej ? C.textMut : isEarn ? C.green : C.red }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: isRej ? C.textMut : C.text, margin: 0, textDecoration: isRej ? 'line-through' : 'none' }}>{entry.label}</p>
                <p style={{ fontSize: 11, color: C.textMut, margin: '2px 0 0' }}>{player?.emoji} {player?.name}{isEarn && entry.validated ? ' · ✓ validado' : ''}{isRej ? ' · rechazado' : ''}</p>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: isRej ? C.textMut : isEarn ? C.green : C.red }}>{isEarn ? '+' : isRej ? '' : '-'}{entry.pts}</span>
            </div>
            {entry.note && <p style={{ fontSize: 12, color: C.textSec, margin: '6px 0 0 18px', fontStyle: 'italic' }}>💬 "{entry.note}"</p>}
          </div>
        )
      })}
      {history.length === 0 && toValidate.length === 0 && myNotifications.length === 0 && (
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
      <TaskNegotiationCards />
      <MyPendingCards />
      {acceptedCustomTasks.length > 0 && (
        <div style={{ padding: '0 16px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMut, letterSpacing: 0.8, margin: '0 0 8px', textTransform: 'uppercase' }}>TAREAS NEGOCIADAS ⭐</p>
          {acceptedCustomTasks.map(task => (
            <button key={task.id} onClick={() => setConfirmTask({ id: task.id, name: task.name, desc: task.desc, pts: task.pts, icon: task.icon, hard: false, category: 'home' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1.5px solid ${C.purple}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{task.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{task.name}</p>
                <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{task.desc}</p>
              </div>
              <span style={{ background: C.purpleLight, color: C.purple, fontSize: 13, fontWeight: 700, borderRadius: 20, padding: '4px 12px' }}>+{task.pts}</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: '0 16px 14px' }}>
        <button onClick={() => setShowCreateTask(true)} style={{ width: '100%', padding: '14px', background: C.purpleLight, border: `1.5px dashed ${C.purple}`, borderRadius: 14, fontSize: 14, fontWeight: 600, color: C.purple, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✚ Proponer tarea personalizada
        </button>
      </div>
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
      <RewardNegotiationCards />
      {acceptedCustomRewards.length > 0 && (
        <div style={{ padding: '0 16px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMut, letterSpacing: 0.8, margin: '0 0 8px', textTransform: 'uppercase' }}>RECOMPENSAS NEGOCIADAS ⭐</p>
          {acceptedCustomRewards.map(reward => {
            const can = me.points >= reward.pts
            return (
              <button key={reward.id} onClick={() => can && spendCustomReward(reward)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1.5px solid ${C.red}`, cursor: can ? 'pointer' : 'not-allowed', opacity: can ? 1 : 0.45, textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{reward.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{reward.name}</p>
                  <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{reward.desc}</p>
                </div>
                <span style={{ background: can ? C.redLight : C.border, color: can ? C.red : C.textMut, fontSize: 13, fontWeight: 700, borderRadius: 20, padding: '4px 12px', flexShrink: 0 }}>-{reward.pts}</span>
              </button>
            )
          })}
        </div>
      )}
      <div style={{ padding: '0 16px 14px' }}>
        <button onClick={() => setShowCreateReward(true)} style={{ width: '100%', padding: '14px', background: C.redLight, border: `1.5px dashed ${C.red}`, borderRadius: 14, fontSize: 14, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✚ Proponer recompensa personalizada
        </button>
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
          const isEarn = entry.type === 'earn'; const isRej = entry.type === 'rejected'
          return (
            <div key={entry.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: isRej ? C.textMut : isEarn ? C.green : C.red }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: isRej ? C.textMut : C.text, margin: 0, textDecoration: isRej ? 'line-through' : 'none' }}>{entry.label}</p>
                  <p style={{ fontSize: 11, color: C.textMut, margin: '2px 0 0' }}>{player?.emoji} {player?.name}{isEarn && entry.validated ? ' · ✓' : ''}{isRej ? ' · rechazado' : ''} · {new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: isRej ? C.textMut : isEarn ? C.green : C.red }}>{isEarn ? '+' : isRej ? '' : '-'}{entry.pts}</span>
              </div>
              {entry.note && <p style={{ fontSize: 12, color: C.textSec, margin: '6px 0 0 18px', fontStyle: 'italic' }}>💬 "{entry.note}"</p>}
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
              {t.id === 'earn' && (toValidate.length + myTaskNegotiations.length) > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: C.amber, color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>{toValidate.length + myTaskNegotiations.length}</span>}
              {t.id === 'spend' && myRewardNegotiations.length > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: C.red, color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>{myRewardNegotiations.length}</span>}
              {t.id === 'home' && myNotifications.filter(n => n.type !== 'task_negotiation' && n.type !== 'reward_negotiation').length > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: C.green, color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>{myNotifications.filter(n => n.type !== 'task_negotiation' && n.type !== 'reward_negotiation').length}</span>}
            </span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.purple : C.textMut }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Modal crear tarea personalizada */}
      {showCreateTask && modal(<>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>Proponer tarea</h3>
        <p style={{ fontSize: 13, color: C.textSec, margin: 0, textAlign: 'center' }}>Propón una tarea y negocia los puntos con {other.emoji} {other.name}</p>
        <button onClick={() => setShowTaskIconPicker(!showTaskIconPicker)} style={{ fontSize: 48, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 20px', cursor: 'pointer' }}>{newTaskIcon}</button>
        {showTaskIconPicker && <IconPicker onSelect={setNewTaskIcon} onClose={() => setShowTaskIconPicker(false)} />}
        <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Nombre de la tarea" maxLength={40} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Descripción (opcional)" maxLength={60} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        <p style={{ fontSize: 12, color: C.textMut, margin: 0, alignSelf: 'flex-start' }}>Puntos que propones</p>
        <PtsSelector value={newTaskPts} onChange={setNewTaskPts} />
        <button onClick={createCustomTask} disabled={!newTaskName.trim() || !newTaskPts} style={{ width: '100%', padding: 14, background: C.purple, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !newTaskName.trim() || !newTaskPts ? 0.5 : 1 }}>Enviar propuesta</button>
        <button onClick={() => setShowCreateTask(false)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {/* Modal crear recompensa personalizada */}
      {showCreateReward && modal(<>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>Proponer recompensa</h3>
        <p style={{ fontSize: 13, color: C.textSec, margin: 0, textAlign: 'center' }}>Propón una recompensa y negocia el coste con {other.emoji} {other.name}</p>
        <button onClick={() => setShowRewardIconPicker(!showRewardIconPicker)} style={{ fontSize: 48, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 20px', cursor: 'pointer' }}>{newRewardIcon}</button>
        {showRewardIconPicker && <IconPicker onSelect={setNewRewardIcon} onClose={() => setShowRewardIconPicker(false)} />}
        <input value={newRewardName} onChange={e => setNewRewardName(e.target.value)} placeholder="Nombre de la recompensa" maxLength={40} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        <input value={newRewardDesc} onChange={e => setNewRewardDesc(e.target.value)} placeholder="Descripción (opcional)" maxLength={60} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        <p style={{ fontSize: 12, color: C.textMut, margin: 0, alignSelf: 'flex-start' }}>Puntos que propones</p>
        <PtsSelector value={newRewardPts} onChange={setNewRewardPts} />
        <button onClick={createCustomReward} disabled={!newRewardName.trim() || !newRewardPts} style={{ width: '100%', padding: 14, background: C.red, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !newRewardName.trim() || !newRewardPts ? 0.5 : 1 }}>Enviar propuesta</button>
        <button onClick={() => setShowCreateReward(false)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {/* Modal contrapropuesta tarea */}
      {negotiatingTask && modal(<>
        <span style={{ fontSize: 52 }}>{negotiatingTask.icon}</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>{negotiatingTask.name}</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>{other.emoji} {other.name} propone <strong>{negotiatingTask.currentPts} puntos</strong>. ¿Cuánto propones tú?</p>
        <PtsSelector value={counterTaskPts} onChange={setCounterTaskPts} />
        <textarea value={counterTaskMsg} onChange={e => setCounterTaskMsg(e.target.value)} placeholder="Mensaje opcional..." maxLength={80} rows={2} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' as const }} />
        <p style={{ fontSize: 11, color: C.textMut, margin: 0 }}>Ronda {negotiatingTask.rounds.length} de 3</p>
        <button onClick={() => counterProposeTask(negotiatingTask)} disabled={!counterTaskPts} style={{ width: '100%', padding: 14, background: C.amber, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !counterTaskPts ? 0.5 : 1 }}>Enviar contrapropuesta</button>
        <button onClick={() => setNegotiatingTask(null)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {/* Modal contrapropuesta recompensa */}
      {negotiatingReward && modal(<>
        <span style={{ fontSize: 52 }}>{negotiatingReward.icon}</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>{negotiatingReward.name}</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>{other.emoji} {other.name} propone <strong>{negotiatingReward.currentPts} puntos</strong>. ¿Cuánto propones tú?</p>
        <PtsSelector value={counterRewardPts} onChange={setCounterRewardPts} />
        <textarea value={counterRewardMsg} onChange={e => setCounterRewardMsg(e.target.value)} placeholder="Mensaje opcional..." maxLength={80} rows={2} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' as const }} />
        <p style={{ fontSize: 11, color: C.textMut, margin: 0 }}>Ronda {negotiatingReward.rounds.length} de 3</p>
        <button onClick={() => counterProposeReward(negotiatingReward)} disabled={!counterRewardPts} style={{ width: '100%', padding: 14, background: C.amber, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !counterRewardPts ? 0.5 : 1 }}>Enviar contrapropuesta</button>
        <button onClick={() => setNegotiatingReward(null)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {/* Modal validar con nota */}
      {validateItem && modal(<>
        <span style={{ fontSize: 52 }}>{validateItem.taskIcon}</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>{validateItem.taskName}</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>{validateAction === 'approve' ? `¿Confirmas que ${other.name} lo ha hecho?` : `¿Rechazas la tarea de ${other.name}?`}</p>
        <div style={{ width: '100%', background: validateAction === 'approve' ? C.greenLight : C.redLight, borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: C.textSec }}>{validateAction === 'approve' ? 'Puntos a dar' : 'Puntos denegados'}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: validateAction === 'approve' ? C.green : C.red }}>{validateAction === 'approve' ? '+' : ''}{validateItem.pts}</span>
        </div>
        <div style={{ width: '100%' }}>
          <p style={{ fontSize: 12, color: C.textMut, margin: '0 0 6px' }}>💬 Añade un comentario (opcional)</p>
          <textarea value={validateNote} onChange={e => setValidateNote(e.target.value)} placeholder={validateAction === 'approve' ? 'Ej: Muy bien hecho 😊' : 'Ej: La sartén seguía sucia 😅'} maxLength={100} rows={2} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' as const, color: C.text }} />
        </div>
        <button onClick={confirmValidate} style={{ width: '100%', padding: 14, background: validateAction === 'approve' ? C.green : C.red, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {validateAction === 'approve' ? '✓ Aprobar tarea' : '✕ Rechazar tarea'}
        </button>
        <button onClick={() => { setValidateItem(null); setValidateNote('') }} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {showResetConfirm === 'points' && modal(<>
        <span style={{ fontSize: 52 }}>🔄</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>Resetear puntos</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>Se pondrán a cero los puntos de los dos jugadores. El historial se mantiene.</p>
        <button onClick={doResetPoints} style={{ width: '100%', padding: 14, background: C.red, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sí, resetear</button>
        <button onClick={() => setShowResetConfirm(null)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

      {showResetConfirm === 'history' && modal(<>
        <span style={{ fontSize: 52 }}>🗑️</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>Borrar historial</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, textAlign: 'center' }}>Se borrará todo el historial y las tareas pendientes. Los puntos se mantienen.</p>
        <button onClick={doResetHistory} style={{ width: '100%', padding: 14, background: C.red, color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sí, borrar</button>
        <button onClick={() => setShowResetConfirm(null)} style={{ background: 'none', border: 'none', color: C.textSec, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Cancelar</button>
      </>)}

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
