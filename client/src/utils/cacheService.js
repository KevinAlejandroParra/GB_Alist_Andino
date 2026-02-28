// Servicio de cache usando IndexedDB para optimizar rendimiento en redes lentas
class CacheService {
    constructor() {
        this.dbName = 'GBAlistCache';
        this.dbVersion = 1;
        this.db = null;
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
    }

    // Inicializar la base de datos IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error al abrir la base de datos IndexedDB');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear object stores para diferentes tipos de datos
                if (!db.objectStoreNames.contains('premises')) {
                    db.createObjectStore('premises', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('families')) {
                    db.createObjectStore('families', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('devices')) {
                    db.createObjectStore('devices', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('attractions')) {
                    db.createObjectStore('attractions', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('checklistTypes')) {
                    db.createObjectStore('checklistTypes', { keyPath: 'id' });
                }

                // Store para metadata de cache
                if (!db.objectStoreNames.contains('cacheMetadata')) {
                    db.createObjectStore('cacheMetadata', { keyPath: 'key' });
                }
            };
        });
    }

    // Verificar si los datos en cache son válidos
    async isValid(cacheKey) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cacheMetadata'], 'readonly');
            const store = transaction.objectStore('cacheMetadata');
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                const metadata = request.result;
                if (!metadata) {
                    resolve(false);
                    return;
                }

                const isValid = (Date.now() - metadata.timestamp) < this.cacheTimeout;
                resolve(isValid);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Guardar datos en cache
    async set(cacheKey, data, storeName) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName, 'cacheMetadata'], 'readwrite');
            
            // Guardar los datos
            const dataStore = transaction.objectStore(storeName);
            const dataRequest = dataStore.put({ id: cacheKey, data, timestamp: Date.now() });

            dataRequest.onsuccess = () => {
                // Guardar metadata
                const metadataStore = transaction.objectStore('cacheMetadata');
                const metadataRequest = metadataStore.put({
                    key: cacheKey,
                    timestamp: Date.now(),
                    storeName: storeName
                });

                metadataRequest.onsuccess = () => resolve(true);
                metadataRequest.onerror = () => reject(metadataRequest.error);
            };

            dataRequest.onerror = () => reject(dataRequest.error);
        });
    }

    // Obtener datos del cache
    async get(cacheKey, storeName) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Eliminar datos del cache
    async remove(cacheKey, storeName) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName, 'cacheMetadata'], 'readwrite');
            
            const dataStore = transaction.objectStore(storeName);
            const dataRequest = dataStore.delete(cacheKey);

            dataRequest.onsuccess = () => {
                const metadataStore = transaction.objectStore('cacheMetadata');
                const metadataRequest = metadataStore.delete(cacheKey);

                metadataRequest.onsuccess = () => resolve(true);
                metadataRequest.onerror = () => reject(metadataRequest.error);
            };

            dataRequest.onerror = () => reject(dataRequest.error);
        });
    }

    // Limpiar cache expirado
    async cleanExpired() {
        if (!this.db) await this.initDB();

        const stores = ['premises', 'families', 'devices', 'attractions', 'checklistTypes'];
        
        for (const storeName of stores) {
            const transaction = this.db.transaction([storeName, 'cacheMetadata'], 'readwrite');
            const dataStore = transaction.objectStore(storeName);
            const metadataStore = transaction.objectStore('cacheMetadata');
            
            const request = metadataStore.getAll();
            
            request.onsuccess = () => {
                const allMetadata = request.result;
                const expiredKeys = allMetadata
                    .filter(meta => (Date.now() - meta.timestamp) >= this.cacheTimeout)
                    .map(meta => meta.key);

                expiredKeys.forEach(key => {
                    dataStore.delete(key);
                    metadataStore.delete(key);
                });
            };
        }
    }

    // Obtener datos con cache - patrón cache-first
    async getWithCache(cacheKey, fetchFunction, storeName) {
        try {
            // Intentar obtener del cache primero
            const cachedData = await this.get(cacheKey, storeName);
            if (cachedData && await this.isValid(cacheKey)) {
                return { data: cachedData, fromCache: true };
            }

            // Si no hay datos válidos en cache, hacer fetch
            const freshData = await fetchFunction();
            
            // Guardar en cache
            await this.set(cacheKey, freshData, storeName);
            
            return { data: freshData, fromCache: false };
        } catch (error) {
            console.error(`Error en getWithCache para ${cacheKey}:`, error);
            
            // En caso de error, intentar obtener datos del cache aunque estén expirados
            const cachedData = await this.get(cacheKey, storeName);
            if (cachedData) {
                return { data: cachedData, fromCache: true, expired: true };
            }
            
            throw error;
        }
    }

    // Verificar conectividad
    async isOnline() {
        return navigator.onLine;
    }

    // Escuchar cambios de conectividad
    onConnectivityChange(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    }
}

// Instancia singleton
const cacheService = new CacheService();

export default cacheService;