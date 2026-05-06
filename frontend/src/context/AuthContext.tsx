import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const token = await user.getIdToken();
                    // Configurar Axios globalmente para que todas las peticiones lleven el token
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    // Sincronizar usuario con PostgreSQL
                    await axios.post(`${API_URL}/api/auth/sync`);
                } catch (error) {
                    console.error('Error al configurar token o sincronizar usuario', error);
                }
            } else {
                delete axios.defaults.headers.common['Authorization'];
            }
            
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
