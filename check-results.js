require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./app/lib/db.js');

prisma.event.findMany({ 
    where: { source: 'Cabreira' }, 
    select: { id: true, title: true, description: true, prices: true, insurance: true, prizes: true, programa: true } 
})
.then(events => {
    events.forEach(e => {
        console.log('--- ' + e.title);
        console.log('  desc:', e.description ? e.description.length + ' chars' : 'NULL');
        console.log('  prices:', e.prices ? e.prices.length + ' chars' : 'NULL');
        console.log('  insurance:', e.insurance ? e.insurance.length + ' chars' : 'NULL');
        console.log('  prizes:', e.prizes ? e.prizes.length + ' chars' : 'NULL');
        console.log('  programa:', e.programa ? e.programa.length + ' chars' : 'NULL');
    });
    console.log('\nTotal eventos:', events.length);
    prisma.$disconnect();
})
.catch(e => { console.error(e); prisma.$disconnect(); });
