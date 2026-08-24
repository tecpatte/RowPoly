// Seeds the MONOPOLY COLOMBIA board (40 tiles) and both card decks.
// Single source of truth = src/engine/board.config.ts, so the seed can never
// drift from what the engine plays.
import { PrismaClient } from '@prisma/client';
import { BOARD, CARDS } from '../src/engine/board.config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando el tablero MONOPOLY COLOMBIA...');

  for (const t of BOARD) {
    const data = {
      position: t.position,
      type: t.type,
      name: t.name,
      region: t.region ?? null,
      description: t.description ?? null,
      group: t.group ?? null,
      color: t.color ?? null,
      price: t.price ?? null,
      baseRent: t.baseRent ?? null,
      setRent: t.setRent ?? null,
      houseRent1: t.houseRent?.[0] ?? null,
      houseRent2: t.houseRent?.[1] ?? null,
      houseRent3: t.houseRent?.[2] ?? null,
      houseRent4: t.houseRent?.[3] ?? null,
      hotelRent: t.hotelRent ?? null,
      houseCost: t.houseCost ?? null,
      hotelCost: t.hotelCost ?? null,
      deck: t.deck ?? null,
      taxAmount: t.taxAmount ?? null,
    };
    await prisma.property.upsert({ where: { position: t.position }, create: data, update: data });
  }
  console.log(`   ✓ ${BOARD.length} casillas`);

  for (const c of CARDS) {
    const data = {
      id: c.id,
      deck: c.deck,
      title: c.title,
      description: c.description,
      action: c.action,
      amount: c.amount ?? null,
      position: c.position ?? null,
      movement: c.movement ?? null,
    };
    await prisma.card.upsert({ where: { id: c.id }, create: data, update: data });
  }
  console.log(`   ✓ ${CARDS.length} cartas (¿Qué más pues? / La Vuelta)`);
  console.log('✅ Seed completo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
