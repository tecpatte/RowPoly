// MONOPOLY COLOMBIA — single source of truth for the 40-tile RowPoly board.
// Consumed by the GameEngine AND the Prisma seed, so the DB and the running
// game can never disagree. Economics follow the mandatory hierarchy:
// BROWN < LIGHT_BLUE < PINK < ORANGE < RED < YELLOW < GREEN < DARK_BLUE.
import { Card, GameConfig, Group, Tile } from './types';

export const GROUP_COLORS: Record<Group, string> = {
  BROWN: '#8D6E63',
  LIGHT_BLUE: '#4FC3F7',
  PINK: '#EC407A',
  ORANGE: '#FB8C00',
  RED: '#E53935',
  YELLOW: '#F4C430',
  GREEN: '#2E9E5B',
  DARK_BLUE: '#1E3A8A',
};

// Helper to declare a property tile compactly.
function prop(
  position: number,
  name: string,
  region: string,
  group: Group,
  price: number,
  baseRent: number,
  houseRent: [number, number, number, number],
  hotelRent: number,
  houseCost: number,
  description: string,
): Tile {
  return {
    position,
    type: 'PROPERTY',
    name,
    region,
    group,
    color: GROUP_COLORS[group],
    price,
    baseRent,
    setRent: baseRent * 2,
    houseRent,
    hotelRent,
    houseCost,
    hotelCost: houseCost,
    description,
  };
}

export const BOARD: Tile[] = [
  { position: 0, type: 'GO', name: 'SALIDA — ¡VAMOS PUES!', description: 'Recibe tu sueldo al pasar.' },

  prop(1, 'Sincelejo', 'Sucre', 'BROWN', 60, 2, [10, 30, 90, 160], 250, 50,
    'Tierra de sabana, corraleja y ganado. Barato para arrancar.'),
  { position: 2, type: 'CARD', name: '¿Qué más pues?', deck: 'QUE_MAS_PUES', description: 'Saca una carta.' },
  prop(3, 'Leticia', 'Amazonas', 'BROWN', 60, 4, [20, 60, 180, 320], 450, 50,
    'Puerta al Amazonas. Lejos, pero con futuro.'),
  { position: 4, type: 'TAX', name: 'Impuesto Predial', taxAmount: 200, description: 'Paga tu predial al banco.' },
  { position: 5, type: 'TRANSPORT', name: 'Tren de la Sabana', region: 'Cundinamarca', price: 200, description: 'Transporte Colombiano.' },

  prop(6, 'Santa Marta', 'Magdalena', 'LIGHT_BLUE', 100, 6, [30, 90, 270, 400], 550, 50,
    'La bahía más linda de América, dicen los samarios.'),
  { position: 7, type: 'CARD', name: 'La Vuelta', deck: 'LA_VUELTA', description: 'Saca una carta.' },
  prop(8, 'San Andrés', 'Archipiélago', 'LIGHT_BLUE', 100, 6, [30, 90, 270, 400], 550, 50,
    'Mar de siete colores. Turismo garantizado.'),
  prop(9, 'Villa de Leyva', 'Boyacá', 'LIGHT_BLUE', 120, 8, [40, 100, 300, 450], 600, 50,
    'Plaza empedrada y cielo despejado para las estrellas.'),

  { position: 10, type: 'JAIL', name: 'El Calabozo', description: 'De visita... por ahora. No te preocupés.' },

  prop(11, 'Barichara', 'Santander', 'PINK', 140, 10, [50, 150, 450, 625], 750, 100,
    'El pueblo más bonito de Colombia, a paso lento.'),
  { position: 12, type: 'UTILITY', name: 'Energía de Colombia', price: 150, description: 'Servicio: renta según los dados.' },
  prop(13, 'Salento', 'Quindío', 'PINK', 140, 10, [50, 150, 450, 625], 750, 100,
    'Valle de palmas de cera y buen café de olla.'),
  prop(14, 'Guatapé', 'Antioquia', 'PINK', 160, 12, [60, 180, 500, 700], 900, 100,
    'Zócalos de colores y la Piedra del Peñol.'),

  { position: 15, type: 'TRANSPORT', name: 'Ferrocarril de Antioquia', region: 'Antioquia', price: 200, description: 'Transporte Colombiano.' },

  prop(16, 'Cali', 'Valle del Cauca', 'ORANGE', 180, 14, [70, 200, 550, 750], 950, 100,
    'La sucursal del cielo. Salsa hasta el amanecer.'),
  { position: 17, type: 'CARD', name: '¿Qué más pues?', deck: 'QUE_MAS_PUES', description: 'Saca una carta.' },
  prop(18, 'Barranquilla', 'Atlántico', 'ORANGE', 180, 14, [70, 200, 550, 750], 950, 100,
    'La Arenosa, donde el Carnaval manda.'),
  prop(19, 'Bucaramanga', 'Santander', 'ORANGE', 200, 16, [80, 220, 600, 800], 1000, 100,
    'Ciudad de los parques y del buen comer.'),

  { position: 20, type: 'FREE_PARKING', name: 'Descanso en la Playa', description: 'Relájate un turno. No pasa nada... por ahora.' },

  prop(21, 'Bogotá', 'Cundinamarca', 'RED', 220, 18, [90, 250, 700, 875], 1050, 150,
    'La capital fría, enorme y llena de oportunidades.'),
  { position: 22, type: 'CARD', name: 'La Vuelta', deck: 'LA_VUELTA', description: 'Saca una carta.' },
  prop(23, 'Medellín', 'Antioquia', 'RED', 220, 18, [90, 250, 700, 875], 1050, 150,
    'La ciudad de la eterna primavera e innovación.'),
  prop(24, 'Cartagena', 'Bolívar', 'RED', 240, 20, [100, 300, 750, 925], 1100, 150,
    'La Heroica amurallada. Patrimonio y turismo de lujo.'),

  { position: 25, type: 'TRANSPORT', name: 'Tren del Caribe', region: 'Costa Caribe', price: 200, description: 'Transporte Colombiano.' },

  prop(26, 'Parque 93', 'Bogotá', 'YELLOW', 260, 22, [110, 330, 800, 975], 1150, 150,
    'Restaurantes, oficinas y el after preferido de la capital.'),
  prop(27, 'Zona T', 'Bogotá', 'YELLOW', 260, 22, [110, 330, 800, 975], 1150, 150,
    'La zona rosa que nunca duerme.'),
  { position: 28, type: 'UTILITY', name: 'Acueducto Nacional', price: 150, description: 'Servicio: renta según los dados.' },
  prop(29, 'El Rodadero', 'Santa Marta', 'YELLOW', 280, 24, [120, 360, 850, 1025], 1200, 150,
    'Balcón sobre el mar, apartamentos de alto valor.'),

  { position: 30, type: 'GO_TO_JAIL', name: 'Directo al Calabozo', description: 'La embarraste. Vas derecho al Calabozo.' },

  prop(31, 'Eco-resort del Chocó', 'Pacífico', 'GREEN', 300, 26, [130, 390, 900, 1100], 1275, 200,
    'Selva, ballenas y lujo silencioso frente al Pacífico.'),
  prop(32, 'Resort del Guainía', 'Orinoquía', 'GREEN', 300, 26, [130, 390, 900, 1100], 1275, 200,
    'Cerros de Mavecure. Exclusividad en medio de la selva.'),
  { position: 33, type: 'CARD', name: '¿Qué más pues?', deck: 'QUE_MAS_PUES', description: 'Saca una carta.' },
  prop(34, 'Isla privada del Caribe', 'San Bernardo', 'GREEN', 320, 28, [150, 450, 1000, 1200], 1400, 200,
    'Tu propia isla. Esto cuesta una fortuna.'),

  { position: 35, type: 'TRANSPORT', name: 'Ferrocarril del Pacífico', region: 'Valle del Cauca', price: 200, description: 'Transporte Colombiano.' },

  { position: 36, type: 'CARD', name: 'La Vuelta', deck: 'LA_VUELTA', description: 'Saca una carta.' },
  prop(37, 'El Poblado', 'Medellín', 'DARK_BLUE', 350, 35, [175, 500, 1100, 1300], 1500, 200,
    'La zona más codiciada de Medellín. Máximo estatus.'),
  { position: 38, type: 'TAX', name: 'DIAN', taxAmount: 100, description: 'La DIAN te hizo el requerimiento.' },
  prop(39, 'Rosales', 'Bogotá', 'DARK_BLUE', 400, 50, [200, 600, 1400, 1700], 2000, 200,
    'Chapinero Alto y los cerros. Si caés aquí, estás jodido.'),
];

export const GAME_CONFIG: GameConfig = {
  startingMoney: 1500,
  goReward: 200,
  jailBail: 50,
  maxJailTurns: 3,
  transportRent: [25, 50, 100, 200],
  utilityMultiplier: [4, 10],
  maxHousesBeforeHotel: 4,
  turnSeconds: 90,
};

export const PLAYER_COLORS = [
  '#E53935', // rojo
  '#1E88E5', // azul
  '#43A047', // verde
  '#FDD835', // amarillo
  '#8E24AA', // morado
  '#FB8C00', // naranja
  '#00ACC1', // cian
  '#6D4C41', // café
];

// ---- Card decks -----------------------------------------------------------
export const CARDS: Card[] = [
  // ¿QUÉ MÁS PUES? — le pasa directamente al jugador
  { id: 'qmp-01', deck: 'QUE_MAS_PUES', title: 'Chance', description: 'Te pegaste el chance de la esquina. Cobra.', action: 'RECEIVE_MONEY', amount: 150 },
  { id: 'qmp-02', deck: 'QUE_MAS_PUES', title: 'Cuota alimentaria', description: 'Toca ponerse al día con la cuota. Paga.', action: 'PAY_MONEY', amount: 100 },
  { id: 'qmp-03', deck: 'QUE_MAS_PUES', title: 'Nequi', description: 'Te llegó un Nequi que no esperabas. Cobra.', action: 'RECEIVE_MONEY', amount: 100 },
  { id: 'qmp-04', deck: 'QUE_MAS_PUES', title: 'La moto', description: 'Tocó llevar la moto al taller para el rebusque. Paga.', action: 'PAY_MONEY', amount: 80 },
  { id: 'qmp-05', deck: 'QUE_MAS_PUES', title: 'TransMilenio', description: 'Te colaste por el torniquete y te pillaron. Paga.', action: 'PAY_MONEY', amount: 50 },
  { id: 'qmp-06', deck: 'QUE_MAS_PUES', title: 'Fotomulta', description: 'Llegó la fotomulta a la casa. Paga.', action: 'PAY_MONEY', amount: 120 },
  { id: 'qmp-07', deck: 'QUE_MAS_PUES', title: 'La prima', description: 'Cayó la prima de mitad de año. Cobra.', action: 'RECEIVE_MONEY', amount: 200 },
  { id: 'qmp-08', deck: 'QUE_MAS_PUES', title: 'El tío de Miami', description: 'El tío mandó remesa desde el exterior. Cobra.', action: 'RECEIVE_MONEY', amount: 250 },
  { id: 'qmp-09', deck: 'QUE_MAS_PUES', title: 'Pico y placa', description: 'Te pillaron rodando en pico y placa. Paga.', action: 'PAY_MONEY', amount: 90 },
  { id: 'qmp-10', deck: 'QUE_MAS_PUES', title: 'Trámite', description: 'Vuelva mañana. Pierdes el próximo turno.', action: 'LOSE_TURN' },
  { id: 'qmp-11', deck: 'QUE_MAS_PUES', title: 'Fin de semana en la finca', description: 'Te vas a descansar. Avanza a Descanso en la Playa.', action: 'GO_TO_POSITION', position: 20 },
  { id: 'qmp-12', deck: 'QUE_MAS_PUES', title: 'El taxi te dejó', description: 'Te bajaste tres cuadras antes. Retrocede 3 casillas.', action: 'MOVE_BACKWARD', movement: 3 },
  { id: 'qmp-13', deck: 'QUE_MAS_PUES', title: 'Negocio de empanadas', description: 'El puesto de empanadas dio buen mes. Cobra.', action: 'RECEIVE_MONEY', amount: 120 },
  { id: 'qmp-14', deck: 'QUE_MAS_PUES', title: 'La embarraste', description: 'Un lío con el vecino. Directo al Calabozo.', action: 'GO_TO_JAIL' },
  { id: 'qmp-15', deck: 'QUE_MAS_PUES', title: 'Vuelta a la Salida', description: 'Te toca devolverte por un trámite. Ve a la Salida y cobra.', action: 'GO_TO_POSITION', position: 0 },

  // LA VUELTA — situaciones comunitarias
  { id: 'lv-01', deck: 'LA_VUELTA', title: 'Colecta del barrio', description: 'Organizaste la colecta. Cada jugador te da su aporte.', action: 'RECEIVE_FROM_PLAYERS', amount: 30 },
  { id: 'lv-02', deck: 'LA_VUELTA', title: 'Rifa del barrio', description: 'Vendiste boletas de la rifa. Cada jugador te paga.', action: 'RECEIVE_FROM_PLAYERS', amount: 40 },
  { id: 'lv-03', deck: 'LA_VUELTA', title: 'Aguinaldo de diciembre', description: 'El banco reparte aguinaldo a todos.', action: 'EVERYONE_RECEIVES', amount: 100 },
  { id: 'lv-04', deck: 'LA_VUELTA', title: 'Cuota del conjunto', description: 'Cuota extraordinaria de administración por cada propiedad.', action: 'PAY_PER_PROPERTY', amount: 25 },
  { id: 'lv-05', deck: 'LA_VUELTA', title: 'Natillas y buñuelos', description: 'Pusiste el diciembre del barrio. Págale a cada jugador.', action: 'PAY_PLAYERS', amount: 25 },
  { id: 'lv-06', deck: 'LA_VUELTA', title: 'Trancón en la 30', description: 'Quedaste varado y la lió. Directo al Calabozo.', action: 'GO_TO_JAIL' },
  { id: 'lv-07', deck: 'LA_VUELTA', title: 'Quincena', description: 'Cayó la quincena. Cobra.', action: 'RECEIVE_MONEY', amount: 200 },
  { id: 'lv-08', deck: 'LA_VUELTA', title: 'Fin de mes', description: 'Se acabó la plata antes que el mes. Paga.', action: 'PAY_MONEY', amount: 120 },
  { id: 'lv-09', deck: 'LA_VUELTA', title: 'Auditoría DIAN', description: 'Revisaron a los que más tienen. Paga por cada propiedad.', action: 'PAY_PER_PROPERTY', amount: 40 },
  { id: 'lv-10', deck: 'LA_VUELTA', title: 'Vuelva mañana', description: 'Tramitología eterna. Pierdes el próximo turno.', action: 'LOSE_TURN' },
  { id: 'lv-11', deck: 'LA_VUELTA', title: 'El asado del barrio', description: 'Te tocó poner el asado. Paga.', action: 'PAY_MONEY', amount: 90 },
  { id: 'lv-12', deck: 'LA_VUELTA', title: 'Buen mes de rebusque', description: 'El rebusque rindió. Cobra por cada propiedad.', action: 'RECEIVE_PER_PROPERTY', amount: 20 },
  { id: 'lv-13', deck: 'LA_VUELTA', title: 'Policía de tránsito', description: 'Comparendo sorpresa. El banco te cobra a ti.', action: 'PAY_MONEY', amount: 100 },
  { id: 'lv-14', deck: 'LA_VUELTA', title: 'Todos ponen', description: 'Emergencia en el conjunto. Todos le pagan al banco.', action: 'EVERYONE_PAYS', amount: 60 },
];
