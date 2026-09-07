# Sensorization API

API REST en Node.js para la gestión de sensores de temperatura y la ingesta de sus lecturas. Permite registrar sensores (por sondeo HTTP o por carga manual), administrar su ciclo de vida y almacenar las mediciones recibidas, dejando un histórico (`Ingestion`) de cada ejecución de ingesta con su estado y errores. 
Se han añadido unas mejoras y consideraciones al final del documento.

## Índice

- [Descripción general](#descripción-general)
- [Arquitectura y stack tecnológico](#arquitectura-y-stack-tecnológico)
- [Modelo de datos](#modelo-de-datos)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Autenticación](#autenticación)
- [Endpoints](#endpoints)
  - [Usuarios](#usuarios)
  - [Sensores](#sensores)
  - [Ingesta](#ingesta)

## Descripción general

El sistema expone tres grandes bloques funcionales:

1. **Usuarios** – registro, login/logout y sesión mediante JWT en cookie httpOnly.
2. **Sensores** – CRUD de sensores de dos tipos: `HTTP_POLL` (tienen una URL remota de la que se recuperan datos) y `MANUAL_UPLOAD` (reciben los datos directamente en el body de la petición).
3. **Ingesta** – proceso que valida y persiste las lecturas de temperatura de un sensor, dejando constancia de cada ejecución (`Ingestion`) con su resultado (éxito/error), número de registros procesados y mensaje de error si aplica.

## Arquitectura y stack tecnológico

| Componente | Tecnología |
|---|---|
| Runtime | Node.js (ejecutado con `tsx`, soporta JS/TS) |
| Framework HTTP | [Express 5](https://expressjs.com/) |
| Base de datos | PostgreSQL |
| ORM | [Prisma 7](https://www.prisma.io/) con `@prisma/adapter-pg` (driver adapter nativo `pg`) |
| Autenticación | JWT (`jsonwebtoken`) en cookie httpOnly + soporte de header `Authorization: Bearer` |
| Hash de contraseñas | `bcrypt` |
| Validación | Validadores propios (TypeScript) para el recurso `Sensor` |
| Gestión de cookies | `cookie-parser` |
| Variables de entorno | `dotenv` |

**Estructura de carpetas principal:**

```
├── controllers/        # Lógica de negocio (Users, Sensors, Ingestions)
├── routes/              # Definición de rutas Express (Users, Sensors)
├── middlewares/         # Autenticación (auth.js) y blacklist de tokens
├── validators/          # Validación de entrada para sensores
├── lib/prisma.js        # Instancia del cliente Prisma con adapter-pg
├── prisma/
│   ├── schema.prisma    # Esquema de base de datos
│   └── migrations/      # Migraciones SQL
├── generated/prisma/    # Cliente Prisma autogenerado
├── prisma7.config.ts    # Configuración de Prisma (datasource, migraciones)
└── index.js             # Punto de entrada del servidor Express
```

## Modelo de datos

Definido en `prisma/schema.prisma` (PostgreSQL):

- **User**: `id`, `email` (único), `passwordHash`, `createdAt`.
- **Sensor**: `id`, `name`, `sensorCode` (único), `type` (`HTTP_POLL` | `MANUAL_UPLOAD`), `status` (`active` | `paused`), `url` (opcional), `createdAt`, `updatedAt`. Relación 1‑N con `Ingestion` y `Temperature`.
- **Ingestion**: histórico de ejecuciones de ingesta por sensor — `id`, `startedAt`, `finishedAt`, `status` (`success` | `error`), `recordsProcessed`, `errorMessage`, `sensorId`.
- **Temperature**: lecturas — `id`, `timestamp`, `valueC` (decimal), `sensorId`.

## Instalación local

### Requisitos previos

- Node.js (versión compatible con Prisma 7 / Express 5)
- PostgreSQL en local o accesible remotamente
- npm

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd <carpeta-del-proyecto>

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env   # o crear el archivo .env manualmente (ver sección siguiente)

# 4. Generar el cliente de Prisma
npx prisma generate

# 5. Aplicar migraciones a la base de datos
npx prisma migrate dev

# 6. Arrancar en modo desarrollo (con recarga automática)
npm run dev

# Alternativa: arrancar en modo producción
npm start
```

Scripts disponibles (`package.json`):

| Script | Descripción |
|---|---|
| `npm start` | Arranca el servidor con `tsx index.js` |
| `npm run dev` | Arranca en modo desarrollo (`NODE_ENV=development`) con `tsx watch` |
| `npm run db:dev` | Levanta una base de datos local de Prisma (`prisma dev`) y abre Prisma Studio |

## Variables de entorno

Definir un archivo `.env` en la raíz del proyecto con las siguientes claves:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto en el que escucha el servidor Express |
| `KEY` | Secreto utilizado para firmar y verificar los JSON Web Tokens |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL usada por Prisma (formato `postgresql://usuario:password@host:puerto/basededatos`) |
| `SHADOW_DATABASE_URL` | Base de datos "sombra" que usa Prisma para calcular y validar migraciones en desarrollo |

> En modo `production` estas variables deben inyectarse directamente en el entorno de ejecución; en el resto de entornos se cargan automáticamente desde `.env` mediante `dotenv`.

## Autenticación

- El login genera un JWT (expiración de 15 minutos) que se envía como cookie httpOnly `accessToken` (`secure` solo en producción, `sameSite=lax`).
- Las rutas protegidas aceptan el token vía cookie `accessToken` o vía header `Authorization: Bearer <token>`.
- El logout invalida el token añadiéndolo a una blacklist en memoria hasta su expiración natural.

## Endpoints

Todas las respuestas de error devuelven código `400` (o `401`/`404` según el caso) con un mensaje de texto o JSON describiendo el problema.

### Usuarios

#### `POST /register`

Registra un nuevo usuario.

**Entrada (JSON):**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Salida (201):**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

#### `POST /login`

Autentica a un usuario y establece la cookie `accessToken`.

**Entrada (JSON):**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Salida (200):**
```json
{
  "message": "User logged in successfully",
  "user": { "id": "uuid", "email": "usuario@ejemplo.com" }
}
```

#### `POST /logout` 🔒

Revoca el token actual y elimina la cookie de sesión. Requiere autenticación.

**Salida (200):** texto plano confirmando el cierre de sesión.

#### `GET /me` 🔒

Ruta de comprobación de sesión. Requiere autenticación.

**Salida (200):** texto de bienvenida.

### Sensores

Todas las rutas de sensores requieren autenticación 🔒.

#### `POST /sensors/registerSensor`

Registra un nuevo sensor.

**Entrada (JSON):**
```json
{
  "name": "Sensor1",
  "sensorCode": "S001",
  "type": "HTTP_POLL",
  "status": "active",
  "url": "https://ejemplo.com/data"
}
```
- `name` y `sensorCode`: entre 2 y 10 caracteres.
- `type`: `HTTP_POLL` o `MANUAL_UPLOAD`.
- `url`: obligatoria y validada (solo `http`/`https`) si `type = HTTP_POLL`.
- `status`: `active` o `paused`.

**Salida (201):** objeto `Sensor` creado.

#### `GET /sensors/getSensors`

Devuelve todos los sensores registrados.

**Salida (200):** array de objetos `Sensor`.

#### `GET /sensors/getSensorById/:id`

**Salida (200):** objeto `Sensor` correspondiente al `id`.

#### `PATCH /sensors/updateSensorById/:id`

Actualiza uno o varios campos de un sensor existente.

**Entrada (JSON, campos opcionales):**
```json
{
  "name": "NuevoNombre",
  "sensorCode": "S002",
  "type": "MANUAL_UPLOAD",
  "status": "paused",
  "url": "https://ejemplo.com/data"
}
```

**Salida (200):** objeto `Sensor` actualizado.

#### `DELETE /sensors/deleteSensorById/:id`

Elimina un sensor (y en cascada sus ingestas y temperaturas asociadas).

**Salida (200):** objeto `Sensor` eliminado.

### Ingesta

#### `POST /ingestion/ingest/:id/ingest` 🔒

Ejecuta un proceso de ingesta de temperaturas para el sensor `:id` y registra el resultado en `Ingestion`. Acepta dos formatos de entrada equivalentes:

**Formato A — lista de lecturas:**
```json
[
  { "sensorCode": "S001", "ts": "2026-01-01T10:00:00.000Z", "value": 21.5 }
]
```

**Formato B — payload de dispositivo:**
```json
{
  "deviceId": "S001",
  "data": [
    { "time": 1767261600, "temp": 21.5 }
  ]
}
```
(`time` en formato Unix timestamp, en segundos)

**Salida (201):** registro `Ingestion` actualizado.
```json
{
  "id": "uuid",
  "startedAt": "2026-01-01T10:00:00.000Z",
  "finishedAt": "2026-01-01T10:00:01.000Z",
  "status": "success",
  "recordsProcessed": 1,
  "errorMessage": null,
  "sensorId": "uuid"
}
```

**Salida en error (400):** mensaje de texto describiendo el fallo (URL inválida, campos faltantes, datos con formato incorrecto, etc.), y el registro `Ingestion` correspondiente se guarda con `status: "error"` y el `errorMessage`.

desde `.env` mediante `dotenv`.


## Mejoras

- El código tiene varias mejoras por realizar tal cual está ahora el código, como quitar código redundante y meterlo en módulos que se puedan importar.
- La parte de la ingesta por HTTP no he podido verificarla, por lo que es posibel que esta parte no sea 100% funcional.
- En las validaciones de nombre y código he puesto una limitación de 10 que puede ser algo pequeña, pero debería tener limitación máxima.
- La verificación de valores repetidos se podría añadir realizando una concatenación del código del sensor + el timestamp.
- Revisar el código con el MCP de context7 para aplicarle buenas prácticas y mejorar el código.

  
## Consideraciones

- Type y Status son obligatorios en registro pero no se verifica en base de datos para tener flexibilidad al no tener claro en las specs como debería ser, al estar con 2 lógicas luego sería aclarar que caso y adaptar en uno de los lados, siendo mas restrictivo en la validación del back por seguridad.
- Para cumplir con el tipo PATCH en el update se envía solamente la información que se quiera actualizar, si un campo no está esa información se dejará conforme está y no se actualizará.
- En el caso de no coincida ningún sensor en el injection se devolverá un error para avisar de que no ha habido ninguna inserción
- He tomado la decisión de separar las injestions de los sensores para abstraer diferentes tipos y si injestion crece que no impacte con sensores y viceversa
