# ✅ Habilitar bcrypt - Instrucciones Finales

## 🎯 Cambios Realizados

### Archivos Actualizados:
1. ✅ `server/package.json` - bcryptjs → bcrypt
2. ✅ `server/src/controllers/userController.js` - bcrypt habilitado
3. ✅ `server/src/models/user.js` - bcrypt habilitado

### Funcionalidades Restauradas:
- ✅ Encriptación de contraseñas en creación de usuarios
- ✅ Encriptación de contraseñas en actualización
- ✅ Encriptación de contraseñas en reset password
- ✅ Comparación segura de contraseñas en login

---

## 🚀 Pasos para Aplicar en Ubuntu

### 1. Copiar archivos con WinSCP

**Conectar a:** `192.168.57.96` (usuario: `andino`)

**Copiar estos archivos desde Windows:**
```
C:\Users\mante\Downloads\GB_Alist_Andino_copia\GB_Alist_Andino\server\package.json
C:\Users\mante\Downloads\GB_Alist_Andino_copia\GB_Alist_Andino\server\src\controllers\userController.js
C:\Users\mante\Downloads\GB_Alist_Andino_copia\GB_Alist_Andino\server\src\models\user.js
C:\Users\mante\Downloads\GB_Alist_Andino_copia\GB_Alist_Andino\server\test-bcrypt.js
```

**Hacia Ubuntu:**
```
/home/andino/GB_Alist_Andino/server/package.json
/home/andino/GB_Alist_Andino/server/src/controllers/userController.js
/home/andino/GB_Alist_Andino/server/src/models/user.js
/home/andino/GB_Alist_Andino/server/test-bcrypt.js
```

### 2. Verificar bcrypt en Ubuntu

```bash
cd /home/andino/GB_Alist_Andino/server

# Probar bcrypt
node test-bcrypt.js
```

**Deberías ver:**
```
🔐 Probando bcrypt...
1️⃣ Test: Generar hash de contraseña
✅ Hash generado: $2b$10$...
2️⃣ Test: Comparar contraseña correcta
✅ Contraseña correcta verificada
3️⃣ Test: Comparar contraseña incorrecta
✅ Contraseña incorrecta rechazada
🎉 ¡Todos los tests pasaron!
```

### 3. Reiniciar el servidor

```bash
pm2 restart api-andino
pm2 logs api-andino --lines 50
```

**Verificar que arranca sin errores:**
```
✅ Base de datos conectada
🚀 Servidor corriendo en puerto 3001
```

---

## ⚠️ IMPORTANTE: Contraseñas Existentes

### Problema:
Las contraseñas que se crearon mientras bcrypt estaba deshabilitado están en **texto plano** en la base de datos.

### Solución:

**Opción 1: Actualizar contraseñas manualmente (RECOMENDADO)**

Conecta a MySQL y actualiza las contraseñas que se crearon sin encriptar:

```sql
-- Ver usuarios con contraseñas en texto plano (menos de 60 caracteres)
SELECT user_id, user_email, LENGTH(user_password) as pass_length 
FROM users 
WHERE LENGTH(user_password) < 60;

-- Para cada usuario, genera un hash nuevo
-- Ejemplo: Actualizar contraseña del admin a "admin123"
-- Primero genera el hash en Node.js:
```

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(hash => console.log(hash))"
```

Copia el hash generado y actualiza en MySQL:

```sql
UPDATE users 
SET user_password = '$2b$10$...' -- pega el hash aquí
WHERE user_email = 'admin@example.com';
```

**Opción 2: Pedir a los usuarios que restablezcan su contraseña**

Usa la funcionalidad de "Olvidé mi contraseña" para que cada usuario restablezca su contraseña (esto la encriptará automáticamente).

---

## 🧪 Probar el Login

### Test 1: Usuario con contraseña encriptada antigua (debería funcionar)
```bash
curl -X POST http://192.168.57.96:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"user_email":"usuario@example.com","user_password":"contraseña_original"}'
```

### Test 2: Crear nuevo usuario (contraseña se encriptará automáticamente)
```bash
curl -X POST http://192.168.57.96:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "user_name":"Test User",
    "user_email":"test@example.com",
    "user_password":"test12345678",
    "user_document_type":"CC",
    "user_document":"123456789",
    "user_phone":"3001234567",
    "role_id":9,
    "premise_id":1
  }'
```

---

## ✅ Checklist Final

- [ ] bcrypt instalado correctamente en Ubuntu
- [ ] `node test-bcrypt.js` pasa todos los tests
- [ ] Archivos copiados al servidor
- [ ] `pm2 restart api-andino` ejecutado
- [ ] Servidor arranca sin errores
- [ ] Login funciona con usuarios existentes
- [ ] Contraseñas en texto plano actualizadas (si las hay)

---

## 🎉 ¡Listo!

Ahora tu sistema tiene encriptación de contraseñas funcionando correctamente con bcrypt nativo de Linux.
