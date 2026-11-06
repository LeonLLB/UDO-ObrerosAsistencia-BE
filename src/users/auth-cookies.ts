import type { Request } from 'express';

export const NOMBRE_COOKIE_SESION = 'x-token';
export const DURACION_SESION_MS = 20 * 60 * 1000;

export const OPCIONES_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export const OPCIONES_COOKIE_SESION = {
  ...OPCIONES_COOKIE,
  maxAge: DURACION_SESION_MS,
};

export function obtenerCookie(
  request: Request,
  nombre: string,
): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  const prefijo = `${nombre}=`;
  const cookie = header
    .split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(prefijo));
  const valor = cookie?.slice(prefijo.length);

  if (!valor) return undefined;
  return valor.startsWith('"') && valor.endsWith('"')
    ? valor.slice(1, -1)
    : valor;
}

export function obtenerCookiesRedactadas(
  request: Request,
): Record<string, string> {
  const header = request.headers.cookie;
  if (!header) return {};

  return Object.fromEntries(
    header
      .split(';')
      .map((parte) => parte.trim().split('=', 1)[0])
      .filter(Boolean)
      .map((nombre) => [nombre, '[REDACTED]']),
  );
}
