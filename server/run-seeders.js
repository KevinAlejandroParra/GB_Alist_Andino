#!/usr/bin/env node

/**
 * Script de Ejecución Secuencial de Seeders
 * 
 * Este script ejecuta todos los seeders en el orden correcto para resolver
 * el problema de dependencias de Sequelize que salta del 1 al 10.
 * 
 * Uso: node run-seeders.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración de seeders en orden de dependencias
const SEEDERS_ORDER = [
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

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

/**
 * Función para mostrar mensajes con colores
 */
function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Función para mostrar el progreso
 */
function showProgress(current, total, seederName, status = 'running') {
    const percentage = Math.round((current / total) * 100);
    const statusIcon = status === 'success' ? '✅' : 
                      status === 'error' ? '❌' : 
                      status === 'running' ? '🔄' : '⏳';
    
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + 
                       '░'.repeat(20 - Math.floor(percentage / 5));
    
    log(`[${progressBar}] ${percentage}% ${statusIcon} ${seederName}`, status === 'success' ? 'green' : status === 'error' ? 'red' : 'cyan');
}

/**
 * Verificar si un archivo de seeder existe
 */
function seederExists(seederName) {
    const seederPath = path.join(__dirname, 'src', 'seeders', seederName);
    return fs.existsSync(seederPath);
}

/**
 * Ejecutar un seeder individual
 */
function runSeeder(seederName) {
    try {
        log(`\n🚀 Ejecutando seeder: ${seederName}`, 'bright');
        
        // Cambiar al directorio del servidor
        process.chdir(__dirname);
        
        // Comando para ejecutar el seeder
        const command = `npx sequelize-cli db:seed --seed ${seederName}`;
        
        log(`💻 Comando: ${command}`, 'blue');
        
        // Ejecutar el seeder
        execSync(command, { 
            stdio: 'pipe',
            encoding: 'utf-8',
            cwd: __dirname
        });
        
        return { success: true, output: '' };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message || error,
            output: error.stdout || '',
            stderr: error.stderr || ''
        };
    }
}

/**
 * Función principal
 */
async function main() {
    log('🎯 Script de Ejecución Secuencial de Seeders', 'bright');
    log('================================================', 'cyan');
    
    // Verificar que estamos en el directorio correcto
    if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
        log('❌ Error: Este script debe ejecutarse desde el directorio del servidor', 'red');
        process.exit(1);
    }
    
    // Verificar existencia de seeders
    log('\n🔍 Verificando existencia de seeders...', 'yellow');
    const existingSeeders = [];
    const missingSeeders = [];
    
    for (const seeder of SEEDERS_ORDER) {
        if (seederExists(seeder)) {
            existingSeeders.push(seeder);
            log(`✅ ${seeder}`, 'green');
        } else {
            missingSeeders.push(seeder);
            log(`⚠️  ${seeder} - NO ENCONTRADO`, 'yellow');
        }
    }
    
    if (missingSeeders.length > 0) {
        log(`\n⚠️  Seeders faltantes: ${missingSeeders.join(', ')}`, 'yellow');
        log('¿Continuar solo con los seeders existentes? (y/N): ', 'cyan');
        
        // En modo automático, continuar sin confirmación
        // En modo interactivo, esperar confirmación
    }
    
    log(`\n📋 Seeders a ejecutar: ${existingSeeders.length}`, 'cyan');
    log('================================================\n', 'cyan');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Ejecutar seeders en orden
    for (let i = 0; i < existingSeeders.length; i++) {
        const seeder = existingSeeders[i];
        
        showProgress(i + 1, existingSeeders.length, seeder, 'running');
        
        const result = runSeeder(seeder);
        results.push({ seeder, ...result });
        
        if (result.success) {
            showProgress(i + 1, existingSeeders.length, seeder, 'success');
            successCount++;
            log(`✅ ${seeder} completado exitosamente`, 'green');
        } else {
            showProgress(i + 1, existingSeeders.length, seeder, 'error');
            errorCount++;
            log(`❌ Error en ${seeder}:`, 'red');
            log(result.error, 'red');
            
            // Preguntar si continuar en caso de error
            log('\n¿Continuar con el siguiente seeder? (y/N): ', 'yellow');
            // En modo automático, continuar
            // En modo interactivo, esperar respuesta
        }
        
        log(''); // Línea en blanco para separar
    }
    
    // Resumen final
    log('🎉 RESUMEN DE EJECUCIÓN', 'bright');
    log('========================', 'cyan');
    log(`✅ Seeders exitosos: ${successCount}`, 'green');
    log(`❌ Seeders con errores: ${errorCount}`, errorCount > 0 ? 'red' : 'white');
    log(`📊 Total procesados: ${existingSeeders.length}`, 'cyan');
    
    if (errorCount > 0) {
        log('\n❌ Seeders que fallaron:', 'red');
        results
            .filter(r => !r.success)
            .forEach(r => log(`   - ${r.seeder}`, 'red'));
    }
    
    log('\n🏁 Ejecución completada', 'bright');
    
    // Código de salida
    process.exit(errorCount > 0 ? 1 : 0);
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    log(`\n💥 Error no manejado: ${reason}`, 'red');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log(`\n💥 Excepción no capturada: ${error.message}`, 'red');
    process.exit(1);
});

// Ejecutar script si es llamado directamente
if (require.main === module) {
    main().catch(error => {
        log(`\n💥 Error fatal: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main, SEEDERS_ORDER };