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
  { id: 't8', name: 'Poner la lavadora', desc: 'Ropa separada y programa correcto', pts: 5, icon: '🫧', hard: false, category: 'home' },
  { id: 't9', name: 'Tender la ropa', desc: 'Sin arrugarse y bien colocada', pts: 15, icon: '👕', hard: false, category: 'home' },
  { id: 't10', name: 'Limpiar el coche', desc: 'Por dentro y por fuera', pts: 15, icon: '🚗', hard: false, category: 'home' },
  { id: 't11', name: 'Organizar armarios', desc: 'Todo en su sitio, sin meter presión', pts: 18, icon: '🗂️', hard: false, category: 'home' },
  { id: 't12', name: 'Mantenimiento del hogar', desc: 'Bombilla, mueble, arreglo rápido', pts: 22, icon: '🔧', hard: false, category: 'home' },
  { id: 't13', name: 'Preparar cumpleaños o evento', desc: 'Decoración, compras y organización', pts: 20, icon: '🎉', hard: false, category: 'home' },
  { id: 't14', name: 'Organizar maletas para un viaje', desc: 'La tuya y la de los demás', pts: 10, icon: '🧳', hard: false, category: 'home' },
  { id: 't15', name: 'Cena de familia política', desc: 'Sin quejarse ni una vez', pts: 30, icon: '🥗', hard: true, category: 'social' },
  { id: 't16', name: 'Gestión del colegio', desc: 'Reunión, formulario o tutoría', pts: 10, icon: '📚', hard: false, category: 'social' },
  { id: 't17', name: 'Médico con los niños', desc: 'Espera incluida sin protesta', pts: 20, icon: '🏥', hard: false, category: 'social' },
  { id: 't18', name: 'Cumple de amigos de tu pareja', desc: 'Siendo simpático, no aguantando', pts: 25, icon: '🎂', hard: true, category: 'social' },
  { id: 't19', name: 'Gestión bancaria o papeleo', desc: 'Esa llamada que nadie quiere hacer', pts: 18, icon: '📋', hard: false, category: 'social' },
  { id: 't20', name: 'Gestionar facturas y seguros', desc: 'Comparar, llamar y resolver', pts: 20, icon: '💶', hard: false, category: 'social' },
  { id: 't21', name: 'Llevar/recoger niños a actividades', desc: 'Puntual y sin refunfuñar', pts: 10, icon: '🚌', hard: false, category: 'social' },
]

export const REWARDS: Reward[] = [
  { id: 'r1', name: 'Tarde con amigos', desc: 'Sin preguntas ni hora de vuelta', cost: 30, icon: '🍻' },
  { id: 'r2', name: 'Practicar un deporte', desc: 'Tu deporte favorito sin culpa', cost: 15, icon: '⚽' },
  { id: 'r3', name: 'Noche de sofá solo', desc: 'Tu serie, tu ritmo, sin nadie', cost: 15, icon: '🎮' },
  { id: 'r4', name: 'Comodín: elijo el plan', desc: 'El próximo plan lo eliges tú', cost: 25, icon: '🃏' },
  { id: 'r5', name: 'Comodín: paso de una tarea', desc: 'Te libras de una tarea fea', cost: 35, icon: '🙅' },
  { id: 'r6', name: 'Siesta sin interrupciones', desc: 'Paz total, móvil en silencio', cost: 10, icon: '😴' },
  { id: 'r7', name: 'Fin de semana personal', desc: 'Dos días de independencia total', cost: 80, icon: '🌅' },
  { id: 'r8', name: 'Capricho sin explicaciones', desc: 'Gasto personal sin justificar', cost: 40, icon: '🛍️' },
  { id: 'r9', name: 'Ir de compras sin límite de tiempo', desc: 'Tú marcas el ritmo y el tiempo', cost: 25, icon: '🛒' },
  { id: 'r10', name: 'Spa o masaje', desc: 'Relax total, te lo mereces', cost: 40, icon: '💆' },
  { id: 'r11', name: 'Cena romántica (tú eliges)', desc: 'El restaurante lo decides tú', cost: 35, icon: '🍽️' },
  { id: 'r12', name: 'Día de series sin interrupciones', desc: 'Maratón completo, sin culpa', cost: 15, icon: '📺' },
  { id: 'r13', name: 'Salida con amigas', desc: 'Tu plan, tu gente, sin hora', cost: 30, icon: '👯' },
  { id: 'r14', name: 'Gym o clase de deporte', desc: 'Tu sesión sin prisas ni excusas', cost: 15, icon: '🏋️' },
  { id: 'r15', name: 'Viaje de fin de semana', desc: 'Tú eliges destino y plan', cost: 100, icon: '✈️' },
  { id: 'r16', name: 'Capricho de belleza', desc: 'Peluquería, uñas, lo que quieras', cost: 20, icon: '💅' },
  { id: 'r17', name: 'Noche de juegos o plan tuyo', desc: 'Tu juego, tu plan, tus reglas', cost: 20, icon: '🎲' },
]

export const EMOJIS = ['👩','👨','🧑','👩‍🦰','👨‍🦰','👩‍🦱','👨‍🦱','🧔','👸','🤴','🦸‍♀️','🦸‍♂️','🧙‍♀️','🧙‍♂️','🐱','🐶','🦊','🐸','🐧','🦄']

export function generateRoomId(): string {
  const words = ['casa','amor','hogar','pareja','equipo','juntos','vida','diario']
  const w = words[Math.floor(Math.random() * words.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${w}-${n}`
}
