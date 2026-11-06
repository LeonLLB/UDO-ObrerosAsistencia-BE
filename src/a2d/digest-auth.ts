import { createHash, randomBytes } from 'node:crypto';

interface DesafioDigest {
  reino: string;
  nonce: string;
  opaco?: string;
  algoritmo: string;
  calidadProteccion?: string;
}

function analizarDesafioDigest(encabezado: string): DesafioDigest | null {
  const desafioDigest = /^\s*Digest\s+(.+)$/i.exec(encabezado)?.[1];
  if (!desafioDigest) {
    return null;
  }

  const atributos: Record<string, string> = {};
  const patron = /([a-zA-Z0-9_-]+)\s*=\s*(?:"((?:\\.|[^"])*)"|([^,\s]+))/g;
  for (const coincidencia of desafioDigest.matchAll(patron)) {
    atributos[coincidencia[1].toLowerCase()] = (
      coincidencia[2] ?? coincidencia[3]
    ).replace(/\\(.)/g, '$1');
  }

  if (!atributos.realm || !atributos.nonce) {
    return null;
  }

  return {
    reino: atributos.realm,
    nonce: atributos.nonce,
    opaco: atributos.opaque,
    algoritmo: atributos.algorithm ?? 'MD5',
    calidadProteccion: atributos.qop,
  };
}

function entreComillas(valor: string): string {
  return `"${valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export async function obtenerConAutenticacionDigest(
  url: URL,
  opciones: RequestInit,
  usuario: string,
  clave: string,
): Promise<Response> {
  const respuestaInicial = await fetch(url, opciones);
  if (respuestaInicial.status !== 401) {
    return respuestaInicial;
  }

  const encabezado = respuestaInicial.headers.get('www-authenticate');
  const desafio = encabezado ? analizarDesafioDigest(encabezado) : null;
  if (!desafio) {
    return respuestaInicial;
  }

  const algoritmo = desafio.algoritmo.toLowerCase();
  const usaAlgoritmoDeSesion = algoritmo.endsWith('-sess');
  const algoritmoBase = algoritmo.replace(/-sess$/, '');
  if (algoritmoBase !== 'md5' && algoritmoBase !== 'sha-256') {
    throw new Error(
      `El algoritmo Digest del dispositivo no es compatible: ${desafio.algoritmo}`,
    );
  }

  const calidadProteccion = desafio.calidadProteccion
    ?.split(',')
    .map((valor) => valor.trim().toLowerCase())
    .find((valor) => valor === 'auth');
  if (desafio.calidadProteccion && !calidadProteccion) {
    throw new Error('El desafío Digest del dispositivo no admite qop=auth');
  }

  const nombreHash = algoritmoBase === 'sha-256' ? 'sha256' : 'md5';
  const calcularHash = (valor: string): string =>
    createHash(nombreHash).update(valor).digest('hex');
  const contadorNonce = '00000001';
  const nonceCliente = randomBytes(16).toString('hex');
  const urlSolicitud = new URL(url);
  const ruta = `${urlSolicitud.pathname}${urlSolicitud.search}`;
  const metodo = (opciones.method ?? 'GET').toUpperCase();

  let ha1 = calcularHash(`${usuario}:${desafio.reino}:${clave}`);
  if (usaAlgoritmoDeSesion) {
    ha1 = calcularHash(`${ha1}:${desafio.nonce}:${nonceCliente}`);
  }
  const ha2 = calcularHash(`${metodo}:${ruta}`);
  const respuestaDigest = calidadProteccion
    ? calcularHash(
        `${ha1}:${desafio.nonce}:${contadorNonce}:${nonceCliente}:${calidadProteccion}:${ha2}`,
      )
    : calcularHash(`${ha1}:${desafio.nonce}:${ha2}`);

  const partesAutorizacion = [
    `username=${entreComillas(usuario)}`,
    `realm=${entreComillas(desafio.reino)}`,
    `nonce=${entreComillas(desafio.nonce)}`,
    `uri=${entreComillas(ruta)}`,
    `response=${entreComillas(respuestaDigest)}`,
    `algorithm=${desafio.algoritmo}`,
  ];
  if (calidadProteccion) {
    partesAutorizacion.push(
      `qop=${calidadProteccion}`,
      `nc=${contadorNonce}`,
      `cnonce=${entreComillas(nonceCliente)}`,
    );
  } else if (usaAlgoritmoDeSesion) {
    partesAutorizacion.push(`cnonce=${entreComillas(nonceCliente)}`);
  }
  if (desafio.opaco) {
    partesAutorizacion.push(`opaque=${entreComillas(desafio.opaco)}`);
  }

  await respuestaInicial.body?.cancel();
  const encabezados = new Headers(opciones.headers);
  encabezados.set('Authorization', `Digest ${partesAutorizacion.join(', ')}`);
  return fetch(url, { ...opciones, headers: encabezados });
}
