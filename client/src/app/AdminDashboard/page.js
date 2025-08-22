'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import PremiseManagement from '../../components/admin/PremiseManagement';
import EntityManagement from '../../components/admin/EntityManagement';
import RoleManagement from '../../components/admin/RoleManagement';
import UserManagement from '../../components/admin/UserManagement';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users'); 
    const router = useRouter();


    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                return <UserManagement />;
            case 'premises':
                return <PremiseManagement />;
            case 'entities':
                return <EntityManagement />;
            case 'roles':
                return <RoleManagement />;
            default:
                return <UserManagement />;
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">Panel de Administración</h1>

            <nav className="mb-6">
                <ul className="flex flex-wrap justify-center space-x-2 md:space-x-4">
                    <li>
                        <button
                            className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                                activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-200'
                            }`}
                            onClick={() => setActiveTab('users')}
                        >
                            Gestión de Usuarios
                        </button>
                    </li>
                    <li>
                        <button
                            className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                                activeTab === 'premises' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-200'
                            }`}
                            onClick={() => setActiveTab('premises')}
                        >
                            Gestión de Sedes
                        </button>
                    </li>
                    <li>
                        <button
                            className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                                activeTab === 'entities' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-200'
                            }`}
                            onClick={() => setActiveTab('entities')}
                        >
                            Gestión de Entidades
                        </button>
                    </li>
                    <li>
                        <button
                            className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                                activeTab === 'roles' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-200'
                            }`}
                            onClick={() => setActiveTab('roles')}
                        >
                            Gestión de Roles
                        </button>
                    </li>
                </ul>
            </nav>

            <div className="bg-white p-6 rounded-lg shadow-md">
                {renderContent()}
            </div>
        </div>
    );
}
