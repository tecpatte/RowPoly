import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_ ]+$/, { message: 'El nickname solo permite letras, números, guion bajo y espacios.' })
  nickname!: string;

  @IsString()
  @Length(6, 72)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 72)
  password!: string;
}

export class GuestDto {
  @IsString()
  @Length(3, 20)
  nickname!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 20)
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
