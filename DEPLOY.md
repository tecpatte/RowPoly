# 🚀 Desplegar RowPoly online

## ⚠️ Lo primero — la verdad sobre Vercel

RowPoly **no se puede desplegar completo en Vercel**, y no es un tema de
configuración: es arquitectura.

- El **backend** es un servidor **con estado en memoria** (el `GameManager`
  guarda las partidas activas en un `Map` del proceso) y usa **WebSockets
  (Socket.IO)** para el tiempo real.
- **Vercel es serverless**: funciones efímeras, sin proceso persistente y **sin
  soporte de WebSockets**. Ahí el estado de la partida se perdería entre
  peticiones y el multijugador en tiempo real simplemente no funcionaría.

👉 Por eso el despliegue correcto es **repartido**, y aun así el usuario entra a
**una sola URL** (la del frontend):

| Pieza | Dónde | Por qué |
|-------|-------|---------|
| **Frontend** (Astro/React) | **Vercel** | Es un SPA estático → CDN, rapidísimo, gratis. |
| **Backend** (NestJS + Socket.IO) | **Railway** (o Render/Fly) | Necesita proceso persistente + WebSockets. |
| **PostgreSQL** | **Railway** (o Neon/Supabase) | DB gestionada, misma plataforma que el backend. |

> Alternativa de una sola plataforma: poner **todo en Railway** (frontend estático
> + backend + Postgres) y saltarse Vercel. Funciona igual; pierdes la CDN de
> Vercel. Este documento usa Vercel + Railway porque pediste Vercel.

El código ya quedó listo para esto: en Vercel el frontend compila **estático**
automáticamente (`VERCEL=1` → `output: 'static'`); en local/Docker sigue igual.

---

## 1) Base de datos + Backend en Railway

1. Crea cuenta en https://railway.app y un **New Project**.
2. **Add → Database → PostgreSQL**. Railway crea la DB y te da un `DATABASE_URL`.
3. **Add → GitHub Repo** (sube antes RowPoly a GitHub) y selecciona el repo.
   - En el servicio del backend, **Settings → Root Directory** = `backend`.
   - Railway detecta el `backend/Dockerfile` y lo usa tal cual. El arranque ya
     corre migraciones + seed + server:
     `prisma db push && tsx prisma/seed.ts && node dist/main.js`.
4. En el servicio backend → **Variables**, define:
   ```
   DATABASE_URL   = ${{Postgres.DATABASE_URL}}   (referencia la DB del proyecto)
   JWT_SECRET     = <cadena larga aleatoria>
   JWT_REFRESH_SECRET = <otra cadena larga aleatoria>
   CORS_ORIGIN    = https://TU-APP.vercel.app     (la pones tras el paso 2)
   # PORT lo inyecta Railway solo; main.ts ya lo respeta.
   ```
5. **Settings → Networking → Generate Domain**. Copia la URL pública, p. ej.
   `https://rowpoly-backend-production.up.railway.app`. Esa es tu API/WS.
6. Mantén **1 sola instancia** (sin escalado horizontal). El estado de partida
   vive en memoria; con varias instancias no se comparte (para eso está previsto
   Redis a futuro). Un reinicio del backend cierra las partidas activas — normal
   en un solo nodo.

**Prueba rápida:** abre `https://…railway.app/api/board` → debe devolver 40 casillas.

---

## 2) Frontend en Vercel

1. Crea cuenta en https://vercel.com → **Add New → Project** → importa el repo.
2. En la config del proyecto:
   - **Root Directory** = `frontend`
   - Framework Preset: **Astro** (lo detecta solo). Build = `astro build`,
     Output = `dist`. No toques nada más.
3. **Environment Variables** (apuntan al backend de Railway):
   ```
   PUBLIC_API_URL = https://TU-BACKEND.up.railway.app/api
   PUBLIC_WS_URL  = https://TU-BACKEND.up.railway.app
   ```
4. **Deploy**. Vercel te da `https://TU-APP.vercel.app`.
5. **Vuelve a Railway** y pon esa URL en `CORS_ORIGIN` del backend (paso 1.4).
   Redeploy del backend. (Si quieres, admite varias separadas por coma:
   `https://tu-app.vercel.app,https://tu-dominio.com`.)

Listo: entras a `https://TU-APP.vercel.app` y juega igual que en local, en tiempo
real, apuntando a la API/WS de Railway.

---

## 3) Checklist de que quedó bien

- [ ] `https://backend.railway.app/api/board` responde 40 casillas.
- [ ] La web de Vercel carga sin errores 401/CORS en consola.
- [ ] Registro/invitado funciona (toca la DB de Railway).
- [ ] Dos navegadores distintos → crear/unirse por código → **la ficha se mueve
      en tiempo real** en ambos (confirma que el WebSocket conecta por WSS).

Si ves errores **CORS**: `CORS_ORIGIN` del backend debe ser EXACTA la URL de
Vercel (con `https://`, sin `/` final). Si el **WebSocket** no conecta: revisa
que `PUBLIC_WS_URL` sea el dominio del backend **sin** `/api`.

---

## Variables — resumen

| Servicio | Variable | Valor |
|----------|----------|-------|
| Railway (backend) | `DATABASE_URL` | (referencia a la Postgres de Railway) |
| Railway (backend) | `JWT_SECRET` / `JWT_REFRESH_SECRET` | cadenas aleatorias largas |
| Railway (backend) | `CORS_ORIGIN` | `https://tu-app.vercel.app` |
| Vercel (frontend) | `PUBLIC_API_URL` | `https://tu-backend.up.railway.app/api` |
| Vercel (frontend) | `PUBLIC_WS_URL` | `https://tu-backend.up.railway.app` |

---

## ¿Y si SÍ o SÍ tiene que ser todo-Vercel?

Habría que **reescribir** la capa de tiempo real y de estado:
- Estado de partida → Postgres/Redis (nada en memoria).
- Socket.IO → un realtime gestionado compatible con serverless (Ably, Pusher,
  Supabase Realtime) o polling — Vercel no ofrece WebSockets nativos.
- DB → Vercel Postgres (Neon) o Neon directo.

Es un rediseño grande del núcleo que hoy funciona; no lo recomiendo salvo que sea
un requisito duro. La ruta Vercel + Railway te deja online hoy, con una URL, y
funcionando igual que en local.
