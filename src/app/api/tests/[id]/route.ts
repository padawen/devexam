import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const testTemplate = await prisma.testTemplate.findUnique({
            where: { id },
        });

        if (!testTemplate) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        return NextResponse.json(testTemplate);
    } catch (error) {
        console.error('Error fetching test:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Manual cascade deletion because schema might not have it set
        // 1. Find all submissions for this test
        const submissions = await prisma.submission.findMany({
            where: { testTemplateId: id },
            select: { id: true }
        });

        const submissionIds = submissions.map((s: { id: string }) => s.id);

        // 2. Find all evaluations for these submissions
        const evaluations = await prisma.evaluation.findMany({
            where: { submissionId: { in: submissionIds } },
            select: { id: true }
        });

        const evaluationIds = evaluations.map((e: { id: string }) => e.id);

        // 3. Delete in order
        await prisma.discussionHistory.deleteMany({
            where: { evaluationId: { in: evaluationIds } }
        });

        await prisma.evaluation.deleteMany({
            where: { submissionId: { in: submissionIds } }
        });

        await prisma.submission.deleteMany({
            where: { testTemplateId: id }
        });

        await prisma.testTemplate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting test:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
