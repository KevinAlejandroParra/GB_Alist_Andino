import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules';

// Importa los estilos de Swiper
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

const PremisesWithInspectablesCarousel = () => {
    const [premises, setPremises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPremises = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/inspectables/premises-with-inspectables`);
                // Filtrar sedes que no tienen inspectables
                const premisesWithInspectables = response.data.filter(premise => 
                    premise.inspectables && premise.inspectables.length > 0
                );
                setPremises(premisesWithInspectables);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching premises with inspectables:", err);
                setError("Error al cargar las sedes y sus elementos inspeccionables.");
                setLoading(false);
            }
        };

        fetchPremises();
    }, []);

    if (loading) {
        return <div className="text-center text-white">Cargando sedes e inspectables...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">Error: {error}</div>;
    }

    if (premises.length === 0) {
        return <div className="text-center text-white">No hay sedes con elementos inspeccionables disponibles.</div>;
    }

    return (
        <section className="py-16 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-center mb-12 text-blue-400">Explora Nuestras Instalaciones y Atracciones</h2>
                {
                    premises.map((premise) => (
                        <div key={premise.premise_id} className="mb-16">
                            <h3 className="text-3xl font-semibold text-center mb-8 text-blue-300">Sede: {premise.premise_name}</h3>
                            <Swiper
                                effect={'coverflow'}
                                grabCursor={true}
                                centeredSlides={true}
                                slidesPerView={'auto'}
                                coverflowEffect={{
                                    rotate: 50,
                                    stretch: 0,
                                    depth: 100,
                                    modifier: 1,
                                    slideShadows: true,
                                }}
                                pagination={{
                                    clickable: true,
                                }}
                                navigation={true}
                                modules={[EffectCoverflow, Pagination, Navigation]}
                                className="mySwiper"
                            >
                                {premise.inspectables.map((inspectable) => {
                                    const imageUrl = inspectable.photo_url ? `${API_BASE_URL}${inspectable.photo_url}` : '/resources/nf.jpg'; 
                                    const isDevice = inspectable.type_code === 'device';
                                    const details = isDevice ? inspectable.deviceData : inspectable.attractionData;

                                    return (
                                        <SwiperSlide key={inspectable.ins_id}>
                                            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
                                                <img 
                                                    src={imageUrl} 
                                                    alt={inspectable.name} 
                                                    className="w-full h-48 object-cover"
                                                />
                                                <div className="p-6 flex-grow">
                                                    <h4 className="text-xl font-bold text-blue-200 mb-2">{
                                                        isDevice ? `Dispositivo: ${inspectable.name}` : `Atracción: ${inspectable.name}`
                                                    }</h4>
                                                    <p className="text-gray-300 text-sm mb-4">{inspectable.description}</p>
                                                    {details && (
                                                        <div className="text-xs text-gray-400">
                                                            {isDevice && details.family && <p>Familia: {details.family.family_name}</p>}
                                                            <p>Público: {details.public_flag === 'true' || details.public_flag === true || details.public_flag === 'Sí' ? 'Sí' : 'No'}</p>
                                                            {isDevice && details.brand && <p>Marca: {details.brand}</p>}
                                                            {!isDevice && details.capacity && <p>Capacidad: {details.capacity}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    );
                                })}
                            </Swiper>
                        </div>
                    ))
                }
            </div>
            <style jsx global>{`
                .swiper-container {
                    width: 100%;
                    padding-top: 50px;
                    padding-bottom: 50px;
                }
                .swiper-slide {
                    background-position: center;
                    background-size: cover;
                    width: 300px;
                    height: 400px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .swiper-slide img {
                    display: block;
                    width: 100%;
                }
                .swiper-button-next, .swiper-button-prev {
                    color: #60a5fa; /* Tailwind blue-400 */
                }
                .swiper-pagination-bullet-active {
                    background-color: #60a5fa;
                }
            `}</style>
        </section>
    );
};

export default PremisesWithInspectablesCarousel;
