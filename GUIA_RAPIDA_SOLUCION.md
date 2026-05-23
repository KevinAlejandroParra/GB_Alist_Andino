# 🚀 Guía Rápida: Solución Checklists Semanales

## ⚡ Pasos Rápidos (5 minutos)

### 1️⃣ Actualizar frequency en la base de datos
```bash
cd server
node scripts/fix-checklist-types-frequency.js
```
**Resultado esperado**: Verás un mensaje confirmando que se actualizaron los checklist_types.

### 2️⃣ Verificar el estado
```bash
node scripts/diagnose-weekly-checklists.js
```
**Resultado esperado**: Verás un reporte completo del estado de tus checklists.

### 3️⃣ Si hay checklists sin week_identifier
```bash
node scripts/fix-existing-checklists.js
```
**Resultado esperado**: Los checklists existentes tendrán su week_identifier actualizado.

### 4️⃣ Reiniciar el servidor
```bash
# Detener el servidor (Ctrl+C)
npm start
```

### 5️⃣ Probar en el navegador
1. Abre el navegador
2. Presiona F12 para abrir las herramientas de desarrollador
3. Ve a la pestaña "Console"
4. Navega a un checklist de familia
5. Verifica que:
   - El banner muestra el rango correcto (ej: "Lun 28 Abr - Dom 4 May")
   - Los logs en consola muestran `isWeekly: true` para familias
   - Puedes guardar y continuar el checklist al día siguiente

## ✅ Verificación Rápida

### En la consola del navegador deberías ver:
```
🔍 [BaseChecklistPage] Análisis de frecuencia: {
  originalFrequency: "semanal",
  normalizedFrequency: "semanal",
  typeCategory: "family",
  isWeekly: true,
  isDaily: false,
  shouldBeTreatedAsDaily: false
}
```

### En el banner deberías ver:
```
Checklist Semanal - 2026-W17
📅 Lun 28 Abr - Dom 4 May
⏰ X días restantes
```

## 🐛 Si Algo No Funciona

### Problema: Banner sigue mostrando "30 abr - 30 abr"
**Solución**: 
1. Verifica que ejecutaste `fix-checklist-types-frequency.js`
2. Reinicia el servidor
3. Limpia la caché del navegador (Ctrl+Shift+Delete)
4. Refresca la página (Ctrl+F5)

### Problema: No aparece "Continuar checklist"
**Solución**:
1. Abre la consola del navegador (F12)
2. Busca los logs que empiezan con 🔍
3. Verifica que `isWeekly: true` y `shouldBeTreatedAsDaily: false`
4. Si no es así, ejecuta el diagnóstico: `node scripts/diagnose-weekly-checklists.js`

### Problema: Errores en el servidor
**Solución**:
1. Verifica que la base de datos esté corriendo
2. Ejecuta: `node scripts/diagnose-weekly-checklists.js`
3. Revisa los logs del servidor para ver mensajes de error específicos

## 📞 Comandos Útiles

```bash
# Diagnóstico completo
node scripts/diagnose-weekly-checklists.js

# Probar funciones de semana
node scripts/test-week-utils.js

# Actualizar frequency
node scripts/fix-checklist-types-frequency.js

# Actualizar week_identifier
node scripts/fix-existing-checklists.js

# Ver logs del servidor en tiempo real
npm start | grep "getLatestChecklistByType"
```

## 🎯 Resultado Final

Después de seguir estos pasos:
- ✅ Checklists de familia son semanales (Lunes-Domingo)
- ✅ Banner muestra el rango correcto
- ✅ Puedes continuar el checklist durante toda la semana
- ✅ Checklists de atracción siguen siendo diarios
- ✅ No hay errores en consola

## 📚 Documentación Completa

Para más detalles, consulta: `SOLUCION_CHECKLISTS_SEMANALES.md`
