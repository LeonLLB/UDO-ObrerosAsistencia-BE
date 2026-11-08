# API de asistencia de personal obrero

API desarrollada con NestJS, TypeORM y MariaDB para administrar personal,
áreas y registros de asistencia, e integrarse con un dispositivo Hikvision.

## Configuración

Completa las variables de `.env` usando `.env.example`:

```env
PUERTO=3000
NODE_ENV=development
IP_DISPOSITIVO=192.168.10.64
USUARIO_DISPOSITIVO=
CLAVE_DISPOSITIVO=
DESFASE_HORARIO_DISPOSITIVO=-04:00
HOST_BD=localhost
PUERTO_BD=3336
USUARIO_BD=root
CLAVE_BD=
NOMBRE_BD=UDO_ObrerosAsistencia
JWT_SECRET=una-clave-aleatoria-larga-y-segura
REDIS_URI=redis://localhost:6379
```

La aplicación aplica las migraciones al iniciar. Estas conservan los datos
existentes y usan nombres en español para las tablas y columnas de asistencia.
La sincronización automática del esquema de TypeORM está desactivada.

## Usuarios y sesiones

- `POST /auth/login` recibe `{"cedula":"12345","clave":"..."}` y devuelve una
  cookie de sesión `httpOnly`.
- `GET /auth/revalidate/:TOKEN` revalida el token para llamadas desde el
  servidor. Las peticiones autenticadas `POST`, `PUT` y `DELETE` también
  renuevan la cookie al completarse correctamente.
- `POST /auth/logout` elimina la cookie del cliente.
- `GET /users/:cedula/status` informa si la cuenta está habilitada (`status: 1`)
  o no tiene una clave activa (`status: 0`). Para cédulas sin cuenta devuelve
  `status: 0`.
- `POST /users/set-password` recibe `cedula`, `password` y `password2`; valida
  que coincidan y que la cuenta tenga `status: 0`, luego guarda la clave con
  bcrypt y activa la cuenta (`status: 1`).
- `GET /users`, `GET /users/:cedula`, `POST /users`, `PUT /users/:cedula`,
  `PUT /users/:cedula/clave` y `DELETE /users/:cedula` requieren una sesión de
  tipo `A` (Administrador). Reiniciar la clave cambia `status` a `0` y borra
  la clave (`NULL`); el usuario debe establecer una nueva mediante
  `POST /users/set-password` antes de iniciar sesión. El tipo `C` (Consulta) no
  puede administrar usuarios.
- Las claves se guardan con bcrypt. Seguimientos de solicitudes HTTP se
  almacenan en `seguimientos`; los valores sensibles de cuerpos, encabezados y
  cookies se redactan antes de guardarse. Cada seguimiento se relaciona con su
  usuario mediante `user_id`; la relación es muchos-a-uno y conserva los
  registros si se elimina el usuario.
- La verificación de conectividad a Internet continúa ejecutándose cada minuto
  y registra el resultado en `Health`.

No existe registro público. El primer Administrador se provisiona directamente
en la base de datos. Genera el hash con bcryptjs y ejecuta el `INSERT` con los
datos reales:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 10).then(console.log)" "CLAVE_SEGURA"
```

```sql
INSERT INTO usuarios (cedula, nombres, apellidos, tipo, status, clave)
VALUES ('CEDULA', 'NOMBRES', 'APELLIDOS', 'A', 1, 'HASH_BCRYPT_GENERADO');
```

## Personal y áreas

- Las áreas/dependencias se administran desde el módulo separado `areas`:
  `POST`, `GET` en `/areas`; `GET`, `PUT` y `DELETE` en `/areas/:id`.
- `POST`, `GET` en `/personal`; `GET`, `PUT` y `DELETE` en
  `/personal/:id`.
- Al crear personal, se registra también el usuario del dispositivo usando la
  cédula como número de empleado y combinando nombres y apellidos. `tipo`
  acepta `administrativo` u `obrero`; `status` usa `1` para activo y `0` para
  inactivo.
- Al actualizar nombres o apellidos se actualiza el usuario del dispositivo.
  La cédula es inmutable: si se ingresó incorrectamente, elimina el personal y
  vuelve a crearlo con la cédula correcta.
- Al crear, editar o eliminar personal, primero se comprueba que el endpoint
  ISAPI del captahuella responda. Personal inactivo se sincroniza con
  `Valid.enable = false`; al reactivarlo se vuelve a habilitar.
- `PUT /personal/:id/toggle-status` invierte el estado del trabajador y lo
  sincroniza con el captahuella.
- Al eliminar personal, se elimina primero el usuario del dispositivo y luego
  el registro del personal.
- `GET /personal/:id/asistencia/:fecha` devuelve los intervalos y el total
  trabajado en horas y minutos.
- `GET /personal/asistencia/:fecha/resumen` devuelve el resumen diario de cada
  persona con intervalos completos.

Ejemplo para crear personal:

```json
{
  "cedula": "12345",
  "nombres": "Ana",
  "apellidos": "Pérez",
  "fechaIngreso": "2026-01-01",
  "tipo": "obrero",
  "status": 1,
  "idAreaEncargada": 1
}
```

Para crear un área, envía
`{"nombre":"DACE"}` a `POST /areas`.

## Dispositivo y asistencia

- El módulo A2D no expone rutas HTTP: solo ofrece servicios internos para
  Personal y la sincronización programada. Crear, actualizar o eliminar
  personal invoca la operación correspondiente en el dispositivo.
- El servicio consulta la API ISAPI con autenticación Digest y pagina de 10 en 10. Los campos enviados y recibidos por el dispositivo conservan los nombres
  que exige el protocolo ISAPI.
- La sincronización del dispositivo se ejecuta cada minuto. El cron diario
  corre a las 00:05 (hora de Caracas) y asigna `estado = 0` a la última marca
  válida del día anterior cuando queda sin pareja.

La tabla `movimientos_a2d` guarda `usuario`, `fecha_hora`, `codigo_menor`,
`estado` y `personal_id`. `vista_intervalos_asistencia_diaria` genera pares de
marcas válidas y presenta id, cédula, nombres y apellidos. La vista
`vista_resumen_asistencia_diaria` suma `duracion_segundos` y calcula
`horas_trabajadas` dividiendo el total entre 3600.

## Ejecución

```bash
pnpm install
pnpm run start:dev
```

Para compilar y revisar el formato:

```bash
pnpm run build
pnpm run lint
```
