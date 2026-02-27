import axios from 'axios';
import qs from 'qs';

interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: string;
    session_state: string;
}

export class HaciendaAuthService {
    /**
     * Caché simple en memoria para evitar saturar el IDP de Hacienda.
     * key: username -> { token, expiresAt }
     */
    private static tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

    /**
     * Obtiene un Token JWT del Identity Provider de ATV (Hacienda).
     * Si ya existe un token en caché y es válido (le faltan más de 30s para expirar), retorna ese.
     */
    static async obtenerToken(
        usuarioAtv: string,
        passwordAtv: string
    ): Promise<string> {

        // 1. Revisar Caché
        const cacheado = this.tokenCache.get(usuarioAtv);
        if (cacheado) {
            const ahora = Date.now();
            // Si faltan más de 30 segundos para expirar, lo reusamos
            if (cacheado.expiresAt - ahora > 30000) {
                return cacheado.token;
            }
        }

        // 2. Si no hay token o expiró, solicitar uno nuevo
        const idpUrl = process.env.HACIENDA_IDP_URL;
        const clientId = process.env.HACIENDA_IDP_CLIENT_ID || 'api-stag';

        if (!idpUrl) throw new Error('Falta configuración: HACIENDA_IDP_URL');

        // Hacienda requiere content-type x-www-form-urlencoded
        const data = qs.stringify({
            grant_type: 'password',
            client_id: clientId,
            username: usuarioAtv,
            password: passwordAtv
        });

        try {
            const response = await axios.post<TokenResponse>(idpUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            // Calcular tiempo de expiración (ms) y guardar en caché.
            // expires_in viene en segundos (usualmente 300 -> 5 minutos)
            const expiresInMs = response.data.expires_in * 1000;
            const expiresAt = Date.now() + expiresInMs;

            this.tokenCache.set(usuarioAtv, {
                token: response.data.access_token,
                expiresAt
            });

            return response.data.access_token;
        } catch (error: any) {
            console.error('Error al autenticar en Hacienda:', error?.response?.data || error.message);
            throw new Error('No se pudo obtener el token de Hacienda. Verifique credenciales ATV o estado del servicio.');
        }
    }
}
