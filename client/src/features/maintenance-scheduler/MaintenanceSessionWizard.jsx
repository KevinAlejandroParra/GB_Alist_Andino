"use client";
import React, { useState } from 'react';
import { 
    Box, Typography, Button, Stepper, Step, StepLabel, 
    TextField, CircularProgress, IconButton 
} from '@mui/material';
import { 
    CloudUpload as UploadIcon, 
    CheckCircle as CompleteIcon,
    QrCodeScanner as QrIcon
} from '@mui/icons-material';
import axiosInstance from '@/utils/axiosConfig';

const API_BASE = '/api/maintenance-scheduler';

const MaintenanceSessionWizard = ({ slot, onComplete }) => {
    const [step, setStep] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [description, setDescription] = useState('');
    const [evidences, setEvidences] = useState({
        INICIO: null,
        PROCESO_1: null,
        PROCESO_2: null,
        FIN: null
    });
    const [loading, setLoading] = useState(false);

    const steps = ['Escaneo QR', 'Evidencias', 'Descripción', 'Finalizar'];

    const handleStart = async () => {
        if (!qrCode) return alert("Por favor escanee el QR");
        setLoading(true);
        try {
            const res = await axiosInstance.post(`${API_BASE}/sessions/start`, { 
                slotId: slot.id, 
                qrCode 
            });
            setSessionId(res.data.id);
            setStep(1);
        } catch (e) {
            alert(e.response?.data?.error || "Error iniciando sesión");
        } finally {
            setLoading(false);
        }
    };

    const uploadEvidence = async (phase, file) => {
        if (!file) return;
        setLoading(true);
        try {
            const fileUrl = `uploads/maintenance/${Date.now()}-${file.name}`;
            await axiosInstance.post(`${API_BASE}/sessions/evidence`, { 
                sessionId, 
                phase, 
                fileUrl 
            });
            setEvidences(prev => ({ ...prev, [phase]: fileUrl }));
        } catch (e) {
            alert("Error subiendo evidencia");
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (Object.values(evidences).some(v => v === null)) {
            return alert("Debe subir las 4 fotos obligatorias");
        }
        setLoading(true);
        try {
            await axiosInstance.post(`${API_BASE}/sessions/${sessionId}/complete`, { description });
            onComplete();
        } catch (e) {
            alert(e.response?.data?.error || "Error completando sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>
                Sesión: {slot.inspectable?.name}
            </Typography>
            
            <Stepper activeStep={step} sx={{ mb: 4 }}>
                {steps.map(label => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>

            {step === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField 
                        label="Código QR" 
                        value={qrCode} 
                        onChange={(e) => setQrCode(e.target.value)}
                        InputProps={{ startAdornment: <QrIcon sx={{ mr: 1 }} /> }}
                    />
                    <Button 
                        variant="contained" 
                        onClick={handleStart} 
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        Iniciar Sesión
                    </Button>
                </Box>
            )}

            {step === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {Object.keys(evidences).map(phase => (
                        <Box key={phase} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">{phase}</Typography>
                            <Button 
                                variant="outlined" 
                                component="label"
                                startIcon={<UploadIcon />}
                                color={evidences[phase] ? 'success' : 'primary'}
                            >
                                {evidences[phase] ? 'Cargada' : 'Subir Foto'}
                                <input 
                                    type="file" 
                                    hidden 
                                    accept="image/*" 
                                    onChange={(e) => uploadEvidence(phase, e.target.files[0])} 
                                />
                            </Button>
                        </Box>
                    ))}
                    <Button 
                        variant="contained" 
                        onClick={() => setStep(2)} 
                        disabled={Object.values(evidences).some(v => v === null)}
                    >
                        Continuar
                    </Button>
                </Box>
            )}

            {step === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField 
                        label="Descripción del trabajo" 
                        multiline 
                        rows={4} 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                    />
                    <Button 
                        variant="contained" 
                        onClick={() => setStep(3)}
                    >
                        Siguiente
                    </Button>
                </Box>
            )}

            {step === 3 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h5" gutterBottom>¿Todo correcto?</Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        Verifique que las 4 fotos y la descripción sean correctas.
                    </Typography>
                    <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<CompleteIcon />} 
                        onClick={handleComplete}
                        disabled={loading}
                    >
                        Finalizar y Completar
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default MaintenanceSessionWizard;
