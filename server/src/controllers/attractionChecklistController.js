const attractionChecklistService = require('../services/attractionChecklistService');

const ensureDailyInstance = async (req, res) => {
    try {
        const { id: attraction_id } = req.params; // Obtener attraction_id de los parámetros de la URL
        const { premise_id, date } = req.body;
        const user_id = req.user.id;
        const role_id = req.user.role_id; // Asume que el middleware de autenticación añade el role_id

        const checklist = await attractionChecklistService.ensureDailyInstance({
            attraction_id: parseInt(attraction_id),
            premise_id,
            date,
            created_by: user_id,
            role_id // Pasar el role_id al servicio
        });
        res.status(200).json(checklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDailyChecklist = async (req, res) => {
    try {
        const { id: attraction_id } = req.params; // Obtener attraction_id de los parámetros de la URL
        const { date, role_id } = req.query;
        const checklist = await attractionChecklistService.getDailyChecklist({
            attraction_id: parseInt(attraction_id),
            date,
            role_id: parseInt(role_id) // Pasar el role_id al servicio
        });
        res.status(200).json(checklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const submitResponses = async (req, res) => {
    try {
        const { id: checklist_id } = req.params; // Obtener checklist_id de los parámetros de la URL
        const { responses } = req.body;
        const user_id = req.user.id;
        await attractionChecklistService.submitResponses({
            checklist_id: parseInt(checklist_id),
            responses,
            responded_by: user_id
        });
        res.status(200).json({ message: 'Respuestas registradas exitosamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const upsertObservation = async (req, res) => {
    try {
        const { id: failure_id } = req.params; // Obtener failure_id de los parámetros de la URL
        const observationData = req.body;
        const updatedFailure = await attractionChecklistService.upsertObservation({
            failure_id: parseInt(failure_id),
            ...observationData
        });
        res.status(200).json(updatedFailure);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const listObservations = async (req, res) => {
    try {
        const { checklist_id, start_date, end_date } = req.query;
        const observations = await attractionChecklistService.listObservations({
            checklist_id: checklist_id ? parseInt(checklist_id) : undefined,
            start_date,
            end_date
        });
        res.status(200).json(observations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const signChecklist = async (req, res) => {
    try {
        const { checklist_id } = req.params;
        const user_id = req.user.id;
        const role = req.user.role; // Asume que el middleware de autenticación añade el rol
        await attractionChecklistService.signChecklist({
            checklist_id,
            user_id,
            role
        });
        res.status(200).json({ message: 'Checklist firmado exitosamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    ensureDailyInstance,
    getDailyChecklist,
    submitResponses,
    upsertObservation,
    listObservations,
    signChecklist
};
