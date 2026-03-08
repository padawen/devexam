import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { GENERATE_TEST_SYSTEM_PROMPT } from '@/lib/prompts';
import { getRandomSqlSchema } from '@/lib/schemas';
import crypto from 'crypto';

// Helper: generate one topic section via OpenAI
async function generateSection(
    topic: string,
    difficulty: string,
    questionCount: number,
    theoryCount: number,
    codeCount: number,
    testId: string,
    sqlSchema: string
): Promise<string> {
    const prompt = GENERATE_TEST_SYSTEM_PROMPT
        .replace(/{{TOPIC}}/g, topic)
        .replace(/{{DIFFICULTY}}/g, difficulty)
        .replace(/{{TEST_ID}}/g, testId)
        .replace(/{{SQL_SCHEMA_REPLACEMENT}}/g, sqlSchema)
        // Override the default 10-question / 4-6 split
        .replace(
            /Szigorúan pontosan 10 kérdést generálj!.*$/m,
            `Szigorúan pontosan ${questionCount} kérdést generálj! KÖTELEZŐ eloszlás: pontosan ${theoryCount} elméleti kérdés (jelölés: "type: TEXT") ÉS pontosan ${codeCount} gyakorlati, kódolós feladat (jelölés: "type: CODE").`
        )
        .replace(
            /FONTOS:.*$/m,
            `FONTOS: A tesztben PONTOSAN ${theoryCount} elméleti (TEXT) és PONTOSAN ${codeCount} gyakorlati (CODE) feladatnak kell lennie!`
        );

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You strictly output JSON. Provide the DOTMD content.' },
            { role: 'user', content: prompt }
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'test_generation',
                schema: {
                    type: 'object',
                    properties: {
                        dotmd_content: { type: 'string', description: 'The fully generated test in DOTMD v1.0 markdown format' }
                    },
                    required: ['dotmd_content'],
                    additionalProperties: false
                },
                strict: true
            }
        },
        max_tokens: 2500,
        temperature: 0.7,
    });

    const jsonStr = response.choices[0].message.content || '{}';
    let md = '';
    try {
        md = JSON.parse(jsonStr).dotmd_content;
    } catch (e) {
        console.error(`Failed to parse ${topic} generation:`, e);
        md = `## HIBA - ${topic} generálás sikertelen`;
    }
    // Strip markdown code block backticks if AI hallucinates them
    md = md.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    return md;
}

// Helper: extract question blocks from generated markdown
function extractQuestions(md: string): string[] {
    // Split by --- separators, find blocks starting with ## N. KÉRDÉS
    const blocks = md.split(/\n---\n/);
    return blocks.filter(b => /^##\s+\d+\.\s+KÉRDÉS/m.test(b));
}

// Helper: merge question blocks into a unified DOTMD
function mergeIntoComprehensiveTest(
    javaMd: string,
    sqlMd: string,
    frontendMd: string,
    testId: string,
    difficulty: string,
    sqlSchema: string,
    sqlSchemaIndex: number
): string {
    const javaQuestions = extractQuestions(javaMd);
    const sqlQuestions = extractQuestions(sqlMd);
    const frontendQuestions = extractQuestions(frontendMd);

    // Re-number all questions sequentially
    let questionNumber = 1;
    const renumber = (block: string): string => {
        const renumbered = block.replace(
            /^##\s+\d+\.\s+KÉRDÉS/m,
            `## ${questionNumber}. KÉRDÉS`
        );
        questionNumber++;
        return renumbered;
    };

    const allQuestions = [
        '\n## ═══ JAVA SZEKCIÓ ═══\n',
        ...javaQuestions.map(renumber),
        '\n## ═══ SQL SZEKCIÓ ═══\n',
        ...sqlQuestions.map(renumber),
        '\n## ═══ FRONTEND SZEKCIÓ ═══\n',
        ...frontendQuestions.map(renumber),
    ];

    const header = `# DEVEXAM_DOTMD
version: 1.0
topic: COMPREHENSIVE
difficulty: ${difficulty}
sql_schema_index: ${sqlSchemaIndex}
duration_minutes: 150
test_id: ${testId}
rubric_version: 1.0
---

## INSTRUKCIÓK
- Időkorlát: 150 perc
- Válaszolj közvetlenül a fájlban
- Adj meg egyértelmű és tömör megoldásokat
- A teszt 3 szekciót tartalmaz: Java, SQL és Frontend

${sqlSchema ? `## ADATBÁZIS SÉMA (SQL feladatokhoz)\n${sqlSchema}\n` : ''}
---`;

    return header + '\n' + allQuestions.join('\n---\n') + '\n---\n\n## VÉGE\n';
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { topic, difficulty } = body;

        if (!topic || !difficulty) {
            return NextResponse.json({ error: 'Missing topic or difficulty' }, { status: 400 });
        }

        // 1. Generate prompt hash to check cache
        const promptString = `${topic}-${difficulty}`;
        const promptHash = crypto.createHash('sha256').update(promptString).digest('hex');

        // 2. Check if we already have a generated test with this hash without submissions
        const cachedTest = await prisma.testTemplate.findFirst({
            where: {
                prompt_hash: promptHash,
                submissions: { none: {} }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (cachedTest) {
            return NextResponse.json({
                id: cachedTest.id,
                topic: cachedTest.topic,
                difficulty: cachedTest.difficulty,
                dotmd_content: cachedTest.dotmd_content,
                cached: true
            });
        }

        const uuid = crypto.randomUUID();

        // ─── COMPREHENSIVE: 3-stage generation ───
        if (topic.toUpperCase() === 'COMPREHENSIVE') {
            const sqlSchemaInfo = getRandomSqlSchema();
            const sqlSchema = sqlSchemaInfo.description;

            console.log(`[COMPREHENSIVE] Starting 3-stage generation... (SQL DB: ${sqlSchemaInfo.name})`);

            // Stage 1: Java (8 questions: 4 theory, 4 code)
            console.log('[COMPREHENSIVE] Stage 1/3: Java...');
            const javaMd = await generateSection('JAVA', difficulty, 8, 4, 4, uuid, '');

            // Stage 2: SQL (8 questions: 4 theory, 4 code)
            console.log('[COMPREHENSIVE] Stage 2/3: SQL...');
            const sqlMd = await generateSection('SQL', 'JUNIOR', 8, 4, 4, uuid, sqlSchema);

            // Stage 3: Frontend (8 questions: 4 theory, 4 code)
            console.log('[COMPREHENSIVE] Stage 3/3: Frontend...');
            const frontendMd = await generateSection('FRONTEND', difficulty, 8, 4, 4, uuid, '');

            console.log('[COMPREHENSIVE] Merging results...');
            const mergedMarkdown = mergeIntoComprehensiveTest(
                javaMd, sqlMd, frontendMd, uuid, difficulty, sqlSchema, sqlSchemaInfo.index
            );

            // Save to database
            const newTest = await prisma.testTemplate.create({
                data: {
                    id: uuid,
                    topic: 'COMPREHENSIVE',
                    difficulty,
                    dotmd_content: mergedMarkdown,
                    prompt_hash: promptHash,
                }
            });

            console.log('[COMPREHENSIVE] Done! Test ID:', newTest.id);

            return NextResponse.json({
                id: newTest.id,
                topic: newTest.topic,
                difficulty: newTest.difficulty,
                dotmd_content: newTest.dotmd_content,
                cached: false
            });
        }

        // ─── SINGLE TOPIC: normal generation ───
        let sqlSchema = '';
        let sqlSchemaIndex = 0;
        if (topic.toUpperCase() === 'SQL') {
            const sqlSchemaInfo = getRandomSqlSchema();
            sqlSchema = sqlSchemaInfo.description;
            sqlSchemaIndex = sqlSchemaInfo.index;
            console.log(`[SQL] Using DB schema: ${sqlSchemaInfo.name} (index: ${sqlSchemaIndex})`);
        }

        const prompt = GENERATE_TEST_SYSTEM_PROMPT
            .replace(/{{TOPIC}}/g, topic)
            .replace(/{{DIFFICULTY}}/g, difficulty)
            .replace(/{{TEST_ID}}/g, uuid)
            .replace(/{{SQL_SCHEMA_REPLACEMENT}}/g, sqlSchema);

        // 4. Call OpenAI gpt-4o-mini for efficient generation using Structured Outputs
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You strictly output JSON. Provide the DOTMD content.' },
                { role: 'user', content: prompt }
            ],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'test_generation',
                    schema: {
                        type: 'object',
                        properties: {
                            dotmd_content: { type: 'string', description: 'The fully generated test in DOTMD v1.0 markdown format' }
                        },
                        required: ['dotmd_content'],
                        additionalProperties: false
                    },
                    strict: true
                }
            },
            max_tokens: 2500,
            temperature: 0.7,
        });

        const jsonStr = response.choices[0].message.content || '{}';
        let generatedMarkdown = '';
        try {
            generatedMarkdown = JSON.parse(jsonStr).dotmd_content;
        } catch (e) {
            console.error('Failed to parse json generation:', e);
            generatedMarkdown = 'Parse Error';
        }

        // Strip markdown code block backticks if AI hallucinates them inside the JSON string
        generatedMarkdown = generatedMarkdown.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');

        // Inject sql_schema_index into DOTMD header for SQL tests
        if (topic.toUpperCase() === 'SQL' && sqlSchemaIndex > 0) {
            generatedMarkdown = generatedMarkdown.replace(
                /^(# DEVEXAM_DOTMD\n)/m,
                `$1sql_schema_index: ${sqlSchemaIndex}\n`
            );
        }

        // 5. Save to database
        const newTest = await prisma.testTemplate.create({
            data: {
                id: uuid,
                topic,
                difficulty,
                dotmd_content: generatedMarkdown,
                prompt_hash: promptHash,
            }
        });

        return NextResponse.json({
            id: newTest.id,
            topic: newTest.topic,
            difficulty: newTest.difficulty,
            dotmd_content: newTest.dotmd_content,
            cached: false
        });
    } catch (error) {
        console.error('Error generating test:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
