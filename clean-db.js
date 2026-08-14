require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./app/lib/db.js');

async function main() {
    console.log('Apagando todos os eventos da Cabreira...');
    const result = await prisma.event.deleteMany({
        where: {
            source: 'Cabreira'
        }
    });
    console.log(`Foram apagados ${result.count} eventos da base de dados.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
