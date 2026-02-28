// Sistema de optimización de red para condiciones de conectividad lenta
import axios from 'axios';

class NetworkOptimizer {
    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";
        this.isSlowConnection = this.detectSlowConnection();
        this.retryAttempts = 3;
        this.timeout = this.isSlowConnection ? 30000 : 10000; // Timeout más alto para conexiones lentas
        this.batchSize = this.isSlowConnection ? 5 : 10; // Lotes más pequeños para conexiones lentas
    }

    // Detectar velocidad de conexión
    detectSlowConnection() {
        // Detectar conexión lenta basada en Connection API (si está disponible)
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            
            // Considerar lento si es 2g o conexiones con latencia alta
            return effectiveType === '2g' || connection.rtt > 300;
        }

        // Detectar por velocidad de carga de recursos
        return navigator.connection?.downlink < 1; // Menos de 1 Mbps
    }

    // Configurar axios con timeouts adaptativos
    createOptimizedAxios() {
        return axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
    }

    // Método para hacer peticiones con reintentos automáticos
    async requestWithRetry(config, attempt = 1) {
        const axiosInstance = this.createOptimizedAxios();

        try {
            const response = await axiosInstance(config);
            return response;
        } catch (error) {
            if (attempt < this.retryAttempts && this.isNetworkError(error)) {
                console.log(`Reintentando petición (intento ${attempt + 1}/${this.retryAttempts})`);
                await this.delay(1000 * attempt); // Backoff exponencial
                return this.requestWithRetry(config, attempt + 1);
            }
            throw error;
        }
    }

    // Verificar si es error de red
    isNetworkError(error) {
        return !error.response || error.code === 'ECONNABORTED' || error.message.includes('Network Error');
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Optimizar consultas múltiples
    async batchRequests(requests, options = {}) {
        const { batchSize = this.batchSize, delayBetweenBatches = 1000 } = options;
        const results = [];
        
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            
            try {
                const batchResults = await Promise.allSettled(
                    batch.map(request => this.requestWithRetry(request))
                );
                
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        results.push({ success: true, data: result.value.data, index: i + index });
                    } else {
                        results.push({ 
                            success: false, 
                            error: result.reason.message, 
                            index: i + index 
                        });
                    }
                });
            } catch (error) {
                console.error('Error en batch:', error);
            }

            // Delay entre lotes para no sobrecargar la red
            if (i + batchSize < requests.length) {
                await this.delay(delayBetweenBatches);
            }
        }

        return results;
    }

    // Precargar datos críticos
    async preloadCriticalData() {
        const criticalEndpoints = [
            { url: '/api/premises', store: 'premises' },
            { url: '/api/families', store: 'families' },
            { url: '/api/checklist-types', store: 'checklistTypes' }
        ];

        try {
            const requests = criticalEndpoints.map(endpoint => ({
                method: 'GET',
                url: endpoint.url
            }));

            const results = await this.batchRequests(requests);
            return results;
        } catch (error) {
            console.error('Error precargando datos críticos:', error);
        }
    }

    // Optimizar carga de imágenes
    getOptimizedImageUrl(originalUrl, options = {}) {
        const { width, quality = 80, format = 'webp' } = options;
        
        // Si la URL ya tiene parámetros, no modificarla
        if (originalUrl.includes('?')) {
            return originalUrl;
        }

        const params = new URLSearchParams();
        if (width) params.append('w', width);
        params.append('q', quality);
        params.append('f', format);

        return `${originalUrl}?${params.toString()}`;
    }

    // Detectar tipo de conexión
    getConnectionInfo() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            return {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        return { effectiveType: 'unknown', downlink: null, rtt: null, saveData: false };
    }

    // Comprimir datos antes de enviar
    compressData(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('Error comprimiendo datos:', error);
            return data;
        }
    }

    // Obtener configuración optimizada para el componente actual
    getOptimizedConfig(componentType) {
        const configs = {
            'checklist': {
                timeout: this.isSlowConnection ? 45000 : 15000,
                batchSize: 3,
                preloadData: true
            },
            'admin': {
                timeout: this.isSlowConnection ? 60000 : 20000,
                batchSize: this.isSlowConnection ? 2 : 5,
                preloadData: false
            },
            'default': {
                timeout: this.timeout,
                batchSize: this.batchSize,
                preloadData: this.isSlowConnection
            }
        };

        return configs[componentType] || configs['default'];
    }
}

// Instancia singleton
const networkOptimizer = new NetworkOptimizer();

export default networkOptimizer;