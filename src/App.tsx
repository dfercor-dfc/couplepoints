import { useState, useEffect } from 'react'
import { Lobby } from './components/Lobby'
import { Game } from './components/Game'
import { subscribeRoom, getRoomOnce, createRoom, defaultRoomState, type RoomState } from './firebase'

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [myPlayer, setMyPlayer] = useState<number | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    const saved = localStorage.getItem('cp_session')
    if (saved) {
      try {
        const { roomId, myPlayer } = JSON.parse(saved)
        setRoomId(roomId)
        setMyPlayer(myPlayer)
      } catch { localStorage.removeItem('cp_session') }
    }
  }, [])

  useEffect(() => {
    if (!roomId) return
    const unsub = subscribeRoom(roomId, (state) => {
      setRoomState(state)
      setLoading(false)
    })
    return () => unsub()
  }, [roomId])

  if (!ready) return null

  const handleCreateRoom = async (name1: string, name2: string, emoji1: string, emoji2: string) => {
    const { generateRoomId } = await import('./data')
    const id = generateRoomId()
    setLoading(true)
    setError('')
    try {
      const state = defaultRoomState(name1, name2)
      state.players[0].emoji = emoji1
      state.players[1].emoji = emoji2
      await createRoom(id, state)
      setRoomId(id)
      setMyPlayer(0)
      localStorage.setItem('cp_session', JSON.stringify({ roomId: id, myPlayer: 0 }))
    } catch {
      setError('Error al crear la sala. Revisa tu conexión.')
      setLoading(false)
    }
  }

  const handleJoinRoom = async (id: string, playerIdx: number) => {
    setLoading(true)
    setError('')
    const clean = id.trim().toLowerCase()
    try {
      const existing = await getRoomOnce(clean)
      if (!existing) {
        setError(`No existe ninguna sala con el código "${clean}".`)
        setLoading(false)
        return
      }
      setRoomId(clean)
      setMyPlayer(playerIdx)
      localStorage.setItem('cp_session', JSON.stringify({ roomId: clean, myPlayer: playerIdx }))
    } catch {
      setError('Error al conectar. Revisa tu conexión.')
      setLoading(false)
    }
  }

  const handleLeave = () => {
    localStorage.removeItem('cp_session')
    setRoomId(null)
    setMyPlayer(null)
    setRoomState(null)
  }

  if (!roomId || myPlayer === null) {
    return <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} loading={loading} error={error} />
  }

  if (!roomState) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7FB' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <p style={{ color: '#6B6B8A', fontFamily: 'system-ui' }}>Conectando...</p>
        </div>
      </div>
    )
  }

  return <Game roomId={roomId} myPlayer={myPlayer} roomState={roomState} onLeave={handleLeave} />
}
