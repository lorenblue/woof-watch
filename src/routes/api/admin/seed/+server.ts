import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

export async function POST() {
    const dogs = [
        { id: 'dog1', name: 'George' },
        { id: 'dog2', name: 'Luna' }
    ];

    const actors = [
        { name: 'Lorenzo', code: 'ABC123' },
        { name: 'Ella', code: 'DEF456' }
    ];

    for (const d of dogs) {
        await prisma.dog.upsert({ where: { id: d.id }, update: { name: d.name }, create: d });
    }

    for (const a of actors) {
        await prisma.actor.upsert({ where: { name: a.name }, update: { code: a.code }, create: a });
    }

    return json({ ok: true, dogs, actors });
}