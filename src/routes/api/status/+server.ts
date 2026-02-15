import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

function mapEvt(e: any) {
    return e ? { at: e.occurredAt.toISOString(), by: e.actor.name } : null;
}
export async function GET() {
    const dogs = await prisma.dog.findMany({ orderBy: { name: 'asc' } });

    const result = [];
    for (const dog of dogs) {
        const [pee, poo, eat] = await Promise.all([
            prisma.dogEvent.findFirst({ where: { dogId: dog.id, actionType: 'pee', undoneAt: null }, orderBy: { occurredAt: 'desc' }, include: { actor: true } }),
            prisma.dogEvent.findFirst({ where: { dogId: dog.id, actionType: 'poo', undoneAt: null }, orderBy: { occurredAt: 'desc' }, include: { actor: true } }),
            prisma.dogEvent.findFirst({ where: { dogId: dog.id, actionType: 'eat', undoneAt: null }, orderBy: { occurredAt: 'desc' }, include: { actor: true } })
        ]);

        const lastPee = mapEvt(pee);
        const lastPoo = mapEvt(poo);
        const lastEat = mapEvt(eat);

        result.push({
            dogId: dog.id,
            name: dog.name,
            lastPee,
            lastPoo,
            lastEat,
        });
    }

    return json({ dogs: result });
}