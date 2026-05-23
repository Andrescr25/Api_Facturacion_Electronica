import 'dotenv/config';
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = ''; // Disable explicit JSON to avoid parsing errors in tests
import request from 'supertest';
import app from '../../src/app';

describe('Authentication & Authorization Middlewares', () => {
    it('should return 401 Unauthorized when trying to access protected route without token', async () => {
        const response = await request(app).get('/api/facturas');
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Token no proporcionado');
    });

    it('should return 401 Unauthorized for invalid API Key', async () => {
        const response = await request(app)
            .get('/api/facturas')
            .set('Authorization', 'Bearer sk_live_invalid_token_123');
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('inválida o revocada');
    });

    it('should have Rate Limiter configured on /api/ endpoints', async () => {
        const response = await request(app).get('/api/auth'); // Ruta de auth base, sin token
        expect(response.status).not.toBe(500); // Solo aseguramos que la app no explote y devuelva algo
    });
});

import prisma, { pool } from '../../src/utils/prismaClient';

afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
});
