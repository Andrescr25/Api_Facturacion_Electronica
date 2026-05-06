/**
 * Script de migración one-time: cifra los campos passwordAtv y pinCertificado
 * de todos los emisores que los tienen en texto plano.
 *
 * Ejecutar UNA SOLA VEZ después de configurar ENCRYPTION_KEY:
 *   npx ts-node prisma/migrateEncrypt.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { encrypt, isEncrypted } from '../src/utils/encryptionService';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🔐 Iniciando migración de cifrado de credenciales...');

    const emisores = await prisma.emisorCredenciales.findMany();
    let cifrados = 0;
    let omitidos = 0;

    for (const emisor of emisores) {
        const updates: Record<string, string> = {};

        if (emisor.passwordAtv && !isEncrypted(emisor.passwordAtv)) {
            updates.passwordAtv = encrypt(emisor.passwordAtv);
        }
        if (emisor.pinCertificado && !isEncrypted(emisor.pinCertificado)) {
            updates.pinCertificado = encrypt(emisor.pinCertificado);
        }

        if (Object.keys(updates).length > 0) {
            await prisma.emisorCredenciales.update({
                where: { id: emisor.id },
                data: updates
            });
            console.log(`  ✅ Emisor ${emisor.id} (${emisor.nombre}) → credenciales cifradas`);
            cifrados++;
        } else {
            omitidos++;
        }
    }

    console.log(`\n✅ Migración completada: ${cifrados} emisores cifrados, ${omitidos} ya estaban cifrados o sin credenciales.`);
    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error('❌ Error en la migración:', e);
    process.exit(1);
});
