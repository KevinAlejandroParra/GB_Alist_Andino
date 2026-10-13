"use client";
import React, { useState, useEffect } from 'react';
import { 
    Grid, Typography, Paper, Box, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Switch, Select, MenuItem, FormControl, InputLabel, Dialog
} from '@mui/material';
import { 
    CalendarMonth, 
    Settings as SettingsIcon, 
    PlayArrow as PlayIcon, 
    CheckCircle as CheckIcon 
} from '@mui/icons-material';
import axiosInstance from '../../utils/axiosConfig';
import MaintenanceSessionWizard from './MaintenanceSessionWizard';

const API_BASE = '/api/maintenance-scheduler';

const MaintenanceSchedulerPage = () => {
    const [view, setView] = useState('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [configs, setConfigs] = useState([]);
    const [premiseId, setPremiseId] = useState(1); 
    const [selectedSlot, setSelectedSlot] = useState(null);

    useEffect(() => {
        if (view === 'calendar') {
            loadPlan();
        } else if (view === 'config') {
            loadConfigs();
        }
    }, [view, currentMonth]);

    const loadPlan = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`${API_BASE}/plans/month?premiseId=${premiseId}&month=${currentMonth}`);
            setPlan(res.data);
        } catch (e) {
            console.error("Error loading plan", e);
        } finally {
            setLoading(false);
        }
    };

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`${API_BASE}/config/machines?premiseId=${premiseId}`);
            setConfigs(res.data);
        } catch (e) {
            console.error("Error loading configs", e);
        } finally {
            setLoading(false);
        }
    };

    const generatePlan = async () => {
        setLoading(true);
        try {
            await axiosInstance.post(`${API_BASE}/plans/generate?premiseId=${premiseId}&month=${currentMonth}`);
            await loadPlan();
        } catch (e) {
            alert("Error generating plan: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const publishPlan = async () => {
        if (!plan) return;
        try {
            await axiosInstance.post(`${API_BASE}/plans/${plan.id}/publish`);
            await loadPlan();
            alert("Plan published successfully");
        } catch (e) {
            alert("Error publishing plan: " + e.message);
        }
    };

    const updateMachineConfig = async (insId, updatedData) => {
        try {
            await axiosInstance.post(`${API_BASE}/config/machine`, { ins_id: insId, ...updatedData });
            await loadConfigs();
        } catch (e) {
            console.error("Error updating config", e);
        }
    };

    const getSlotColor = (slot) => {
        if (slot.status === 'COMPLETED') return '#4caf50';
        if (slot.status === 'DRAFT') return '#ffeb3b';
        return '#f44336';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="h5">Cronograma de Mantenimiento</Typography>
                    <Button 
                        startIcon={<CalendarMonth />} 
                        onClick={() => setView('calendar')}
                        variant={view === 'calendar' ? 'contained' : 'outlined'}
                    >
                        Calendario
                    </Button>
                    <Button 
                        startIcon={<SettingsIcon />} 
                        onClick={() => setView('config')}
                        variant={view === 'config' ? 'contained' : 'outlined'}
                    >
                        Configuración
                    </Button>
                </Box>
                
                {view === 'calendar' && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <input 
                            type="month" 
                            value={currentMonth} 
                            onChange={(e) => setCurrentMonth(e.target.value)} 
                        />
                        <Button 
                            startIcon={<PlayIcon />} 
                            onClick={generatePlan} 
                            disabled={loading}
                            variant="contained" 
                            color="secondary"
                        >
                            Generar Plan
                        </Button>
                        <Button 
                            startIcon={<CheckIcon />} 
                            onClick={publishPlan} 
                            disabled={loading || !plan}
                            variant="contained" 
                            color="primary"
                        >
                            Publicar
                        </Button>
                    </Box>
                )}
            </Paper>

            {view === 'calendar' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {loading ? <Typography>Cargando plan...</Typography> : plan ? (
                        <Grid container spacing={2}>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <Grid item xs={12} md={4} key={day}>
                                    <Paper sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Día {day} ({currentMonth})
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                            {plan.slots.filter(s => new Date(s.scheduled_date).getDate() === day).map(slot => (
                                                <Box 
                                                    key={slot.id} 
                                                    onClick={() => setSelectedSlot(slot)}
                                                    sx={{ 
                                                        p: 1, 
                                                        borderRadius: 1, 
                                                        bgcolor: getSlotColor(slot),
                                                        display: 'flex', 
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Typography variant="body2">{slot.inspectable?.name} ({slot.slot_type})</Typography>
                                                    <Typography variant="caption">{slot.status || 'PENDIENTE'}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    ) : <Typography>No hay plan generado para este mes.</Typography>}
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Máquina</TableCell>
                                <TableCell>Semanal</TableCell>
                                <TableCell>Día Semanal</TableCell>
                                <TableCell>Exento Programado</TableCell>
                                <TableCell>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {configs.map((config) => (
                                <TableRow key={config.ins_id}>
                                    <TableCell>{config.inspectable?.name}</TableCell>
                                    <TableCell>
                                        <Switch 
                                            checked={config.weekly_enabled} 
                                            onChange={(e) => updateMachineConfig(config.ins_id, { weekly_enabled: e.target.checked })} 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            size="small"
                                            value={config.weekly_weekday || ''} 
                                            onChange={(e) => updateMachineConfig(config.ins_id, { weekly_weekday: parseInt(e.target.value) })}
                                        >
                                            <MenuItem value={0}>Domingo</MenuItem>
                                            <MenuItem value={1}>Lunes</MenuItem>
                                            <MenuItem value={2}>Martes</MenuItem>
                                            <MenuItem value={3}>Miércoles</MenuItem>
                                            <MenuItem value={4}>Jueves</MenuItem>
                                            <MenuItem value={5}>Viernes</MenuItem>
                                            <MenuItem value={6}>Sábado</MenuItem>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Switch 
                                            checked={config.scheduled_exempt} 
                                            onChange={(e) => updateMachineConfig(config.ins_id, { scheduled_exempt: e.target.checked })} 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">Auto-guardado</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={!!selectedSlot} onClose={() => setSelectedSlot(null)} maxWidth="sm" fullWidth>
                {selectedSlot && (
                    <MaintenanceSessionWizard 
                        slot={selectedSlot} 
                        onComplete={() => {
                            setSelectedSlot(null);
                            loadPlan();
                        }} 
                    />
                )}
            </Dialog>
        </Box>
    );
};

export default MaintenanceSchedulerPage;
