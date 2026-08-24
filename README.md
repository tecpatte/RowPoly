# 🎲 RowPoly — Monopoly Colombia

Juego de mesa inmobiliario **multijugador online en tiempo real** con identidad
propia y sabor colombiano. El servidor es la **única autoridad** sobre el estado
de la partida: el cliente solo envía comandos, nunca dinero, dados ni posiciones.

> Implementación **100% original**. No usa código, assets, nombres ni branding de
> Monopoly, Richup u otros juegos. Toma solo las mecánicas generales del género.

---

## 🚀 Arranque rápido (Docker)

Requisitos: Docker + Docker Compose.

```bash
cp .env.example .env      # opcional: ajusta secretos
docker compose up --build
```

Esto levanta **PostgreSQL**, siembra el tablero MONOPOLY COLOMBIA (40 casillas y
las dos barajas) automáticamente al iniciar el backend, y sirve:

| Servicio | URL |
|----------|-----|
| Frontend (juego) | http://localhost:4321 |
| Backend API      | http://localhost:3001/api |
| PostgreSQL       | localhost:5432 |

Abre `http://localhost:4321` en **dos o más navegadores** (o pestañas de
incógnito), entra como invitado, crea una sala en uno, únete con el código desde
los otros y juega.

> El seed corre solo en el arranque. Para re-sembrar manualmente:
> ```bash
> npm run seed         # (desde la raíz) === npm --prefix backend run seed
> ```

---

## 🧱 Stack

**Backend** · NestJS · TypeScript · Socket.IO · REST · PostgreSQL · Prisma ·
JWT · Argon2 · class-validator / class-transformer

**Frontend** · Astro · TypeScript · React (islas) · TailwindCSS ·
socket.io-client · Zustand

**Infra** · Docker · Docker Compose · PostgreSQL · (Redis reservado a futuro) · `.env`

---

## 🏛️ Arquitectura

```
Browser ──▶ Astro/React ──(Socket.IO)──▶ NestJS Gateway ──▶ GameManager
                                                              │
                                                              ▼
                                                          GameEngine (reglas puras)
                                                              │
                                                              ▼
                                                        Prisma ──▶ PostgreSQL
```

- **`backend/src/engine`** — el corazón. `GameEngine` es **TypeScript puro**, sin
  NestJS/Socket.IO/Prisma, totalmente testeable. Contiene todas las reglas:
  dados, movimiento, compra, renta, construcción, cartas, cárcel, trueques y
  bancarrota. El tablero y las cartas viven en `board.config.ts` (única fuente de
  verdad, compartida por el motor y el seed).
- **`GameManager`** (`backend/src/game`) — orquesta salas en memoria (autoridad
  del estado vivo), temporizadores de turno, difusión por WebSocket y
  persistencia best-effort.
- **`GameGateway`** — autentica el socket por JWT y enruta comandos.
- **Persistencia** — PostgreSQL guarda identidad, salas, referencia del tablero,
  un **log de eventos** y los resultados/estadísticas. La partida en curso vive en
  memoria y se reconstruye para reconexión vía `get_state`.

### Módulos backend

`auth` · `users` · `board` · `game` (rooms + gateway + manager + engine) ·
`prisma`. Cada acción crítica valida: **usuario autenticado + pertenencia a la
partida + dueño del turno + estado del juego + reglas de negocio**.

---

## 🕹️ Cómo se juega (loop)

1. Entras (invitado, registro o login) y creas/te unes a una sala por código.
2. El anfitrión inicia (2–8 jugadores).
3. En tu turno: **lanzas dados** → te mueves → si caes en propiedad libre,
   **compras o no**; si es ajena, **pagas renta**; si es carta/impuesto/cárcel, se
   resuelve en el servidor.
4. En fase de acción: **construyes** casas/hotel (con el grupo de color completo),
   **negocias** con otros jugadores, o **terminas el turno**.
5. Sin fondos → **bancarrota**. Último jugador solvente → **gana**.

---

## 🎨 El tablero (jerarquía de color obligatoria)

🟫 Marrón < 🩵 Celeste < 🩷 Rosado < 🟧 Naranja < 🟥 Rojo < 🟨 Amarillo < 🟩 Verde < 🟦 Azul oscuro

Desde Sincelejo y Leticia (marrón) hasta **El Poblado** y **Rosales** (azul
oscuro, lo más caro). Transportes (Tren de la Sabana, Ferrocarril de Antioquia…),
servicios (Energía de Colombia, Acueducto Nacional), impuestos (Predial, DIAN),
**El Calabozo**, **Descanso en la Playa** y **SALIDA — ¡Vamos pues!**.

Cartas en dos barajas: **¿Qué más pues?** (te pasa a ti) y **La Vuelta**
(comunitarias). Todo es configuración/datos, no lógica en React.

---

## 🛡️ Anti-cheat

El cliente **solo** emite comandos: `ROLL_DICE`, `BUY_PROPERTY`, `DECLINE_BUY`,
`BUILD_HOUSE`, `BUILD_HOTEL`, `SELL_BUILDING`, `MORTGAGE`, `UNMORTGAGE`,
`PAY_BAIL`, `END_TURN`, `PROPOSE_TRADE`, `RESPOND_TRADE`.
Nunca envía `newBalance`, `newPosition`, `diceResult`, `rentAmount` ni
`propertyPrice` — el servidor lo calcula todo.

---

## 🧪 Tests

```bash
cd backend && npm test
```

Cubre la lógica económica del `GameEngine` (compra, renta, grupos, transportes,
servicios, dobles→cárcel, construcción pareja, bancarrota→fin) y una prueba de
**integración** que corre una partida completa multijugador a través del
`GameManager` + difusión por WebSocket hasta declarar ganador.

---

## 🔧 Desarrollo local (sin Docker)

Necesitas un PostgreSQL en `localhost:5432`.

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run seed            # crea el schema + siembra el tablero
npm run start:dev       # http://localhost:3001/api

# Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:4321
```

---

## ⚙️ Configuración

Toda la economía es configurable en `backend/src/engine/board.config.ts`
(`GAME_CONFIG`): dinero inicial ($1.500), recompensa de SALIDA, fianza del
Calabozo, rentas de transporte, multiplicador de servicios, duración de turno.
Al crear una sala se pueden ajustar dinero inicial, máx. jugadores y privacidad.

Variables de entorno: ver [`.env.example`](.env.example).

---

## 🗺️ Fases implementadas

- **Fase 1** — monorepo, auth (registro/login/invitado + refresh), salas,
  WebSockets, tablero y loop jugable completo.
- **Fase 2** — casas, hoteles, **venta de construcciones**, **hipotecas**
  (hipotecar/levantar), cartas, cárcel con **fianza voluntaria**, impuestos,
  transportes, servicios y **trueques** atómicos.
- **Fase 3** — perfiles con estadísticas (victorias, dinero ganado/gastado,
  propiedades, tiempo), **historial de partidas**, leaderboard, chat en partida,
  reconexión (`get_state`) y **matchmaking** (`POST /rooms/quickplay`).
- **Fase 4 (base)** — avatares, **logros** data-driven, e inspector de propiedades
  con temática de ciudades. Arquitectura lista para múltiples tableros
  (`GameEngine` recibe el tablero como parámetro), cosméticos y modo por equipos.

### Endpoints extra
`POST /rooms/quickplay` · `GET /users/me` (incluye logros) ·
`GET /users/me/history` · `GET /users/leaderboard`

### Comandos WebSocket del jugador
`ROLL_DICE` · `BUY_PROPERTY` · `DECLINE_BUY` · `BUILD_HOUSE` · `BUILD_HOTEL` ·
`SELL_BUILDING` · `MORTGAGE` · `UNMORTGAGE` · `PAY_BAIL` · `END_TURN` ·
`PROPOSE_TRADE` · `RESPOND_TRADE`

## 📄 Licencia

MIT. Dinero y valores ficticios; nombres de impuestos y lugares usados solo con
fines temáticos del juego.
