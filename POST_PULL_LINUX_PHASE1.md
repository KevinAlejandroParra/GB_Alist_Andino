# Comandos Post-Pull para Servidor Linux (Fase 1: Cronograma Mantenimiento)

Ejecutar los siguientes comandos en el servidor Linux Andino después de hacer `git pull`:

## 1. Actualizar Dependencias y Compilar Cliente
```bash
# Servidor
cd server
npm install

# Cliente
cd ../client
npm install
npm run build
```

## 2. Ejecutar Migraciones de Base de Datos
```bash
# En server
cd ../server
npm run db:migrate
```
> **Nota de seguridad:** La migración `20261010000000-create-maintenance-module.js` es 100% aditiva. Crea las 8 tablas nuevas del módulo y agrega la columna `maintenance_session_id` nullable a `requisitions`. **No modifica datos existentes de checklists, fallas ni órdenes de trabajo.**

## 3. Configuración de Entorno (.env)
Asegurarse de tener la variable en el `.env` del backend (o añadirla si aún no existe):
```env
MAINTENANCE_SCHEDULER_ENABLED=true
```

## 4. Reiniciar Servicios
```bash
# Con PM2
pm2 restart all

# O con systemctl (según configuración de sede)
sudo systemctl restart andino-api
sudo systemctl restart andino-client
```

---

## 5. Checklist de Verificación y Auditoría Fase 1 (Smoke Test)

### A. Vista Administrador
1. **Acceso:** Ir al Dashboard → Acceso Rápido → **"Cronograma Mantenimiento"** (o desde `/AdminDashboard`).
2. **Pestaña "Configuración Máquinas":**
   - Verificar que lista las máquinas de la sede.
   - Activar el interruptor **"Preventivo Semanal"** en al menos una máquina y asignar un día de la semana (ej. Lunes).
   - Opcionalmente marcar una máquina como **"Exento de PP"** (debe ir al final del ciclo).
3. **Pestaña "Estrategia y Capacidad":**
   - Verificar la estrategia elegida (Híbrido por defecto, Fallas acumuladas o Último preventivo).
   - Ajustar capacidad diaria si aplica (default: 5 máquinas/día laborable).
4. **Pestaña "Códigos QR":**
   - Click en **"Generar Faltantes en Masa"** para que todas las máquinas tengan su QR único asignado.
   - Click en **"Imprimir Sticker"** para probar la visualización del QR.
5. **Pestaña "Calendario Operativo":**
   - Click en **"Generar Plan"** para el mes actual.
   - Verificar que los días del calendario muestran las casillas (chips) de máquinas semanales y programadas.
   - Click en **"Publicar Plan"** (cambia de DRAFT a Publicado).

### B. Vista Técnico (Flujo Operativo QR + Wizard)
1. **Acceder a un Slot:** Desde el calendario o haciendo click en un día para abrir el drawer lateral.
2. **Validar QR:** Click en **"Iniciar con QR"**. Abrir la cámara con **"Abrir Cámara para Escanear QR"** o pegar el código QR de prueba generado para esa máquina.
3. **Evidencias (4 Fotos):**
   - Subir las 4 fotografías requeridas (`Inicio`, `Proceso 1`, `Proceso 2`, `Fin`).
   - Verificar que la barra avanza a 4 / 4 fotos.
4. **Descripción:** Escribir observaciones del trabajo realizado.
5. **Finalizar:** Click en **"Finalizar y Marcar AZUL"**.
6. **Verificar Estado Visual:**
   - El slot pasa a color **AZUL** (100% cumplido).
   - Si se cumplieron todos los slots planificados de ese día, el badge del día pasa a **AZUL**.
