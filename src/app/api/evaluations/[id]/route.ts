import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const evaluation = await prisma.evaluation.findUnique({
            where: { id },
            include: {
                submission: {
                    include: {
                        testTemplate: true
                    }
                }
            }
        });

        if (!evaluation) {
            return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
        }

        return NextResponse.json(evaluation);
    } catch (error) {
        console.error('Error fetching evaluation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
