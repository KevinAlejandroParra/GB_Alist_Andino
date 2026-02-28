import React, { useState, useEffect } from 'react';

const LazyImage = ({ 
    src, 
    alt, 
    className = '', 
    placeholderSrc = '/images/placeholder-loading.svg',
    errorSrc = '/images/image-error.svg',
    ...props 
}) => {
    const [imageSrc, setImageSrc] = useState(placeholderSrc);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const image = new Image();
        
        image.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
            setIsError(false);
        };
        
        image.onerror = () => {
            setImageSrc(errorSrc);
            setIsError(true);
            setIsLoaded(true);
        };
        
        image.src = src;

        return () => {
            image.onload = null;
            image.onerror = null;
        };
    }, [src, errorSrc]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <img
                src={imageSrc}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                {...props}
            />
            
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            )}
            
            {isError && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs">Error al cargar imagen</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LazyImage;