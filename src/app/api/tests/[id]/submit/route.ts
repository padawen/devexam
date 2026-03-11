import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { EVALUATE_TEST_SYSTEM_PROMPT } from '@/lib/prompts';

interface EvaluationResult {
    question_number: number;
    score: number;
    max_score: number;
    status: string;
    feedback: string;
}

// Helper: split a comprehensive DOTMD into 3 sections based on section headers
function splitComprehensiveSections(dotmd: string): { java: string; sql: string; frontend: string } {
    const javaMatch = dotmd.indexOf('═══ JAVA SZEKCIÓ ═══');
    const sqlMatch = dotmd.indexOf('═══ SQL SZEKCIÓ ═══');
    const frontendMatch = dotmd.indexOf('═══ FRONTEND SZEKCIÓ ═══');
    const endMatch = dotmd.indexOf('## VÉGE');

    let java = '', sql = '', frontend = '';

    if (javaMatch !== -1 && sqlMatch !== -1) {
        java = dotmd.substring(javaMatch, sqlMatch);
    }
    if (sqlMatch !== -1 && frontendMatch !== -1) {
        sql = dotmd.substring(sqlMatch, frontendMatch);
    }
    if (frontendMatch !== -1) {
        frontend = dotmd.substring(frontendMatch, endMatch !== -1 ? endMatch : undefined);
    }

    return { java, sql, frontend };
}

// Helper: evaluate a single section
async function evaluateSection(
    sectionContent: string,
    topic: string,
    difficulty: string,
    submissionId: string,
    questionOffset: number
): Promise<{ evaluations: EvaluationResult[]; rawMarkdown: string }> {
    const prompt = EVALUATE_TEST_SYSTEM_PROMPT
        .replace(/{{TOPIC}}/g, topic)
        .replace(/{{DIFFICULTY}}/g, difficulty)
        .replace(/{{SUBMISSION_ID}}/g, submissionId)
        .replace(/{{FILLED_DOTMD}}/g, sectionContent);

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are a strict technical examiner. You strictly output JSON with an array of evaluation objects for each question.' },
            { role: 'user', content: prompt }
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'test_evaluation',
                schema: {
                    type: 'object',
                    properties: {
                        evaluations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    question_number: { type: 'number' },
                                    score: { type: 'number', description: 'Score given for this question' },
                                    max_score: { type: 'number', description: 'Maximum possible score for this question' },
                                    status: { type: 'string', enum: ['PASS', 'FAIL', 'PARTIAL'] },
                                    feedback: { type: 'string', description: 'Concise feedback on the answer' }
                                },
                                required: ['question_number', 'score', 'max_score', 'status', 'feedback'],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ['evaluations'],
                    additionalProperties: false
                },
                strict: true
            }
        },
        max_tokens: 2500,
        temperature: 0.2,
    });

    const jsonStr = response.choices[0].message.content || '{"evaluations":[]}';
    let parsedEvals: EvaluationResult[] = [];
    try {
        parsedEvals = JSON.parse(jsonStr).evaluations || [];
    } catch (e) {
        console.error(`Failed to parse ${topic} evaluation JSON`, e);
    }

    // Re-map question numbers to global numbering
    let sectionMarkdown = '';
    parsedEvals.forEach((ev, idx) => {
        const globalNum = questionOffset + idx + 1;
        ev.question_number = globalNum;

        sectionMarkdown += `## ${globalNum}. Kérdés Értékelése\n`;
        sectionMarkdown += `**Pontszám:** ${ev.score}/${ev.max_score}\n`;
        sectionMarkdown += `**Státusz:** ${ev.status}\n`;
        sectionMarkdown += `**Visszajelzés:** ${ev.feedback}\n\n`;
    });

    return { evaluations: parsedEvals, rawMarkdown: sectionMarkdown };
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { dotmd_filled } = body;

        if (!dotmd_filled) {
            return NextResponse.json({ error: 'Missing submission content' }, { status: 400 });
        }

        // 1. Fetch original test template to verify and get context
        const testTemplate = await prisma.testTemplate.findUnique({
            where: { id },
        });

        if (!testTemplate) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        // 2. Save submission
        const submission = await prisma.submission.create({
            data: {
                testTemplateId: id,
                dotmd_filled,
            }
        });

        const isComprehensive = testTemplate.topic.toUpperCase() === 'COMPREHENSIVE' || testTemplate.topic.toUpperCase() === 'GLASSDOOR';

        let totalScore = 0;
        let maxScore = 0;
        let evalMarkdown = `---\nformat: EVAL_REPORT v1.0\nsubmission_id: ${submission.id}\n---\n\n`;

        if (isComprehensive) {
            // ─── COMPREHENSIVE: 3-stage evaluation ───
            console.log('[COMPREHENSIVE EVAL] Starting 3-stage evaluation...');

            const sections = splitComprehensiveSections(dotmd_filled);

            // Stage 1: Java
            console.log('[COMPREHENSIVE EVAL] Stage 1/3: Java...');
            const javaResult = await evaluateSection(
                sections.java, 'JAVA', testTemplate.difficulty, submission.id, 0
            );

            // Stage 2: SQL
            console.log('[COMPREHENSIVE EVAL] Stage 2/3: SQL...');
            const sqlResult = await evaluateSection(
                sections.sql, 'SQL', testTemplate.difficulty, submission.id, javaResult.evaluations.length
            );

            // Stage 3: Frontend
            console.log('[COMPREHENSIVE EVAL] Stage 3/3: Frontend...');
            const frontendResult = await evaluateSection(
                sections.frontend, 'FRONTEND', testTemplate.difficulty, submission.id,
                javaResult.evaluations.length + sqlResult.evaluations.length
            );

            // Merge results
            const allEvals = [
                ...javaResult.evaluations,
                ...sqlResult.evaluations,
                ...frontendResult.evaluations
            ];

            allEvals.forEach(ev => {
                totalScore += ev.score;
                maxScore += ev.max_score;
            });

            evalMarkdown += `## ═══ JAVA SZEKCIÓ ═══\n\n`;
            evalMarkdown += javaResult.rawMarkdown;
            evalMarkdown += `## ═══ SQL SZEKCIÓ ═══\n\n`;
            evalMarkdown += sqlResult.rawMarkdown;
            evalMarkdown += `## ═══ FRONTEND SZEKCIÓ ═══\n\n`;
            evalMarkdown += frontendResult.rawMarkdown;

            console.log('[COMPREHENSIVE EVAL] Done! Total:', totalScore, '/', maxScore);

        } else {
            // ─── SINGLE TOPIC: normal evaluation ───
            const prompt = EVALUATE_TEST_SYSTEM_PROMPT
                .replace(/{{TOPIC}}/g, testTemplate.topic)
                .replace(/{{DIFFICULTY}}/g, testTemplate.difficulty)
                .replace(/{{SUBMISSION_ID}}/g, submission.id)
                .replace(/{{FILLED_DOTMD}}/g, dotmd_filled);

            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are a strict technical examiner. You strictly output JSON with an array of evaluation objects for each question.' },
                    { role: 'user', content: prompt }
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'test_evaluation',
                        schema: {
                            type: 'object',
                            properties: {
                                evaluations: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            question_number: { type: 'number' },
                                            score: { type: 'number', description: 'Score given for this question' },
                                            max_score: { type: 'number', description: 'Maximum possible score for this question' },
                                            status: { type: 'string', enum: ['PASS', 'FAIL', 'PARTIAL'] },
                                            feedback: { type: 'string', description: 'Concise feedback on the answer' }
                                        },
                                        required: ['question_number', 'score', 'max_score', 'status', 'feedback'],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ['evaluations'],
                            additionalProperties: false
                        },
                        strict: true
                    }
                },
                max_tokens: 2500,
                temperature: 0.2,
            });

            const jsonStr = response.choices[0].message.content || '{"evaluations":[]}';
            let parsedEvals: EvaluationResult[] = [];
            try {
                parsedEvals = JSON.parse(jsonStr).evaluations || [];
            } catch (e) {
                console.error('Failed to parse evaluation JSON', e);
            }

            parsedEvals.forEach((ev) => {
                totalScore += ev.score;
                maxScore += ev.max_score;

                evalMarkdown += `## ${ev.question_number}. Kérdés Értékelése\n`;
                evalMarkdown += `**Pontszám:** ${ev.score}/${ev.max_score}\n`;
                evalMarkdown += `**Státusz:** ${ev.status}\n`;
                evalMarkdown += `**Visszajelzés:** ${ev.feedback}\n\n`;
            });
        }

        evalMarkdown = evalMarkdown.trim();

        const passedMetric = totalScore >= (maxScore * 0.5);

        // Save evaluation
        const evaluation = await prisma.evaluation.create({
            data: {
                submissionId: submission.id,
                eval_md: evalMarkdown,
                total_score: totalScore,
                max_score: maxScore,
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: { passed: passedMetric }
        });

        return NextResponse.json({
            evaluation_id: evaluation.id,
            total_score: totalScore,
            max_score: maxScore,
            passed: passedMetric
        });
    } catch (error) {
        console.error('Error submitting test:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
