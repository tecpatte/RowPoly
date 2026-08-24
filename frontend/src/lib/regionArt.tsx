// Original, stylised SVG vignettes evoking each Colombian region — no external
// photos (copyright-safe, instant load). Keyed by board position so every
// property carries a sense of place. viewBox 0 0 120 72, drawn full-bleed.
import type { CSSProperties } from 'react';

type Scene =
  | 'plains' | 'jungle' | 'beach' | 'island' | 'colonial' | 'coffee'
  | 'mountainCity' | 'modernCity' | 'waterRock' | 'walledCity' | 'carnival';

// position -> scene
const POSITION_SCENE: Record<number, Scene> = {
  1: 'plains',        // Sincelejo (sabana)
  3: 'jungle',        // Leticia (Amazonas)
  6: 'beach',         // Santa Marta
  8: 'island',        // San Andrés
  9: 'colonial',      // Villa de Leyva
  11: 'colonial',     // Barichara
  13: 'coffee',       // Salento
  14: 'waterRock',    // Guatapé
  16: 'modernCity',   // Cali
  18: 'carnival',     // Barranquilla
  19: 'mountainCity', // Bucaramanga
  21: 'mountainCity', // Bogotá
  23: 'mountainCity', // Medellín
  24: 'walledCity',   // Cartagena
  26: 'modernCity',   // Parque 93
  27: 'modernCity',   // Zona T
  29: 'beach',        // El Rodadero
  31: 'jungle',       // Chocó
  32: 'jungle',       // Guainía
  34: 'island',       // Isla privada
  37: 'modernCity',   // El Poblado
  39: 'modernCity',   // Rosales
};

const G = (id: string, stops: Array<[string, number]>) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    {stops.map(([c, o]) => <stop key={o} offset={`${o}%`} stopColor={c} />)}
  </linearGradient>
);

function Sky({ id, from, to }: { id: string; from: string; to: string }) {
  return <>{G(id, [[from, 0], [to, 100]])}<rect x="0" y="0" width="120" height="72" fill={`url(#${id})`} /></>;
}

const scenes: Record<Scene, (k: string) => JSX.Element> = {
  plains: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#ffd28a" to="#ffe8c2" />
      <circle cx="92" cy="20" r="10" fill="#ffb454" opacity="0.85" />
      <path d="M0 52 Q60 44 120 52 V72 H0 Z" fill="#6fae4f" />
      <path d="M0 60 Q60 54 120 60 V72 H0 Z" fill="#548a3a" />
      <path d="M24 52 l3 -9 l3 9 z" fill="#3f6b2c" /><rect x="26" y="50" width="2" height="4" fill="#5a3d24" />
    </svg>
  ),
  jungle: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#bfe6c9" to="#e7f4e5" />
      <path d="M0 40 Q30 26 60 40 T120 40 V72 H0 Z" fill="#2f7d4f" />
      <path d="M0 50 Q40 38 80 50 T120 48 V72 H0 Z" fill="#1f6b41" />
      <path d="M0 64 Q60 58 120 64 V72 H0 Z" fill="#0f5230" />
      <g fill="#124c2e"><path d="M20 60 q-8 -14 0 -24 q8 10 0 24z" /><path d="M96 62 q10 -16 0 -28 q-10 12 0 28z" /></g>
    </svg>
  ),
  beach: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#8fd3ff" to="#d7f0ff" />
      <circle cx="24" cy="18" r="8" fill="#fff2b0" />
      <rect x="0" y="40" width="120" height="18" fill="#3aa6d6" />
      <path d="M0 46 q30 6 60 0 t60 0 V58 H0 Z" fill="#2b86b8" />
      <path d="M0 56 Q60 50 120 56 V72 H0 Z" fill="#f2d9a6" />
      <g stroke="#3f6b2c" strokeWidth="2" fill="none"><path d="M96 56 v-16" /></g>
      <path d="M96 40 q-12 -4 -16 2 q10 -2 16 2 q12 -6 18 -1 q-10 -3 -18 -3z" fill="#3f8f3f" />
    </svg>
  ),
  island: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#63c6f0" to="#bfeeff" />
      <rect x="0" y="38" width="120" height="34" fill="#1fa5c9" />
      <path d="M0 44 q30 5 60 0 t60 0 V52 H0Z" fill="#158aa8" opacity="0.7" />
      <ellipse cx="60" cy="56" rx="30" ry="8" fill="#f0dca8" />
      <path d="M60 50 v-12" stroke="#3f6b2c" strokeWidth="2" />
      <path d="M60 38 q-10 -3 -14 1 q9 -1 14 2 q9 -5 15 -1 q-8 -3 -15 -2z" fill="#3f8f3f" />
    </svg>
  ),
  colonial: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#ffe0b0" to="#fff3df" />
      <path d="M0 72 V50 H120 V72 Z" fill="#f6efe2" />
      <g fill="#f3e7d3" stroke="#d8c3a3" strokeWidth="0.8">
        <rect x="8" y="44" width="20" height="28" /><rect x="34" y="40" width="22" height="32" />
        <rect x="80" y="42" width="20" height="30" /><rect x="102" y="46" width="14" height="26" />
      </g>
      <g fill="#c05a3a"><path d="M6 44 h24 l-4 -6 h-16 z" /><path d="M32 40 h26 l-5 -7 h-16 z" /><path d="M78 42 h24 l-4 -6 h-16 z" /></g>
      <rect x="62" y="30" width="12" height="42" fill="#efe3ce" /><path d="M60 30 h16 l-8 -8 z" fill="#c05a3a" />
      <g fill="#7a5a3a"><rect x="14" y="54" width="4" height="10" /><rect x="42" y="52" width="4" height="12" /><rect x="86" y="54" width="4" height="10" /></g>
    </svg>
  ),
  coffee: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#cfeafe" to="#eaf7ff" />
      <path d="M0 46 Q30 30 60 44 T120 42 V72 H0Z" fill="#5aa15a" />
      <path d="M0 56 Q40 46 80 56 T120 54 V72 H0Z" fill="#3f7f3f" />
      <g stroke="#6b4a2a" strokeWidth="1.6" fill="none"><path d="M30 60 v-30" /><path d="M52 62 v-36" /><path d="M74 60 v-30" /></g>
      <g fill="#2f6d34"><circle cx="30" cy="28" r="6" /><circle cx="52" cy="24" r="7" /><circle cx="74" cy="28" r="6" /></g>
    </svg>
  ),
  mountainCity: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#9fb8d6" to="#e6eef7" />
      <path d="M0 40 L26 16 L48 40 Z" fill="#5c6f86" /><path d="M40 42 L70 12 L100 42 Z" fill="#48586e" />
      <path d="M84 40 L104 20 L120 40 Z" fill="#5c6f86" />
      <g fill="#2c3a4d">
        <rect x="14" y="44" width="8" height="28" /><rect x="24" y="38" width="9" height="34" /><rect x="36" y="46" width="7" height="26" />
        <rect x="52" y="34" width="10" height="38" /><rect x="66" y="42" width="8" height="30" /><rect x="80" y="40" width="9" height="32" /><rect x="94" y="46" width="8" height="26" />
      </g>
      <g fill="#ffd36b" opacity="0.8"><rect x="26" y="42" width="2" height="2" /><rect x="54" y="38" width="2" height="2" /><rect x="82" y="44" width="2" height="2" /></g>
    </svg>
  ),
  modernCity: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#243a6b" to="#4a6ea8" />
      <circle cx="98" cy="16" r="7" fill="#fdf0b0" opacity="0.9" />
      <g fill="#1a2742">
        <rect x="8" y="30" width="12" height="42" /><rect x="22" y="20" width="10" height="52" /><rect x="34" y="36" width="12" height="36" />
        <rect x="50" y="14" width="11" height="58" /><rect x="64" y="28" width="12" height="44" /><rect x="80" y="22" width="10" height="50" /><rect x="94" y="34" width="13" height="38" />
      </g>
      <g fill="#8fd0ff" opacity="0.85">
        {[...Array(30)].map((_, i) => <rect key={i} x={10 + (i * 7) % 100} y={24 + ((i * 13) % 40)} width="2" height="2" />)}
      </g>
    </svg>
  ),
  waterRock: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#bfe8ff" to="#e9f7ff" />
      <path d="M64 48 L74 14 L86 48 Z" fill="#5a6b57" /><path d="M70 30 h8 M69 38 h11" stroke="#43503f" strokeWidth="1.5" />
      <path d="M0 48 Q30 42 60 48 T120 48 V72 H0Z" fill="#2f9bc9" />
      <path d="M0 58 Q40 52 80 58 T120 56 V72 H0Z" fill="#1f7ea8" />
      <g fill="#e85d75"><rect x="10" y="52" width="6" height="6" /><rect x="24" y="54" width="6" height="6" /></g>
      <g fill="#f4c430"><rect x="17" y="52" width="6" height="6" /><rect x="31" y="54" width="6" height="6" /></g>
    </svg>
  ),
  walledCity: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#ffc98a" to="#ffe9c9" />
      <circle cx="96" cy="18" r="9" fill="#ff9d5c" opacity="0.85" />
      <rect x="0" y="46" width="120" height="10" fill="#caa06a" />
      <g fill="#caa06a">{[...Array(14)].map((_, i) => <rect key={i} x={i * 9} y="42" width="5" height="5" />)}</g>
      <g fill="#e7d3b0" stroke="#c9ac82" strokeWidth="0.6"><rect x="16" y="30" width="12" height="16" /><rect x="60" y="26" width="10" height="20" /><rect x="92" y="32" width="12" height="14" /></g>
      <g fill="#c05a3a"><path d="M14 30 h16 l-8 -6 z" /><path d="M59 26 h12 l-6 -6 z" /><path d="M90 32 h16 l-8 -6 z" /></g>
      <rect x="0" y="56" width="120" height="16" fill="#2f9bc9" />
    </svg>
  ),
  carnival: (k) => (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Sky id={`${k}s`} from="#ffd36b" to="#ffefc2" />
      <g fill="#1a2742"><rect x="10" y="40" width="10" height="32" /><rect x="26" y="34" width="9" height="38" /><rect x="86" y="38" width="10" height="34" /><rect x="100" y="44" width="9" height="28" /></g>
      <g><path d="M0 20 Q30 34 60 20 T120 20" stroke="#e85d75" strokeWidth="1.5" fill="none" /></g>
      <g>{['#e85d75', '#f4c430', '#2f9bc9', '#3f8f3f', '#e85d75', '#f4c430'].map((c, i) => (
        <path key={i} d={`M${8 + i * 20} 22 l6 0 l-3 7 z`} fill={c} />
      ))}</g>
    </svg>
  ),
};

export function sceneFor(position: number): Scene | null {
  return POSITION_SCENE[position] ?? null;
}

export function RegionArt({ position, className, style }: { position: number; className?: string; style?: CSSProperties }) {
  const scene = sceneFor(position);
  if (!scene) return null;
  return <div className={className} style={style} aria-hidden>{scenes[scene](`a${position}`)}</div>;
}
