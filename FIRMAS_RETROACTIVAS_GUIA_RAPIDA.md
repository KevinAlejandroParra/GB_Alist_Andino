# 🚀 Guía Rápida: Sistema de Firmas Retroactivas

## ¿Qué es esto?

Una nueva funcionalidad en el AdminDashboard que permite al personal de **Soporte** agregar firmas de administrador a checklists que se quedaron sin firmar.

## 🎯 ¿Para quién es?

**Solo para usuarios con rol de Soporte (role_id: 2)**

Los administradores normales NO verán esta opción.

## 📍 ¿Dónde está?

1. Inicia sesión con una cuenta de **Soporte**
2. Ve al **AdminDashboard**
3. Busca la pestaña **"Firmas Retroactivas"** (tiene un indicador amarillo parpadeante)

## 🔧 ¿Cómo se usa?

### Paso 1: Ver Checklists Sin Firma

```
AdminDashboard → Firmas Retroactivas → Tab "Checklists Sin Firma"
```

Verás una tabla con:
- ID del checklist
- Tipo de checklist
- Sede
- Inspectable
- Quién lo creó
- Fecha de creación
- Estado de firmas

### Paso 2: Agregar Firma

1. Haz clic en el botón **"Agregar Firma"** del checklist que necesitas
2. Se abrirá un modal con:
   - **Selector de Administrador:** Elige quién debió haber firmado
   - **Justificación:** Explica por qué se necesita la firma retroactiva (mínimo 10 caracteres)
3. Haz clic en **"Agregar Firma"**
4. ¡Listo! La firma se agregará y el checklist desaparecerá de la lista

### Paso 3: Revisar Historial

```
AdminDashboard → Firmas Retroactivas → Tab "Historial"
```

Aquí verás todas las firmas retroactivas que se han agregado:
- Qué checklist
- Quién firmó
- Por qué se agregó
- Quién lo autorizó
- Cuándo se hizo

## ⚠️ Importante

- **Cada acción queda registrada** en el sistema de auditoría
- **No se puede deshacer** una firma retroactiva
- **Solo se pueden agregar firmas de Jefe de Operaciones** (role_id: 4)
- **La justificación es obligatoria** y debe ser clara

## 🎨 Filtros Disponibles

En la pestaña "Checklists Sin Firma" puedes filtrar por:
- **Fecha Inicio:** Desde cuándo buscar
- **Fecha Fin:** Hasta cuándo buscar
- **Tipo de Checklist:** (próximamente)
- **Sede:** (próximamente)

## 💡 Ejemplo de Uso

**Situación:**
> El Jefe de Operaciones Juan Pérez olvidó firmar el checklist #456 de la atracción "Montaña Rusa" porque estaba en una reunión urgente.

**Solución:**
1. Entras a "Firmas Retroactivas"
2. Encuentras el checklist #456 en la lista
3. Haces clic en "Agregar Firma"
4. Seleccionas "Juan Pérez" como administrador
5. Escribes: "El administrador estaba en reunión urgente y no pudo firmar a tiempo. Checklist completado correctamente."
6. Confirmas
7. ✅ ¡Firma agregada!

## 🐛 Problemas Comunes

### "No veo la pestaña Firmas Retroactivas"
- Verifica que tu usuario tiene rol de **Soporte** (role_id: 2)
- Cierra sesión y vuelve a iniciar

### "Error al agregar firma"
- Verifica que seleccionaste un administrador
- Verifica que la justificación tiene al menos 10 caracteres
- Verifica que el checklist no tenga ya una firma de administrador

### "No aparecen checklists"
- ¡Excelente! Significa que todos los checklists están firmados correctamente
- Prueba ajustando los filtros de fecha

## 📞 ¿Necesitas Ayuda?

Contacta al equipo de desarrollo o revisa la documentación completa en:
`FIRMAS_RETROACTIVAS_DOCUMENTACION.md`

---

**¡Recuerda!** Esta funcionalidad es para casos excepcionales. Lo ideal es que los administradores firmen los checklists a tiempo. 😊
