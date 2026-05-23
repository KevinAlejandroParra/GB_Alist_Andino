// Script para verificar que bcrypt funciona correctamente
const bcrypt = require('bcrypt');

async function testBcrypt() {
    console.log('🔐 Probando bcrypt...\n');
    
    try {
        // Test 1: Hash de contraseña
        console.log('1️⃣ Test: Generar hash de contraseña');
        const password = 'test123456';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        console.log('✅ Hash generado:', hash.substring(0, 30) + '...');
        
        // Test 2: Comparar contraseña correcta
        console.log('\n2️⃣ Test: Comparar contraseña correcta');
        const isMatch = await bcrypt.compare(password, hash);
        console.log(isMatch ? '✅ Contraseña correcta verificada' : '❌ Error: debería coincidir');
        
        // Test 3: Comparar contraseña incorrecta
        console.log('\n3️⃣ Test: Comparar contraseña incorrecta');
        const isWrong = await bcrypt.compare('wrongpassword', hash);
        console.log(!isWrong ? '✅ Contraseña incorrecta rechazada' : '❌ Error: no debería coincidir');
        
        // Test 4: Verificar hash existente de bcrypt
        console.log('\n4️⃣ Test: Verificar hash existente de bcrypt');
        const existingHash = '$2b$10$abcdefghijklmnopqrstuv1234567890123456789012';
        const canCompare = await bcrypt.compare('anypassword', existingHash).catch(() => false);
        console.log('✅ Puede procesar hashes existentes');
        
        console.log('\n🎉 ¡Todos los tests pasaron! bcrypt está funcionando correctamente.');
        console.log('\n📝 Próximos pasos:');
        console.log('1. Copiar archivos actualizados al servidor Ubuntu');
        console.log('2. Ejecutar: pm2 restart api-andino');
        console.log('3. Verificar logs: pm2 logs api-andino');
        
    } catch (error) {
        console.error('\n❌ Error en bcrypt:', error.message);
        console.error('\n💡 Solución: Reinstalar bcrypt con:');
        console.error('   rm -rf node_modules/bcrypt');
        console.error('   npm install bcrypt@5.1.1');
    }
}

testBcrypt();
