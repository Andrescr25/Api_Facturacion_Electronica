# 🧾 API Facturación Electrónica CR

API REST para la emisión de comprobantes electrónicos ante el Ministerio de Hacienda de Costa Rica, conforme a la **Resolución DGT-R-48-2016** y el esquema XML v4.3.

## ✨ Características

- Emisión de **Facturas Electrónicas (FE-01)**, **Tiquetes (TE-04)**, **Notas de Crédito (NC-03)** y **Notas de Débito (ND-02)**
- **Firma digital XAdES-EPES** con certificado `.p12` de la BCCR
- **Poller asíncrono** que consulta automáticamente el estado de los comprobantes en Hacienda
- **Multi-tenant**: cada empresa tiene sus propias credenciales y documentos aislados
- **Autenticación dual**: Firebase Auth (panel web) + API Keys tipo Stripe (integraciones)
- **Notificación por email** al receptor con PDF y XMLs adjuntos
- **Generación de PDF** usando Puppeteer + plantilla EJS
- Almacenamiento de PDFs en **Firebase Storage**
- Base de datos **PostgreSQL** vía Prisma ORM

---

## 🚀 Setup Local

### Pre-requisitos

- Node.js ≥ 18
- PostgreSQL (local o en la nube)
- Cuenta en Firebase con un proyecto configurado

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Andrescr25/Api_Facturacion_Electronica.git
cd Api_Facturacion_Electronica
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y rellena todos los valores. Los más críticos son:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `ENCRYPTION_KEY` | Clave AES-256 de 64 chars hex. Genera con: `openssl rand -hex 32` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON del Service Account de Firebase (para producción) |
| `HACIENDA_IDP_URL` | URL del IDP de Hacienda (staging o producción) |

### 3. Configurar la base de datos

```bash
# Aplicar migraciones (primera vez)
npx prisma migrate dev --name init

# Generar el cliente Prisma
npx prisma generate
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

El servidor estará en `http://localhost:3000`. Puedes verificar con:

```bash
curl http://localhost:3000/health
```

---

## 🗂️ Estructura del Proyecto

```
src/
├── app.ts                      # Express app (middlewares, rutas)
├── server.ts                   # Entry point (listen + inicia Poller)
├── controllers/                # Controladores HTTP
│   ├── AuthController.ts       # POST /api/auth/sync
│   ├── FacturacionController.ts# POST /emitir, GET /pdf, GET /xml
│   ├── ApiKeyController.ts     # CRUD de API Keys
│   ├── ConfiguracionController.ts # Datos del emisor + certificado
│   ├── DashboardController.ts  # Estadísticas
│   └── CatalogoController.ts   # Catálogos de Hacienda
├── middlewares/
│   ├── authMiddleware.ts       # Firebase JWT + API Key sk_live_
│   └── apiKeyValidation.ts     # Rate limit mensual (30 req/mes)
├── models/
│   ├── FacturaTypes.ts         # Interfaces TypeScript del payload
│   └── CatalogoHacienda.ts    # Enums de catálogos oficiales
├── routes/                     # Definición de rutas Express
├── services/
│   └── FacturacionService.ts  # Orquestación del flujo de emisión
├── utils/
│   ├── encryptionService.ts   # AES-256-GCM para credenciales en BD
│   ├── firebaseAdmin.ts        # Firebase Admin SDK
│   ├── prismaClient.ts         # Instancia de Prisma
│   ├── HaciendaAuthService.ts  # Token JWT del IDP de Hacienda
│   ├── HaciendaSigner.ts       # Firma XAdES-EPES
│   ├── HaciendaXmlGenerator.ts # Generación del XML v4.3
│   ├── HaciendaUtils.ts        # Generación de clave y consecutivo
│   ├── HaciendaPollerService.ts# Cron de resolución de comprobantes
│   ├── PdfGeneratorService.ts  # Puppeteer → PDF
│   └── EmailNotificationService.ts # Nodemailer
└── validators/
    └── facturaSchema.ts        # Schema Zod para validación del body
prisma/
├── schema.prisma
├── migrateEncrypt.ts           # Script one-time de migración de datos
tests/
├── unit/
│   ├── HaciendaUtils.test.ts
│   └── encryptionService.test.ts
```

---

## 📡 Endpoints

### Autenticación

Todos los endpoints (excepto `/health`) requieren un header:

```
Authorization: Bearer <token>
```

Donde `<token>` puede ser:
- **Firebase ID Token**: obtenido del SDK de Firebase en el frontend
- **API Key** (`sk_live_...`): generada en el panel de configuración

---

### Auth

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/sync` | Firebase JWT | Crea o sincroniza el perfil del emisor en la BD |

**Body:** *(ninguno — usa datos del token)*  
**Response:**
```json
{ "message": "Sincronización exitosa", "emisorId": "uuid-del-emisor" }
```

---

### Facturación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/facturas/emitir` | Firebase JWT **+ API Key + Rate Limit** | Emite una Factura Electrónica (01) |
| `POST` | `/api/facturas/tiquete/emitir` | Firebase JWT **+ API Key + Rate Limit** | Emite un Tiquete Electrónico (04) |
| `POST` | `/api/facturas/nota-credito/emitir` | Firebase JWT **+ API Key + Rate Limit** | Emite una Nota de Crédito (03) |
| `POST` | `/api/facturas/nota-debito/emitir` | Firebase JWT **+ API Key + Rate Limit** | Emite una Nota de Débito (02) |
| `GET` | `/api/facturas` | Firebase JWT | Lista facturas del emisor. Query: `?page=1&limit=20` |
| `GET` | `/api/facturas/:clave/pdf` | Firebase JWT | Redirige al PDF en Firebase Storage |
| `GET` | `/api/facturas/:clave/xml` | Firebase JWT | Descarga el XML firmado |

**Body de emisión (ejemplo mínimo):**
```json
{
  "factura": {
    "sucursal": 1,
    "caja": 1,
    "condicionVenta": "01",
    "medioPago": ["01"],
    "lineasDetalle": [
      {
        "numeroLinea": 1,
        "codigoCabys": "1234567890123",
        "cantidad": 1,
        "unidadMedida": "Unid",
        "detalle": "Producto de ejemplo",
        "precioUnitario": 1000,
        "montoTotal": 1000,
        "subTotal": 1000,
        "montoTotalLinea": 1130,
        "impuestos": [{ "codigo": "01", "codigoTarifa": "08", "tarifa": 13, "monto": 130 }],
        "impuestoNeto": 130
      }
    ],
    "resumenFactura": {
      "codigoMoneda": "CRC",
      "totalServGravados": 0,
      "totalServExentos": 0,
      "totalServExonerados": 0,
      "totalMercanciasGravadas": 1000,
      "totalMercanciasExentas": 0,
      "totalMercanciasExonerados": 0,
      "totalGravado": 1000,
      "totalExento": 0,
      "totalExonerado": 0,
      "totalVenta": 1000,
      "totalDescuentos": 0,
      "totalVentaNeta": 1000,
      "totalImpuesto": 130,
      "totalComprobante": 1130
    }
  }
}
```

**Response (202 Accepted):**
```json
{
  "message": "Comprobante electrónico procesado exitosamente hacia el Ministerio de Hacienda",
  "data": {
    "status": 202,
    "clave": "50601052612345678900100100101000000001180123456",
    "documentoId": "uuid-del-documento"
  }
}
```

---

### API Keys

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/keys` | Firebase JWT | Lista las API Keys del emisor (key truncada) |
| `POST` | `/api/keys` | Firebase JWT | Genera una nueva API Key (key completa — solo esta vez) |
| `DELETE` | `/api/keys/:id` | Firebase JWT | Revoca una API Key |

---

### Configuración del Emisor

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/configuracion` | Firebase JWT | Obtiene datos del emisor |
| `PUT` | `/api/configuracion` | Firebase JWT | Actualiza datos del emisor (ATV, nombre, etc.) |
| `POST` | `/api/configuracion/certificado` | Firebase JWT | Sube el certificado `.p12` (multipart/form-data) |

**Body PUT:**
```json
{
  "nombre": "Mi Empresa SA",
  "identificacion": "3101234567",
  "codigoActividad": "620100",
  "usuarioAtv": "usuario@empresa.com",
  "passwordAtv": "mi-password-atv"
}
```

**Body POST /certificado:** (multipart/form-data)
- `certificado`: archivo `.p12`
- `pinCertificado`: PIN del certificado

---

### Dashboard

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/dashboard/stats` | Firebase JWT | Estadísticas: total, aceptadas, rechazadas, pendientes |
| `GET` | `/api/dashboard/recent` | Firebase JWT | Últimos 5 documentos |

---

### Catalogos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/catalogos` | Firebase JWT | Catálogos oficiales de Hacienda (unidades, impuestos, etc.) |

---

## 🔐 Seguridad

- **Credenciales ATV y PIN** cifrados con AES-256-GCM en la base de datos
- **Tenant isolation**: cada emisor solo accede a sus propios documentos y API Keys
- **API Keys** mostradas completas solo al momento de creación (como Stripe)
- **Rate limiting**: 30 comprobantes/mes por plan gratuito (atómico, sin race conditions)
- **CORS** restringido a orígenes en lista blanca (`ALLOWED_ORIGINS`)
- **Body limit**: 1MB para prevenir ataques de payload gigante

---

## 🧪 Tests

```bash
npm test                    # Correr todos los tests
npm test -- --coverage      # Con reporte de cobertura
npm test -- --testPathPattern=HaciendaUtils  # Test específico
```

---

## 🚢 Deploy (Render)

1. Crear un nuevo **Web Service** en Render apuntando al repo
2. **Build Command:** `npm install && npm run build && npx prisma generate`
3. **Start Command:** `npm start` (ejecuta `prisma migrate deploy && node dist/server.js`)
4. Configurar todas las variables de `ENVIRONMENT VARIABLES` desde `.env.example`
5. Para `FIREBASE_SERVICE_ACCOUNT_JSON`: pegar el JSON del Service Account en una sola línea

---

## 📋 Flujo de Emisión

```
Cliente (Frontend/POS)
        │
        ▼ POST /api/facturas/emitir (con API Key)
   Middleware Auth + Rate Limit
        │
        ▼ Validación Zod del payload
   FacturacionController
        │
        ▼ Orquestación
   FacturacionService
     ├─ Generar XML v4.3 (HaciendaXmlGenerator)
     ├─ Guardar en BD (estado: CREADO)
     ├─ Generar PDF → Firebase Storage
     ├─ Firmar XML XAdES-EPES (HaciendaSigner)
     ├─ Obtener token ATV (HaciendaAuthService)
     └─ Enviar a Hacienda → estado: ENVIADO
        │
        ▼ (asíncrono, cada 5 min)
   HaciendaPollerService
     ├─ Consulta estado en Hacienda
     ├─ Actualiza estado: ACEPTADO / RECHAZADO
     └─ Envía email al receptor con PDF + XMLs
```