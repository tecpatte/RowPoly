import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export class CreateRoomDto {
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  maxPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(20000)
  startingMoney?: number;
}

export class JoinRoomDto {
  @IsString()
  @Length(4, 6)
  code!: string;
}

// --- WebSocket command payloads (client -> server). No money/dice/positions. ---
export class TradeSideDto {
  @IsInt()
  @Min(0)
  money = 0;

  @IsArray()
  @IsInt({ each: true })
  properties: number[] = [];
}

export class ProposeTradeDto {
  @IsString()
  toPlayerId!: string;

  @ValidateNested()
  @Type(() => TradeSideDto)
  offer!: TradeSideDto;

  @ValidateNested()
  @Type(() => TradeSideDto)
  request!: TradeSideDto;
}
