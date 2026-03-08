import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const tests = await prisma.testTemplate.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                submissions: {
                    include: {
                        evaluations: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        const mappedTests = tests.map((test: {
            id: string;
            topic: string;
            difficulty: string | null;
            createdAt: Date;
            submissions: {
                passed: boolean;
                evaluations: { id: string; total_score: number; max_score: number }[];
            }[];
        }) => {
            const latestSub = test.submissions[0];
            const evaluation = latestSub?.evaluations[0];

            return {
                id: test.id,
                topic: test.topic,
                difficulty: test.difficulty,
                createdAt: test.createdAt,
                status: latestSub ? (latestSub.passed ? 'PASSED' : 'FAILED') : 'NOT_STARTED',
                score: evaluation ? `${evaluation.total_score}/${evaluation.max_score}` : null,
                evaluationId: evaluation?.id || null,
            };
        });

        return NextResponse.json(mappedTests);

    } catch (e) {
        console.error('Error fetching dashboard tests:', e);
        return NextResponse.json({ error: 'Failed to load tests' }, { status: 500 });
    }
}
