# Documentación de Campos Calculados - Checklists "Apoyo - Técnico (Premios)"

## 📊 Campos Calculados Automáticamente

### Jugadas
- **Jugadas Acumuladas**: Total de jugadas registradas desde que se inició el conteo en el sistema
- **Jugadas Desde Última**: Jugadas realizadas desde la última vez que se registró este checklist

### Premios  
- **Premios Acumulados**: Total de premios entregados desde que se inició el conteo
- **Premios Desde Última**: Premios entregados desde el último registro del checklist
- **Promedio Premios**: Promedio de premios por cada ciclo de 15 jugadas
- **Premios Esperados**: Premios esperados basados en el promedio y las jugadas realizadas

## 🧮 Lógica de Cálculo

### Fórmulas Utilizadas:
1. **Jugadas Desde Última** = Jugadas Actuales - Jugadas Anteriores
2. **Premios Desde Última** = Premios Actuales - Premios Anteriores  
3. **Ciclos** = Jugadas Desde Última / 15
4. **Promedio Premios** = Premios Desde Última / Ciclos (si Ciclos > 0)
5. **Premios Esperados** = Promedio Premios * Ciclos

### Ejemplo Práctico:
- Jugadas anteriores: 100
- Jugadas actuales: 130  
- Premios anteriores: 20
- Premios actuales: 26

Cálculos:
- Jugadas Desde Última: 130 - 100 = 30
- Premios Desde Última: 26 - 20 = 6  
- Ciclos: 30 / 15 = 2
- Promedio Premios: 6 / 2 = 3 premios por ciclo
- Premios Esperados: 3 * 2 = 6 premios

## 💡 Interpretación de Resultados

### Indicadores de Rendimiento:
- **Promedio > 3**: Buen rendimiento (más de 3 premios por cada 15 jugadas)
- **Promedio 2-3**: Rendimiento normal  
- **Promedio < 2**: Rendimiento bajo,可能需要 ajustes

### Comparativa:
- **Premios Esperados vs Premios Reales**: 
  - Si reales > esperados: Mejor rendimiento del esperado
  - Si reales < esperados: Peor rendimiento del esperado

## 🎯 Objetivo del Sistema

El sistema permite:
1. **Seguimiento continuo** del rendimiento de las máquinas
2. **Detección temprana** de problemas en la distribución de premios  
3. **Optimización** de la configuración basada en datos históricos
4. **Planificación** de mantenimiento predictivo

## 📈 Mejoras Implementadas

### Formato de Números:
- **Enteros**: Se muestran sin decimales (ej: 30 en lugar de 30.00)
- **Decimales**: Se muestran con 2 decimales solo cuando es necesario
- **Separadores de miles**: Formato colombiano (puntos para miles)

### Experiencia de Usuario:
- **Tooltips explicativos**: Pasar el cursor sobre cada campo muestra su descripción
- **Nomenclatura consistente**: Términos claros y unificados
- **Visualización limpia**: Sin información redundante o confusa

## 🔧 Configuración Técnica

### Base de Datos:
Los campos se almacenan en la tabla `checklist_responses` como:
- `jugadas_acumuladas` DECIMAL(10,2)
- `premios_acumulados` DECIMAL(10,2) 
- `jugadas_desde_ultima` DECIMAL(10,2)
- `premios_desde_ultima` DECIMAL(10,2)
- `promedio_premios` DECIMAL(10,2)
- `premios_esperados` DECIMAL(10,2)

### Frecuencia de Cálculo:
Los cálculos se realizan automáticamente al guardar cada checklist semanal.