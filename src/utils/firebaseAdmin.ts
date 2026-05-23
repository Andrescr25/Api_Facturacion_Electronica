import admin from 'firebase-admin';

/**
 * Inicialización de Firebase Admin SDK.
 *
 * Soporta dos modos:
 * 1. PRODUCCIÓN (Render/Railway): usar FIREBASE_SERVICE_ACCOUNT_JSON con el JSON
 *    completo del Service Account descargado desde Firebase Console.
 * 2. DESARROLLO LOCAL: usar Application Default Credentials (ADC) configuradas
 *    con `gcloud auth application-default login`, o pasar FIREBASE_PROJECT_ID.
 *
 * IMPORTANTE: El prefijo VITE_ es del bundler frontend — no usar para variables del backend.
 */
if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'facturacion-electronica-api.firebasestorage.app';

    if (serviceAccountJson) {
        // Modo producción: Service Account explícito
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            
            // Reemplazar '\\n' con saltos de línea reales para evitar errores de parseo PEM en entornos como Render
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket
            });
            console.log('✅ Firebase Admin inicializado con Service Account.');
        } catch (e) {
            console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido:', e);
            throw new Error('Configuración de Firebase Admin inválida.');
        }
    } else {
        // Modo desarrollo: Application Default Credentials (ADC)
        const projectId = process.env.FIREBASE_PROJECT_ID || 'facturacion-electronica-api';
        admin.initializeApp({
            projectId,
            storageBucket
        });
        console.warn(
            '⚠️  Firebase Admin inicializado con ADC (modo desarrollo). ' +
            'Configura FIREBASE_SERVICE_ACCOUNT_JSON para producción.'
        );
    }
}

export default admin;
