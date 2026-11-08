import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EstablecerClaveDto {
  @IsString()
  @Matches(/^\d{1,20}$/, {
    message: 'La cédula debe contener únicamente números',
  })
  cedula!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La clave debe tener al menos 5 caracteres' })
  @MaxLength(72, { message: 'La clave no puede superar 72 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La confirmación debe tener al menos 5 caracteres' })
  @MaxLength(72, {
    message: 'La confirmación no puede superar 72 caracteres',
  })
  password2!: string;
}
