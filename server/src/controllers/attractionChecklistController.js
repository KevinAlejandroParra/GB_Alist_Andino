const attractionChecklistService = require('../services/attractionChecklistService');

const ensureDailyInstance = async (req, res) => {
    try {
        const { id: attraction_id } = req.params;
        const { premise_id, date } = req.body;
        const user_id = req.user.user_id;
        const role_id = req.user.role_id;

        const checklist = await attractionChecklistService.ensureDailyInstance({
            attraction_id: parseInt(attraction_id),
            premise_id,
            date,
            created_by: user_id,
            role_id
        });
        res.status(200).json(checklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDailyChecklist = async (req, res) => {
    try {
        const { id: attraction_id } = req.params;
        const { date } = req.query;
        const checklist = await attractionChecklistService.getDailyChecklist({
            attraction_id: parseInt(attraction_id),
            date
        });
        res.status(200).json(checklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const submitResponses = async (req, res) => {
    try {
        const { id: checklist_id } = req.params;
        const { responses } = req.body;
        const user_id = req.user.user_id;
        const role_id = req.user.role_id;
        await attractionChecklistService.submitResponses({
            checklist_id: parseInt(checklist_id),
            responses,
            responded_by: user_id,
            role_id
        });
        res.status(200).json({ message: 'Respuestas registradas exitosamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateFailure = async (req, res) => {
    try {
        const { id: failure_id } = req.params;
        console.log('updateFailure Controller: Received failure_id:', failure_id);
        const { description, solution_text, responsible_area, status, severity, reported_at, closed_at, responded_by, closed_by } = req.body;
        console.log('updateFailure Controller: Received body:', req.body);

        const updateData = {
            failure_id: parseInt(failure_id),
            description,
            solution_text,
            responsible_area,
            status,
            severity,
            reported_at,
            closed_at,
            responded_by,
            closed_by 
        };
        console.log('updateFailure Controller: Data sent to service:', updateData);

        const updatedFailure = await attractionChecklistService.updateFailure(updateData);
        res.status(200).json(updatedFailure);
    } catch (error) {
        console.error('updateFailure Controller: Error:', error.message);
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
        const { id: checklist_id } = req.params;
        const user_id = req.user.user_id;
        const role_id = req.user.role_id;
        
        await attractionChecklistService.signChecklist({
            checklist_id: parseInt(checklist_id),
            user_id,
            role_id
        });
        
        res.status(200).json({ message: 'Checklist firmado exitosamente' });
    } catch (error) {
        // Si el error contiene información de ítems incompletos, enviarla al cliente
        if (error.incompleteItems) {
            res.status(400).json({ 
                error: error.message,
                incompleteItems: error.incompleteItems,
                incompleteCount: error.incompleteCount
            });
        } else {
            res.status(400).json({ error: error.message });
        }
    }
};
const listChecklistsByAttraction = async (req, res) => {
    try {
        const { id: attraction_id } = req.params;
        const checklists = await attractionChecklistService.listChecklistsByAttraction(parseInt(attraction_id));
        res.status(200).json(checklists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    ensureDailyInstance,
    getDailyChecklist,
    submitResponses,
    updateFailure,
    listObservations,
    signChecklist,
    listChecklistsByAttraction
};
