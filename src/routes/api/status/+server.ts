import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

function mapEvt(e: any) {
    return e ? { at: e.occurredAt.toISOString(), by: e.actor.name } : null;
}
function maxOut(pee: any, poo: any) {
    if (!pee) return poo ? { ...poo, type: 'poo' } : null;
    if (!poo) return pee ? { ...pee, type: 'pee' } : null;
    return new Date(pee.at).getTime() >= new Date(poo.at).getTime()
        ? { ...pee, type: 'pee' }
        : { ...poo, type: 'poo' };
}

export async function GET() {
    const dogs = await prisma.dog.findMany({ orderBy: { name: 'asc' } });

    const result = [];
    for (const dog of dogs) {
        const [p, po, e] = await Promise.all([
            prisma.dogEvent.findFirst({ where: { dogId: dog.id, actionType: 'pee', undoneAt: null }, orderBy: { occurredAt: 'desc' }, include: { actor: true } }),
            prisma.dogEvent.findFirst({ where: { dogId: dog.id, actionType: 'poo', undoneAt: null }, orderBy: { occurredAt: 'desc' }, include: { actor: true } }),
            prisma.dogEvent.findFirst({ where: { dogId: dog.id, actionType: 'eat', undoneAt: null }, orderBy: { occurredAt: 'desc' }, include: { actor: true } })
        ]);

        const lastPee = mapEvt(p);
        const lastPoo = mapEvt(po);
        const lastEat = mapEvt(e);

        result.push({
            dogId: dog.id,
            name: dog.name,
            lastPee,
            lastPoo,
            lastEat,
            lastOut: maxOut(lastPee, lastPoo)
        });
    }

    return json({ dogs: result });
}