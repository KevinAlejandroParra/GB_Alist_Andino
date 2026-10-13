# Comandos Post-Pull para Servidor Linux (Fase 1: Cronograma Mantenimiento)

Ejecutar los siguientes comandos en el servidor Linux Andino después de hacer `git pull`:

## 1. Actualizar Dependencias
```bash
# En la carpeta del servidor
cd server
npm install
```

## 2. Ejecutar Migraciones de Base de Datos
```bash
# Importante: Solo ejecutar una vez para crear las tablas del módulo de mantenimiento
npm run db:migrate
```

## 3. Reiniciar Aplicación
```bash
# Si usas PM2
pm2 restart all

# O si usas systemd
sudo systemctl restart andino-api
```

## 4. Configuración de Entorno (.env)
Añadir la siguiente variable al archivo `.env` en el servidor para habilitar el módulo en la UI:
```env
MAINTENANCE_SCHEDULER_ENABLED=true
```

## 5. Verificación (Smoke Test)
- Login como Administrador -> Dashboard -> Acceso Rápido -> "Cronograma Mantenimiento".
- Verificar que se puede entrar a la pestaña "Configuración" y marcar máquinas como semanales.
- Verificar que se puede "Generar Plan" para el mes actual y que aparecen slots en el calendario.
