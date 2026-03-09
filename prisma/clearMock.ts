import prisma from '../src/utils/prismaClient';

async function main() {
    await prisma.emisorCredenciales.update({
        where: { id: 'tu-emisor-id' },
        data: {
            nombre: '',
            identificacion: '',
            usuarioAtv: '',
            passwordAtv: '',
        }
    });
    console.log("Mock data cleared");
}
main().catch(console.error).finally(() => prisma.$disconnect());
