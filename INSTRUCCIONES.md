# Mayzer v1.0.8 – Instrucciones de despliegue

## ⚠️ Actualización de dependencia — xlsx-js-style

Esta versión migra `xlsx` → `xlsx-js-style` para soporte de estilos visuales en Excel.
Después de descargar el proyecto, ejecutar:

```bash
cd backend  && npm install
cd ../frontend && npm install
```

---

## Credenciales por defecto (contraseña: Admin123)

| Rol           | Usuario           | Email                    |
|---------------|-------------------|--------------------------| 
| Administrador | maira.admin       | maira@sena.edu.co        |
| Instructor    | instructor.sena   | instructor@sena.edu.co   |
| Super Usuario | super.usuario     | super@sena.edu.co        |

## Inicializar base de datos

Los scripts SQL viven en `database/`:

```
database/
  schema.sql          → Crear tablas y estructura
  datos_iniciales.sql → Datos de inicio (usuarios, catálogos)
```

Ejecutar en orden:
1. `database/schema.sql`
2. `database/datos_iniciales.sql`

## ⚠️ Paso obligatorio — Crear el archivo .env

**El backend no arrancará sin este archivo.** Ya viene incluido un `.env` listo
para desarrollo local en `backend/.env`. Solo debes completar tu contraseña MySQL:

```env
DB_PASSWORD=tu_contraseña_mysql
```

Si no existe el archivo, cópialo desde la plantilla:

```bash
cp backend/.env.example backend/.env
# Luego edita backend/.env con tu contraseña de MySQL
```

---

## Variables de entorno (backend/.env)

```
DB_HOST=db
DB_PORT=3306
DB_USER=mayzer_user
DB_PASSWORD=mayzer_pass
DB_NAME=mayzer_db
JWT_SECRET=cambia_este_secreto_en_produccion
JWT_EXPIRES_IN=15m
PORT=3001
FRONTEND_URL=http://localhost:5173
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_correo@gmail.com
MAIL_PASS=tu_app_password
MAIL_FROM=SENA Palmira <noreply@sena.edu.co>
```

## Docker

```bash
docker-compose up --build -d
```

Frontend: http://localhost:5173  
Backend:  http://localhost:3001  
Formulario público: http://localhost:5173/solicitud

## Notas

- Los PDFs de documentos se guardan en `backend/uploads/documentos/`
- El formulario público acepta multipart/form-data (campo `data` = JSON + campos `pdf_N`)
- Super Usuario solo puede ver y activar/desactivar cuentas de Administrador
- El campo `nombre_completo` se construye automáticamente desde nombre1+nombre2+apellido1+apellido2
- Para registro tipo "persona": empresa y aspirante comparten el mismo registro vinculado

---

## v1.3.0 — Cambios

### 1. Aspirantes — Selección múltiple
- Checkbox por fila y "seleccionar todos" en encabezado de tabla.
- Barra de acciones masivas: Pre-aprobar pendientes / Asignar pre-aprobados / Limpiar selección.
- Al asignar en lote: modal de asignación se abre secuencialmente para cada aspirante pre-aprobado seleccionado.

### 2. Aspirantes — Validación de curso en asignación
- Al seleccionar un grupo en el modal de asignación, se compara el `curso_nombre` del grupo con el `curso_requerido` del aspirante.
- Si no coinciden, se muestra alerta superior: "No se puede asignar este aspirante porque no solicitó el curso…" y el botón de confirmar queda deshabilitado.

### 3. Calendario — Modo días discontinuos
- Checkbox "Días discontinuos" en el encabezado del calendario.
- Al activarse: cada clic selecciona/deselecciona días individuales (resaltados visualmente).
- Botón "Crear evento" visible cuando hay al menos un día seleccionado; abre el panel de creación existente con fechas del primer y último día seleccionados.
- Modo rango continuo (flujo original) permanece intacto cuando el checkbox está desactivado.

### 4. Reportes — Descarga por tabla y ZIP anual
- Cada tarjeta/tabla tiene botones PDF y Excel individuales.
- Sección "Descargar por tabla" con botones para Aspirantes, Solicitudes, Grupos y Certificados.
- Botón "Informe Año (ZIP)" en el encabezado: genera ZIP con estructura `AÑO/MES/año-mes-tabla.{pdf,xlsx}`.
- Archivo resultante: `año-informe-mayzer.zip`.
- Requiere `jszip` (agregado a `package.json`).

### 5. Íconos — Sin emojis
- Todos los emojis fueron eliminados de la aplicación y reemplazados por íconos SVG del componente `<Icon />` ya existente.
- Afecta: Aspirantes, AccionesAspirante, ModalDetalle, ModalAsignar, Calendario, Reportes, Grupos, Instructores, Cursos, Inicio, Empresas, Administradores, Ayuda, FormPublico, Verificar, ModalEventoCalendario, ModalInstructor, AspCard.

### Restricciones respetadas
- Sin cambios en estilos (.css/.module.css).
- Lógica de pre-aprobar/rechazar intacta (AccionesAspirante v7 mantiene el mismo flujo).
- Lógica de rango del Calendario intacta (handleCeldaClickRango sin tocar).
- Sin funcionalidades fuera del alcance.

---

## Errores de consola externos (NO son del proyecto)

Los siguientes errores que pueden aparecer en la consola del navegador **NO pertenecen al código de Mayzer**:

```
content.js:18 Uncaught TypeError: Cannot read properties of undefined (reading 'useCache')
polyfill.js:496 Uncaught Error: Could not establish connection. Receiving end does not exist.
```

Son generados por **extensiones del navegador** (LastPass, Grammarly, ad blockers, etc.) que inyectan sus propios scripts (`content.js`, `polyfill.js`) en todas las páginas. Para confirmar:

1. Abre el panel en modo incógnito sin extensiones → los errores desaparecen.
2. Deshabilita extensiones una a una para identificar cuál las genera.

**Solución**: pedir al equipo que desactiven extensiones innecesarias durante el uso de Mayzer, o usar perfil de Chrome sin extensiones para el sistema.

