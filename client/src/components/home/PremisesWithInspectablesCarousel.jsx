import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules';
import { motion } from 'framer-motion'; // Importar motion

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
        <section className="py-16 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden"> 
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        y: [0, 20, 0],
                        rotate: [0, -5, 0],
                    }}
                    transition={{
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute bottom-10 right-1/4 w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm"
                />
                <motion.div
                    animate={{
                        y: [0, -25, 0],
                        rotate: [0, 8, 0],
                    }}
                    transition={{
                        duration: 9,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.5
                    }}
                    className="absolute top-1/4 left-20 w-28 h-28 rounded-3xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm"
                />
                <motion.div
                    animate={{
                        y: [0, 15, 0],
                        x: [0, -10, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 3
                    }}
                    className="absolute top-3/4 right-10 w-20 h-20 rounded-xl bg-gradient-to-r from-pink-500/20 to-red-500/20 backdrop-blur-sm"
                />
            </div>

            {/* Línea divisoria creativa */}
            <div className="absolute top-0 left-0 right-0 z-10 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

            <div className="container mx-auto px-4 relative z-10"> 
                <h2 className="text-4xl font-bold text-center mb-12 text-white">Explora Nuestras Instalaciones y Atracciones</h2>
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
                                            <motion.div
                                                whileHover={{ y: -5 }} 
                                                transition={{ duration: 0.3 }}
                                                className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col" 
                                            >
                                                <img 
                                                    src={imageUrl} 
                                                    alt={inspectable.name} 
                                                    className="w-full h-48 object-cover"
                                                />
                                                <div className="p-6 flex-grow">
                                                    <h4 className="text-xl font-bold text-white mb-2">{
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
                                            </motion.div>
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
            {/* FontAwesome CDN */}
            <link 
                rel="stylesheet" 
                href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
            />
        </section>
    );
};

export default PremisesWithInspectablesCarousel;
