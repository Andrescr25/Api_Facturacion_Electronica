import admin from 'firebase-admin';

// Verifica si VITE_FIREBASE_PROJECT_ID u otra forma de inicialización existe
// En plataformas serverless/Render sin credenciales de Service Account quemadas, 
// podemos inicializar Firebase Admin con las Application Default Credentials
// o simplemente usando projectId.
if (!admin.apps.length) {
    admin.initializeApp({
        // Recomendación: Al subir a Render, se deben pasar los secretos por variables de entorno
        // o usar la configuración predeterminada si el proyecto es público, pero
        // para la verificación de tokens, el projectId es lo más importante.
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'facturacion-electronica-api',
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'facturacion-electronica-api.firebasestorage.app'
    });
}

export default admin;
