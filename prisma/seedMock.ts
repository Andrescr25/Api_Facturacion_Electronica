import prisma from '../src/utils/prismaClient';

async function main() {
    const defaultEmisorId = "tu-emisor-id";

    let emisor = await prisma.emisorCredenciales.findUnique({
        where: { id: defaultEmisorId }
    });

    if (!emisor) {
        console.log("Creando emisor por defecto para pruebas...");
        emisor = await prisma.emisorCredenciales.create({
            data: {
                id: defaultEmisorId,
                identificacion: "",
                nombre: "",
                usuarioAtv: "",
                passwordAtv: "",
                pinCertificado: ""
            }
        });
        console.log("Emisor creado exitosamente.");
    } else {
        console.log("El emisor por defecto ya existe.");
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
