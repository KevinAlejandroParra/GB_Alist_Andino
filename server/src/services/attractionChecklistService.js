const { 
    Checklist, 
    ChecklistItem, 
    ChecklistResponse, 
    ChecklistSignature, 
    Failure, 
    connection, 
    Role,
    ChecklistType, 
    User,
    Sequelize 
} = require('../models');
const user = require('../models/user');
const Op = Sequelize.Op;

/**
 * Asegura la existencia de una instancia diaria de checklist para una atracción y fecha dadas.
 * Si no existe, crea una nueva y sus respuestas iniciales.
 * Solo permite a técnicos de mantenimiento (role_id 7) crear o acceder a su instancia.
 * @param {object} params - Parámetros para asegurar la instancia del checklist.
 * @param {number} params.attraction_id - ID de la atracción.
 * @param {number} params.premise_id - ID de la sede.
 * @param {string} params.date - Fecha del checklist (YYYY-MM-DD).
 * @param {number} params.created_by - ID del usuario que crea el checklist.
 * @param {number} params.role_id - Rol del usuario que realiza la operación.
 * @returns {Promise<Checklist>} La instancia del checklist (existente o recién creada).
 * @throws {Error} Si el usuario no es técnico de mantenimiento o no se encuentra el tipo de checklist.
 */
const ensureDailyInstance = async ({ attraction_id, premise_id, date, created_by, role_id }) => {
    let transaction = null;
    try {
        transaction = await connection.transaction();

        if (role_id !== 7) {
            throw new Error('Solo el técnico de mantenimiento puede crear o acceder a su checklist diario.');
        }
        
        let checklist = await Checklist.findOne({
            where: { attraction_id, date, created_by },
            transaction 
        });

        if (checklist) {
            checklist.dataValues.items = await ChecklistItem.findAll({
                where: { checklist_type_id: checklist.checklist_type_id },
                include: [{ model: ChecklistResponse, as: "responses", required: false }],
                transaction
            });
            checklist.dataValues.signatures = await ChecklistSignature.findAll({
                where: { checklist_id: checklist.checklist_id },
                transaction
            });
            await transaction.commit();
            return checklist;
        }

        const checklistType = await ChecklistType.findOne({
            where: { attraction_id, role_id: 7, frequency: 'diario' },
            transaction
        });

        if (!checklistType) {
            throw new Error(`Tipo de checklist diario para atracción ${attraction_id} y rol de técnico no encontrado.`);
        }

        const newChecklist = await Checklist.create({
            checklist_type_id: checklistType.checklist_type_id,
            premise_id,
            attraction_id,
            date,
            created_by,
            version_label: checklistType.version_label
        }, { transaction });

        const items = await ChecklistItem.findAll({
            where: {
                checklist_type_id: checklistType.checklist_type_id,
            },
            transaction
        });

        const responses = items.map(item => ({
            checklist_id: newChecklist.checklist_id,
            checklist_item_id: item.checklist_item_id,
            value: null,
            comment: null,
            evidence_url: null,
            responded_by: created_by
        }));

        await ChecklistResponse.bulkCreate(responses, { transaction });
        await transaction.commit();
        return newChecklist;
    } catch (error) {
        if (transaction) await transaction.rollback();
        throw error;
    }
};

/**
 * Obtiene un checklist diario para una atracción y fecha específicas, incluyendo ítems, respuestas, firmas y fallas pendientes.
 * @param {object} params - Parámetros para obtener el checklist.
 * @param {number} params.attraction_id - ID de la atracción.
 * @param {string} params.date - Fecha del checklist (YYYY-MM-DD).
 * @returns {Promise<Checklist|null>} La instancia del checklist con sus asociaciones o null si no se encuentra.
 */
const getDailyChecklist = async ({ attraction_id, date }) => {
    const checklist = await Checklist.findOne({
        where: { attraction_id, date },
    });

    if (!checklist) {
        return null;
    }

    checklist.dataValues.items = await ChecklistItem.findAll({
        where: { checklist_type_id: checklist.checklist_type_id },
        include: [{
            model: ChecklistResponse,
            as: "responses",
            required: false,
            where: { checklist_id: checklist.checklist_id },
            include: [{ model: Failure, as: "failures", required: false }]
        }],
    });

    checklist.dataValues.signatures = await ChecklistSignature.findAll({
        where: { checklist_id: checklist.checklist_id },
    });

    const previousChecklists = await Checklist.findAll({
        where: {
            attraction_id,
            date: { [Op.lt]: date }
        },
        attributes: ['checklist_id']
    });

    const previousChecklistIds = previousChecklists.map(c => c.checklist_id);
    let pendingFailures = [];

    if (previousChecklistIds.length > 0) {
        const previousResponses = await ChecklistResponse.findAll({
            where: {
                checklist_id: { [Op.in]: previousChecklistIds }
            },
            attributes: ['response_id']
        });

        const previousResponseIds = previousResponses.map(r => r.response_id);

        if (previousResponseIds.length > 0) {
            pendingFailures = await Failure.findAll({
                where: {
                    status: 'pendiente',
                    response_id: { [Op.in]: previousResponseIds }
                },
                include: [
                    {
                        model: ChecklistResponse,
                        as: 'response',
                        attributes: ['response_id', 'checklist_id'],
                        include: [
                            {
                                model: Checklist,
                                as: 'checklist',
                                attributes: ['date', 'attraction_id']
                            },
                            {
                                model: ChecklistItem,
                                as: 'item',
                                attributes: ['question_text']
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'reporter',
                        attributes: ['user_id', 'user_name']
                    }
                ]
            });
        }
    }

    checklist.dataValues.pending_failures = pendingFailures;

    return checklist;
};

/**
 * Registra las respuestas para un checklist específico, creando o actualizando las respuestas y gestionando las fallas.
 * Solo permite a técnicos de mantenimiento (role_id 7) enviar respuestas.
 * @param {object} params - Parámetros para enviar las respuestas.
 * @param {number} params.checklist_id - ID del checklist.
 * @param {Array<object>} params.responses - Array de objetos de respuesta.
 * @param {number} params.responded_by - ID del usuario que responde.
 * @param {number} params.role_id - Rol del usuario que realiza la operación.
 * @throws {Error} Si el usuario no es técnico de mantenimiento, el checklist no se encuentra o los ítems no son válidos.
 */
const submitResponses = async ({ checklist_id, responses, responded_by, role_id }) => {
    const transaction = await connection.transaction();
    try {
        if (role_id !== 7) {
            throw new Error('Solo el técnico de mantenimiento puede diligenciar el checklist.');
        }

        const checklist = await Checklist.findByPk(checklist_id);

        if (!checklist) {
            throw new Error('Checklist no encontrado');
        }

        const associatedItems = await ChecklistItem.findAll({
            where: { checklist_type_id: checklist.checklist_type_id },
        });

        const itemIds = associatedItems.map(item => item.checklist_item_id);

        const invalidResponses = responses.filter(response => !itemIds.includes(response.checklist_item_id));

        if (invalidResponses.length > 0) {
            throw new Error('Algunos checklist_item_id no son válidos para este checklist');
        }

        for (const response of responses) {
            const { checklist_item_id, value, comment, evidence_url } = response;

            const [checklistResponse] = await ChecklistResponse.upsert({
                checklist_id,
                checklist_item_id,
                value,
                comment,
                evidence_url,
                responded_by
            }, { transaction });

            // Crear una falla solo si el valor es 'false' (No Cumple)
            if (value === false) {
                await Failure.upsert({
                    response_id: checklistResponse.response_id,
                    description: comment || 'Item no cumple los criterios',
                    status: 'pendiente',
                    reported_at: new Date(),
                    responded_by
                }, { transaction });
            } else {
                // Si el ítem cumple, asegurar que no haya una falla activa para esta respuesta
                await Failure.destroy({
                    where: { response_id: checklistResponse.response_id, status: 'pendiente' },
                    transaction
                });
            }
        }

        const existingTechnicianSignature = await ChecklistSignature.findOne({
            where: {
                checklist_id,
                user_id: responded_by,
                role_at_signature: 'Tecnico de mantenimiento'
            }
        });

        if (!existingTechnicianSignature) {
            await ChecklistSignature.create({
                checklist_id,
                user_id: responded_by,
                role_at_signature: 'Tecnico de mantenimiento',
                signed_at: new Date()
            }, { transaction });
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Actualiza una falla existente.
 * @param {object} params - Parámetros para actualizar la falla.
 * @param {number} params.failure_id - ID de la falla a actualizar.
 * @param {object} observationData - Datos a actualizar en la falla.
 * @returns {Promise<Failure>} La instancia de la falla actualizada.
 * @throws {Error} Si la falla no se encuentra.
 */
const updateFailure = async ({ failure_id, ...observationData }) => {
    const transaction = await connection.transaction();
    try {
        const failure = await Failure.findByPk(failure_id);

        if (!failure) {
            throw new Error('Falla no encontrada');
        }

        await failure.update({
            ...observationData,
            closed_at: observationData.status === 'resuelto' && !observationData.closed_at ? new Date() : observationData.closed_at
        }, { transaction });

        await transaction.commit();
        return failure;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Registra la firma de un checklist por un usuario con un rol específico.
 * Solo permite al Jefe de Operaciones (role_id 4) firmar, y solo si el checklist está completo y el técnico ya firmó.
 * @param {object} params - Parámetros para firmar el checklist.
 * @param {number} params.checklist_id - ID del checklist a firmar.
 * @param {number} params.user_id - ID del usuario que firma.
 * @param {number} params.role_id - Rol del usuario que firma.
 * @throws {Error} Si el usuario no es Jefe de Operaciones, el checklist no se encuentra, el rol no es válido, el checklist no está completo o el técnico no ha firmado.
 * @returns {Promise<Object>} Información detallada en caso de error con ítems incompletos.
 */

const signChecklist = async ({ checklist_id, user_id, role_id }) => {
    const transaction = await connection.transaction();
    try {
        if (role_id !== 4) {
            throw new Error(`Solo el Jefe de Operaciones puede firmar. Rol actual: ${role_id}`);
        }

        const checklist = await Checklist.findByPk(checklist_id, {
            include: [
                { 
                    model: ChecklistResponse, 
                    as: "responses",
                    include: [
                        {
                            model: ChecklistItem,
                            as: 'item',
                            attributes: ['checklist_item_id', 'question_text', 'item_number'] 
                        }
                    ]
                }
            ]
        });

        if (!checklist) {
            throw new Error('Checklist no encontrado');
        }

        const userRole = await Role.findByPk(role_id);
        if (!userRole) {
            throw new Error('Rol de usuario no válido');
        }
        const roleName = userRole.role_name;

        // Encontrar respuestas incompletas con información detallada de los ítems
        const incompleteResponses = checklist.responses.filter(response => 
            response.value === null || response.value === undefined
        );

        if (roleName === 'Jefe de Operaciones') {
            if (incompleteResponses.length > 0) {
                // Crear información detallada de los ítems incompletos
                const incompleteItems = incompleteResponses.map(response => ({
                    checklist_item_id: response.item.checklist_item_id,
                    question_text: response.item.question_text,
                    item_number: response.item.item_number, 
                    response_id: response.response_id
                }));
                
                // Ordenar por item_number para una mejor presentación
                incompleteItems.sort((a, b) => a.item_number - b.item_number);
                
                const error = new Error('El checklist debe estar completamente diligenciado antes de la firma del Jefe de Operaciones.');
                error.incompleteItems = incompleteItems;
                error.incompleteCount = incompleteItems.length;
                throw error;
            }
            
            const existingTechnicianSignature = await ChecklistSignature.findOne({
                where: {
                    checklist_id,
                    role_at_signature: 'Tecnico de mantenimiento'
                }
            });
            
            if (!existingTechnicianSignature) {
                throw new Error('El técnico de mantenimiento debe firmar primero');
            }
        }

        await ChecklistSignature.create({
            checklist_id,
            user_id,
            role_at_signature: roleName,
            signed_at: new Date()
        }, { transaction });

        await transaction.commit();
        
        return { success: true, message: 'Checklist firmado exitosamente' };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Lista las fallas (observaciones) filtradas por checklist, rango de fechas.
 * @param {object} params - Parámetros para listar las observaciones.
 * @param {number} [params.checklist_id] - ID opcional del checklist para filtrar.
 * @param {string} [params.start_date] - Fecha de inicio opcional para filtrar.
 * @param {string} [params.end_date] - Fecha de fin opcional para filtrar.
 * @returns {Promise<Array<Failure>>} Un array de fallas con sus asociaciones.
 */
const listObservations = async ({ checklist_id, start_date, end_date }) => {
    const whereClause = {};

    if (checklist_id) {
        whereClause['$ChecklistResponse.checklist_id$'] = checklist_id;
    }

    if (start_date && end_date) {
        whereClause.reported_at = {
            [Op.between]: [new Date(start_date), new Date(end_date)],
        };
    } else if (start_date) {
        whereClause.reported_at = { [Op.gte]: new Date(start_date) };
    } else if (end_date) {
        whereClause.reported_at = { [Op.lte]: new Date(end_date) };
    }

    const observations = await Failure.findAll({
        where: whereClause,
        include: [
            {
                model: ChecklistResponse, as: 'response',
                include: [
                    { model: Checklist, as: 'checklist' },
                    { model: ChecklistItem, as: 'item' },
                ]
            },
            { model: User, as: 'reporter', attributes: ['user_id', 'user_email', 'user_name'] }, 
        ],
    });

    return observations;
};

/**
 * Lista todos los checklists asociados a una atracción específica.
 * @param {number} attraction_id - ID de la atracción.
 * @returns {Promise<Array<Checklist>>} Un array de checklists con sus tipos, creadores y firmas.
 */
const listChecklistsByAttraction = async (attraction_id) => {
    const checklists = await Checklist.findAll({
        where: { attraction_id },
        include: [
            {
                model: ChecklistType,
                as: 'type',
                attributes: ['name', 'description']
            },
            {
                model: User,
                as: 'creator',
                attributes: ['user_name']
            },
            {
                model: ChecklistSignature,
                as: 'signatures',
                attributes: ['role_at_signature', 'signed_at'],
                include: [{ model: User, as: 'user', attributes: ['user_name'] }]
            }
        ],
        order: [['date', 'DESC']]
    });
    return checklists;
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
