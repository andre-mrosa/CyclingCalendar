const { PrismaClient } = require('./node_modules/@prisma/client');
const db = new PrismaClient();
db.event.findMany({ where: { source: 'Cabreira' }, select: { title: true, programa: true, description: true, prices: true, insurance: true, prizes: true } })
  .then(events => {
    events.forEach(e => {
      console.log('--- ' + e.title);
      console.log('  desc:', (e.description || '').length, 'chars');
      console.log('  prices:', (e.prices || '').length, 'chars');
      console.log('  insurance:', (e.insurance || '').length, 'chars');
      console.log('  prizes:', (e.prizes || '').length, 'chars');
      console.log('  programa:', (e.programa || '').length, 'chars');
    });
  })
  .finally(() => db.$disconnect());
