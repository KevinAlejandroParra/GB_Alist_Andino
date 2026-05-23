# 📦 Instalación de Sharp para Optimización de PDFs

## ¿Qué es Sharp?
Sharp es una librería de procesamiento de imágenes de alto rendimiento que permite redimensionar y comprimir imágenes de forma eficiente.

## ¿Por qué lo necesitamos?
- **PDFs más pequeños**: Reduce el tamaño de 20-30MB a 2-3MB
- **Generación más rápida**: 3-5x más rápido que sin optimización
- **Mejor experiencia**: Descargas más rápidas para los usuarios

## 🚀 Instalación

### Opción 1: Script Automático (Windows)
```bash
cd server
install-sharp.bat
```

### Opción 2: Script Automático (Linux/Mac)
```bash
cd server
chmod +x install-sharp.sh
./install-sharp.sh
```

### Opción 3: Manual
```bash
cd server
npm install sharp --save
```

## ✅ Verificación

Después de instalar, verifica que Sharp esté en tu `package.json`:

```json
{
  "dependencies": {
    "sharp": "^0.33.0",
    ...
  }
}
```

## 🔄 Reiniciar Servidor

Después de instalar Sharp, reinicia el servidor Node.js:

```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
npm start
```

## 📊 Resultados Esperados

### Antes (sin Sharp):
- Imagen original: 3MB
- En PDF: 3MB (sin cambios)
- Tiempo de generación: ~8 segundos
- Tamaño PDF total: 25MB

### Después (con Sharp):
- Imagen original: 3MB
- Optimizada: 200KB (800x600px @ 75% calidad)
- Tiempo de generación: ~3 segundos
- Tamaño PDF total: 3MB

## 🎯 Configuración Actual

Las imágenes se optimizan automáticamente con estos parámetros:

```javascript
.resize(800, 600, {
  fit: 'inside',              // Mantiene proporción
  withoutEnlargement: true    // No agranda imágenes pequeñas
})
.jpeg({ 
  quality: 75,                // 75% calidad (imperceptible)
  progressive: true           // Carga progresiva
})
```

## 🔧 Ajustar Configuración (Opcional)

Si quieres cambiar la calidad o tamaño, edita en `server/src/controllers/checklistController.js`:

```javascript
// Cambiar resolución máxima
.resize(1024, 768, { ... })  // Más grande = mejor calidad, más pesado

// Cambiar calidad
.jpeg({ quality: 85 })       // 85% = mejor calidad, más pesado
.jpeg({ quality: 60 })       // 60% = menor calidad, más liviano
```

## ⚠️ Notas Importantes

1. **Sharp es obligatorio**: El código ya no tiene fallback, Sharp debe estar instalado
2. **Todas las imágenes se convierten a JPEG**: Incluso PNGs y WebP
3. **Calidad 75% es óptima**: Balance perfecto entre calidad y tamaño
4. **800x600px es suficiente**: Para PDFs impresos en A4

## 🐛 Solución de Problemas

### Error: "Cannot find module 'sharp'"
```bash
cd server
npm install sharp --save
# Reiniciar servidor
```

### Error: "sharp installation failed"
En Windows, puede necesitar herramientas de compilación:
```bash
npm install --global windows-build-tools
npm install sharp --save
```

### Imágenes no se ven en PDF
Verifica que las rutas de las imágenes sean correctas en `server/public/`

## 📈 Monitoreo

Después de instalar, verás en los logs del servidor:
```
✅ QR Scans obtenidos para PDF: 3
✅ Imagen optimizada: /uploads/evidence_123.jpg (3MB → 180KB)
```

Si ves errores:
```
❌ Error al procesar imagen para PDF: /path/to/image.jpg
```

Revisa que la imagen exista y sea un formato válido.
