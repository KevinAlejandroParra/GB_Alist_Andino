'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);
    const [email, setEmail] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const URL_API = `${process.env.NEXT_PUBLIC_API}`;

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError('No se encontró token de restablecimiento.');
                return;
            }

            try {
                const response = await fetch(`${URL_API}/api/users/verify-reset-token/${token}`);
                const data = await response.json();

                if (response.ok) {
                    setTokenValid(true);
                    setEmail(data.email);
                    setMessage('Token verificado. Por favor, introduce tu nueva contraseña.');
                } else {
                    setError(data.message || 'Token inválido o expirado.');
                    setTokenValid(false);
                }
            } catch (err) {
                console.error('Error al verificar el token:', err);
                setError('Error de conexión. Inténtalo de nuevo más tarde.');
                setTokenValid(false);
            }
        };

        verifyToken();
    }, [token, URL_API]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${URL_API}/api/users/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword: password, confirmPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message + ' Serás redirigido al login.');
                setTimeout(() => {
                    router.push('/login'); 
                }, 3000);
            } else {
                setError(data.message || 'Error al restablecer la contraseña.');
            }
        } catch (err) {
            console.error('Error en la solicitud:', err);
            setError('Error de conexión. Inténtalo de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Restablecer Contraseña</h1>

                {loading && <p className="text-blue-500 text-center mb-4">Cargando...</p>}
                {message && <p className="text-green-500 text-center mb-4">{message}</p>}
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                {tokenValid && !loading && !error && (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="emailDisplay" className="block text-gray-700 text-sm font-bold mb-2">Correo Electrónico:</label>
                            <input
                                type="email"
                                id="emailDisplay"
                                value={email}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                                readOnly
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Nueva Contraseña:</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">Confirmar Nueva Contraseña:</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            disabled={loading}
                        >
                            {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                        </button>
                    </form>
                )}

                {!tokenValid && !loading && !error && (
                    <p className="text-gray-600 text-center">Verificando token...</p>
                )}
            </div>
        </div>
    );
}
