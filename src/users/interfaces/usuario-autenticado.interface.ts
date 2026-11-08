import { TipoUsuario } from '../tipo-usuario';

export interface UsuarioAutenticado {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  tipo: TipoUsuario;
}
