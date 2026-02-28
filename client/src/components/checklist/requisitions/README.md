# Componentes de Requisiciones

Esta carpeta contiene los componentes relacionados con la gestión de requisiciones de repuestos.

## Componentes

### CreateRequisitionModal.jsx
Modal para crear nuevas requisiciones de repuestos cuando no están disponibles en el inventario.

**Funcionalidades:**
- Formulario para especificar repuesto necesario
- Selección de cantidad, urgencia y categoría
- Integración con órdenes de trabajo (OT) y órdenes de falla (OF)
- Validación de datos requeridos
- Envío automático al backend

**Props requeridos:**
- `show`: boolean - Controla la visibilidad del modal
- `onClose`: function - Función para cerrar el modal
- `onSuccess`: function - Callback cuando se crea exitosamente la requisición
- `workOrderId`: number - ID de la orden de trabajo asociada
- `partInfo`: object - Información del repuesto (opcional)
- `failureInfo`: object - Información de la falla (opcional)

## Dependencias

- `axiosInstance` de `../../utils/axiosConfig`
- `Swal` de `sweetalert2`
- Hook `useAuth` de `../AuthContext`

## Endpoints utilizados

- `POST /api/requisitions` - Crear nueva requisición

## Flujo de trabajo

1. Usuario intenta buscar repuesto en inventario
2. Si no encuentra, hace clic en "No encontré el repuesto, crear requisición"
3. Se abre modal de creación de requisición
4. Usuario completa formulario con detalles del repuesto
5. Se valida y envía al backend
6. Se crea la requisición y se notifica al usuario
7. Flujo continúa según el contexto (checklist, falla, etc.)