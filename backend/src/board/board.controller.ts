import { Controller, Get } from '@nestjs/common';
import { BOARD, CARDS, GAME_CONFIG, GROUP_COLORS } from '../engine/board.config';

// Serves the board & economy config from the single source of truth so the
// frontend never hardcodes tiles or prices in React.
@Controller('board')
export class BoardController {
  @Get()
  board() {
    return { tiles: BOARD, groupColors: GROUP_COLORS, config: GAME_CONFIG };
  }

  @Get('cards')
  cards() {
    // Only expose deck + counts publicly; card outcomes are resolved server-side.
    return CARDS.map((c) => ({ id: c.id, deck: c.deck, title: c.title, description: c.description }));
  }
}
