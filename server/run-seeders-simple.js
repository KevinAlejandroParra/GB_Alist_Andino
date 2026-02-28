#!/usr/bin/env node

/**
 * Script Simple de Ejecución de Seeders
 * Versión simplificada para ejecución rápida
 */

const { execSync } = require('child_process');
const path = require('path');

// Lista de seeders en orden correcto
const seeders = [
    '1-seedUsers.js',
    '2-seedRoles.js',
    '3-seedPremise.js',
    '4-seedEntities.js',
    '5-seedFamilies.js',
    '6-seed-attractions.js',
    '8-seedTestDevices.js',
    '9-seedChecklistTypes.js',
    '10-seedInventories.js',
    '11-seedChecklistItems.js',
    '12-seedChecklistQrCodes.js',
    '13-seedChecklistQrItemAssociations.js'
];

console.log('🚀 Ejecutando Seeders en Orden Correcto...\n');

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < seeders.length; i++) {
    const seeder = seeders[i];
    const progress = `[${i + 1}/${seeders.length}]`;
    
    try {
        console.log(`${progress} Ejecutando: ${seeder}`);
        
        execSync(`npx sequelize-cli db:seed --seed ${seeder}`, {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        console.log(`✅ ${seeder} - COMPLETADO\n`);
        successCount++;
        
    } catch (error) {
        console.log(`❌ ${seeder} - ERROR: ${error.message}\n`);
        errorCount++;
        
        // Continuar con el siguiente seeder
        console.log('Continuando con el siguiente seeder...\n');
    }
}

console.log('📊 RESUMEN FINAL:');
console.log(`✅ Exitosos: ${successCount}`);
console.log(`❌ Errores: ${errorCount}`);
console.log(`📈 Total: ${seeders.length}`);

if (errorCount === 0) {
    console.log('\n🎉 ¡Todos los seeders ejecutados exitosamente!');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${errorCount} seeders tuvieron errores`);
    process.exit(1);
}