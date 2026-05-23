# Diagrama de Flujo: Sistema QR con Guardado Incremental

## Comparación: Antes vs Después

### ❌ ANTES (Problema)

```
┌─────────────────────────────────────────────────────────────┐
│                    CHECKLIST DE ATRACCIÓN                    │
│                     (3 QR Codes requeridos)                  │
└─────────────────────────────────────────────────────────────┘

Estado Inicial: 0/3 QR escaneados
┌──────────────────────────────────────────────────────────────┐
│ 🔒 Sección 1 (Bloqueada)                                     │
│ 🔒 Sección 2 (Bloqueada)                                     │
│ 🔒 Sección 3 (Bloqueada)                                     │
│                                                               │
│ [❌ Guardar - BLOQUEADO]  [❌ Firmar - BLOQUEADO]            │
└──────────────────────────────────────────────────────────────┘

Usuario escanea QR #1
┌──────────────────────────────────────────────────────────────┐
│ ✅ Sección 1 (Desbloqueada) ← Usuario responde preguntas    │
│ 🔒 Sección 2 (Bloqueada)                                     │
│ 🔒 Sección 3 (Bloqueada)                                     │
│                                                               │
│ [❌ Guardar - BLOQUEADO]  [❌ Firmar - BLOQUEADO]            │
│                                                               │
│ ⚠️ PROBLEMA: No puede guardar su progreso!                   │
│    Si cierra la app, pierde todo el trabajo                  │
└──────────────────────────────────────────────────────────────┘
```

### ✅ DESPUÉS (Solución)

```
┌─────────────────────────────────────────────────────────────┐
│                    CHECKLIST DE ATRACCIÓN                    │
│                     (3 QR Codes requeridos)                  │
│                                                               │
│  📊 Progreso QR: ▓▓▓░░░░░░ 1/3 códigos escaneados          │
│  💡 Puedes guardar tu progreso en cualquier momento          │
└─────────────────────────────────────────────────────────────┘

Estado: 1/3 QR escaneados
┌──────────────────────────────────────────────────────────────┐
│ ✅ Sección 1 (Desbloqueada) ← Usuario responde preguntas    │
│    ├─ Pregunta 1: ✅ Cumple                                  │
│    ├─ Pregunta 2: ✅ Cumple                                  │
│    └─ Pregunta 3: ⚠️ Observación                            │
│                                                               │
│ 🔒 Sección 2 (Bloqueada) [📱 Escanear QR para desbloquear]  │
│ 🔒 Sección 3 (Bloqueada)                                     │
│                                                               │
│ [✅ Guardar - HABILITADO]  [❌ Firmar - BLOQUEADO]           │
│                                                               │
│ ✅ SOLUCIÓN: Puede guardar su progreso!                      │
│    El progreso se guarda en BD y localStorage                │
└──────────────────────────────────────────────────────────────┘

Usuario guarda y continúa más tarde...
┌──────────────────────────────────────────────────────────────┐
│ ✅ Sección 1 (Completada - Guardada en BD)                   │
│    ├─ Pregunta 1: ✅ Cumple                                  │
│    ├─ Pregunta 2: ✅ Cumple                                  │
│    └─ Pregunta 3: ⚠️ Observación                            │
│                                                               │
│ 🔒 Sección 2 (Bloqueada) [📱 Escanear QR #2]                │
│ 🔒 Sección 3 (Bloqueada)                                     │
│                                                               │
│ [✅ Actualizar - HABILITADO]  [❌ Firmar - BLOQUEADO]        │
└──────────────────────────────────────────────────────────────┘

Usuario escanea QR #2
┌──────────────────────────────────────────────────────────────┐
│  📊 Progreso QR: ▓▓▓▓▓▓░░░ 2/3 códigos escaneados          │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ ✅ Sección 1 (Completada)                                    │
│ ✅ Sección 2 (Desbloqueada) ← Usuario responde              │
│ 🔒 Sección 3 (Bloqueada) [📱 Escanear QR #3]                │
│                                                               │
│ [✅ Actualizar - HABILITADO]  [❌ Firmar - BLOQUEADO]        │
└──────────────────────────────────────────────────────────────┘

Usuario escanea QR #3
┌──────────────────────────────────────────────────────────────┐
│  📊 Progreso QR: ▓▓▓▓▓▓▓▓▓ 3/3 códigos escaneados ✅        │
│  🎉 Todas las secciones desbloqueadas                        │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ ✅ Sección 1 (Completada)                                    │
│ ✅ Sección 2 (Completada)                                    │
│ ✅ Sección 3 (Desbloqueada) ← Usuario completa              │
│                                                               │
│ [✅ Actualizar - HABILITADO]  [✅ Firmar - HABILITADO]       │
└──────────────────────────────────────────────────────────────┘
```

## Matriz de Estados de Botones

| QR Escaneados | Secciones Desbloqueadas | Botón Guardar | Botón Firmar | Notas |
|---------------|-------------------------|---------------|--------------|-------|
| 0/3 | Ninguna | ✅ Habilitado* | ❌ Bloqueado | *Aunque no hay nada que guardar |
| 1/3 | Sección 1 | ✅ Habilitado | ❌ Bloqueado | Puede guardar progreso de Sección 1 |
| 2/3 | Secciones 1-2 | ✅ Habilitado | ❌ Bloqueado | Puede guardar progreso de Secciones 1-2 |
| 3/3 | Todas | ✅ Habilitado | ✅ Habilitado | Puede guardar y firmar |

## Lógica de Bloqueo

### Botón "Guardar"
```javascript
disabled = isLocked  // Solo bloqueado si checklist está firmado
```

**Se bloquea cuando:**
- ✅ El checklist ya está firmado por técnico Y jefe de operaciones
- ❌ NO se bloquea por falta de QR

### Botón "Firmar"
```javascript
disabled = isLocked || disableSignature
disableSignature = qrManager.isQrRequired
```

**Se bloquea cuando:**
- ✅ El checklist ya está firmado (isLocked)
- ✅ Faltan QR codes por escanear (isQrRequired)

### Items Individuales
```javascript
itemDisabled = disabled || (isItemUnlocked && !isUnlocked)
```

**Se bloquean cuando:**
- ✅ El checklist está firmado (disabled)
- ✅ El item específico no ha sido desbloqueado con QR

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  /api/qr-codes/checklist/:id/authorization                  │
│                                                               │
│  Retorna:                                                     │
│  - requires_qr: boolean                                       │
│  - total_qr_codes: number                                     │
│  - unlocked_items: array                                      │
│  - next_qr_required: object | null                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    HOOK: useQrCode                           │
│                                                               │
│  Estados:                                                     │
│  - qrValidationEnabled: boolean                              │
│  - isQrRequired: boolean                                      │
│  - qrScans: array                                             │
│  - totalQrPartitions: number                                  │
│                                                               │
│  Funciones:                                                   │
│  - isItemUnlocked(itemId): boolean                           │
│  - handleQrScanSuccess(qrCode)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              COMPONENTE: BaseChecklistPage                   │
│                                                               │
│  Lógica de bloqueo:                                          │
│  - disabled = isLocked                                        │
│  - disableSignature = qrManager.isQrRequired                 │
│                                                               │
│  Pasa a ChecklistActions:                                    │
│  - disabled (para botón Guardar)                             │
│  - disableSignature (para botón Firmar)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            COMPONENTE: ChecklistActions                      │
│                                                               │
│  Botón Guardar:                                              │
│    disabled={disabled}                                        │
│                                                               │
│  Botón Firmar:                                               │
│    disabled={disabled || disableSignature}                   │
└─────────────────────────────────────────────────────────────┘
```

## Casos de Uso

### Caso 1: Usuario interrumpido
```
1. Usuario escanea QR #1
2. Usuario responde 5 preguntas de Sección 1
3. Usuario guarda progreso ✅
4. Usuario recibe llamada urgente y cierra app
5. Usuario regresa 2 horas después
6. Usuario abre checklist → Sus 5 respuestas están guardadas ✅
7. Usuario continúa donde lo dejó
```

### Caso 2: Trabajo por turnos
```
Turno Mañana:
1. Técnico A escanea QR #1
2. Técnico A completa Sección 1
3. Técnico A guarda progreso ✅
4. Fin del turno

Turno Tarde:
5. Técnico B abre el mismo checklist
6. Técnico B ve Sección 1 completada
7. Técnico B escanea QR #2
8. Técnico B completa Sección 2
9. Técnico B guarda progreso ✅

Turno Noche:
10. Técnico C escanea QR #3
11. Técnico C completa Sección 3
12. Técnico C guarda y firma ✅
```

### Caso 3: Validación de supervisor
```
1. Técnico completa secciones 1 y 2 (QR #1 y #2)
2. Técnico guarda progreso ✅
3. Supervisor llega para validar
4. Supervisor escanea QR #3 (código de supervisor)
5. Sección 3 se desbloquea
6. Supervisor revisa y firma ✅
```
