export interface Task {
  id: string; name: string; desc: string; pts: number
  icon: string; hard: boolean; category: 'home' | 'social'
}
export interface Reward {
  id: string; name: string; desc: string; cost: number; icon: string
}

export const TASKS: Task[] = [
  { id: 't1', name: 'Limpiar el baño', desc: 'El fondo de la bañera incluido', pts: 15, icon: '🧹', hard: false, category: 'home' },
  { id: 't2', name: 'Hacer la compra', desc: 'Lista completa, sin olvidar nada', pts: 12, icon: '🛒', hard: false, category: 'home' },
  { id: 't3', name: 'Planchar', desc: 'Toda la ropa, bien doblada', pts: 20, icon: '👔', hard: true, category: 'home' },
  { id: 't4', name: 'Recoger y ordenar', desc: 'Toda la casa en condiciones', pts: 10, icon: '🧺', hard: false, category: 'home' },
  { id: 't5', name: 'Cocinar cena especial', desc: 'De verdad, no pasta de nuevo', pts: 18, icon: '🍳', hard: false, category: 'home' },
  { id: 't6', name: 'Limpiar la nevera', desc: 'Esa cosa misteriosa del fondo', pts: 25, icon: '🧊', hard: true, category: 'home' },
  { id: 't7', name: 'Aspirar toda la casa', desc: 'Incluyendo debajo del sofá', pts: 14, icon: '🌀', hard: false, category: 'home' },
  { id: 't8', name: 'Cena de familia política', desc: 'Sin quejarse ni una vez', pts: 30, icon: '🥗', hard: true, category: 'social' },
  { id: 't9', name: 'Gestión del colegio', desc: 'Reunión, formulario o tutoría', pts: 22, icon: '📚', hard: false, category: 'social' },
  { id: 't10', name: 'Médico con los niños', desc: 'Espera incluida sin protesta', pts: 20, icon: '🏥', hard: false, category: 'social' },
  { id: 't11', name: 'Cumple de amigos de tu pareja', desc: 'Siendo simpático, no aguantando', pts: 25, icon: '🎂', hard: true, category: 'social' },
  { id: 't12', name: 'Gestión bancaria o papeleo', desc: 'Esa llamada que nadie quiere hacer', pts: 18, icon: '📋', hard: false, category: 'social' },
]

export const REWARDS: Reward[] = [
  { id: 'r1', name: 'Tarde con amigos', desc: 'Sin preguntas ni hora de vuelta', cost: 30, icon: '🍻' },
  { id: 'r2', name: 'Deporte o partido', desc: 'Tarde libre para lo tuyo', cost: 20, icon: '⚽' },
  { id: 'r3', name: 'Noche de sofá solo', desc: 'Tu serie, tu ritmo, sin nadie', cost: 15, icon: '🎮' },
  { id: 'r4', name: 'Comodín: elijo el plan', desc: 'El próximo plan lo eliges tú', cost: 25, icon: '🃏' },
  { id: 'r5', name: 'Comodín: paso de una tarea', desc: 'Te libras de una tarea fea', cost: 35, icon: '🙅' },
  { id: 'r6', name: 'Siesta sin interrupciones', desc: 'Paz total, móvil en silencio', cost: 10, icon: '😴' },
  { id: 'r7', name: 'Fin de semana personal', desc: 'Dos días de independencia total', cost: 80, icon: '🌅' },
  { id: 'r8', name: 'Capricho sin explicaciones', desc: 'Gasto personal sin justificar', cost: 40, icon: '🛍️' },
]

export const EMOJIS = ['👩','👨','🧑','👩‍🦰','👨‍🦰','👩‍🦱','👨‍🦱','🧔','👸','🤴','🦸‍♀️','🦸‍♂️','🧙‍♀️','🧙‍♂️','🐱','🐶','🦊','🐸','🐧','🦄']

export function generateRoomId(): string {
  const words = ['casa','amor','hogar','pareja','equipo','juntos','vida','diario']
  const w = words[Math.floor(Math.random() * words.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${w}-${n}`
}
