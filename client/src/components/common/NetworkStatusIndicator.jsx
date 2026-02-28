import React, { useState, useEffect } from 'react';
import networkOptimizer from '../../utils/networkOptimizer';

const NetworkStatusIndicator = ({ className = '' }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [connectionInfo, setConnectionInfo] = useState(networkOptimizer.getConnectionInfo());
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setConnectionInfo(networkOptimizer.getConnectionInfo());
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleConnectionChange = () => {
            setConnectionInfo(networkOptimizer.getConnectionInfo());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Escuchar cambios en la conexión si está disponible
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', handleConnectionChange);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if ('connection' in navigator) {
                navigator.connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, []);

    const getStatusColor = () => {
        if (!isOnline) return 'bg-red-500';
        
        const effectiveType = connectionInfo.effectiveType;
        switch (effectiveType) {
            case '4g': return 'bg-green-500';
            case '3g': return 'bg-yellow-500';
            case '2g': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        if (!isOnline) return 'Sin conexión';
        
        const effectiveType = connectionInfo.effectiveType;
        switch (effectiveType) {
            case '4g': return 'Conexión rápida';
            case '3g': return 'Conexión moderada';
            case '2g': return 'Conexión lenta';
            default: return 'Conexión desconocida';
        }
    };

    const getSignalIcon = () => {
        if (!isOnline) {
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
                </svg>
            );
        }

        const effectiveType = connectionInfo.effectiveType;
        switch (effectiveType) {
            case '4g':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                );
            case '3g':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0" />
                    </svg>
                );
            case '2g':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0" />
                    </svg>
                );
        }
    };

    if (!isOnline) {
        return (
            <div className={`fixed top-4 right-4 z-50 ${className}`}>
                <div className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium">Sin conexión</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed top-4 right-4 z-50 ${className}`}>
            <div 
                className={`${getStatusColor()} text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setShowDetails(!showDetails)}
            >
                {getSignalIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
                
                {showDetails && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-800 text-white p-3 rounded-lg shadow-lg min-w-48 text-xs">
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Tipo:</span>
                                <span className="font-mono">{connectionInfo.effectiveType || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Velocidad:</span>
                                <span className="font-mono">{connectionInfo.downlink ? `${connectionInfo.downlink} Mbps` : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Latencia:</span>
                                <span className="font-mono">{connectionInfo.rtt ? `${connectionInfo.rtt}ms` : 'N/A'}</span>
                            </div>
                            {connectionInfo.saveData && (
                                <div className="flex justify-between">
                                    <span>Modo:</span>
                                    <span className="font-mono text-yellow-400">Ahorro datos</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkStatusIndicator;