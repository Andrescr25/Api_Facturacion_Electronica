import 'dotenv/config';
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = ''; // Disable explicit JSON to avoid parsing errors in tests
import request from 'supertest';
import app from '../../src/app';

describe('Health Check Endpoint (/health)', () => {
    it('should return 200 OK and database connected status', async () => {
        const response = await request(app).get('/health');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('db', 'connected');
    });
});

import prisma, { pool } from '../../src/utils/prismaClient';

afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
});
