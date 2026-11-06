import { TipoUsuario } from '../tipo-usuario';

export interface UsuarioAutenticado {
  cedula: string;
  nombres: string;
  apellidos: string;
  tipo: TipoUsuario;
}
