const { User, Role, Premise, connection } = require('../models');

const seedDatabase = async () => {
    try {
        await connection.sync({ force: true }); // Reinicia la base de datos para pruebas

        // Insertar roles
        const adminRole = await Role.create({
            role_name: 'Admin',
            role_description: 'Administrador del sistema'
        });

        const userRole = await Role.create({
            role_name: 'User',
            role_description: 'Usuario regular'
        });

        // Insertar premises (asegurando que existan)
        const premise1 = await Premise.create({
            // Aquí debes definir los campos necesarios para crear una premise
            premise_name: 'Premise 1',
            premise_description: 'Descripción de la Premise 1',
            premise_address: 'Andino'
        });

        // Insertar usuarios
        const user1 = await User.create({
            user_name: 'Juan Perez',
            user_email: 'juan.perez@example.com',
            user_password: 'password123',
            user_document_type: 'CC',
            user_document: 123456789,
            user_phone: 321654987,
            user_image: 'path/to/image.jpg',
            role_id: adminRole.role_id,
            premise_id: premise1.premise_id
        });

        const user2 = await User.create({
            user_name: 'Maria Gomez',
            user_email: 'maria.gomez@example.com',
            user_password: 'password123',
            user_document_type: 'TI',
            user_document: 987654321,
            user_phone: 654321987,
            user_image: 'path/to/image.jpg',
            role_id: userRole.role_id,
            premise_id: premise1.premise_id
        });

        console.log('Datos insertados correctamente');
    } catch (error) {
        console.error('Error al insertar datos:', error);
    } finally {
        await connection.close();
    }
};

seedDatabase(); 