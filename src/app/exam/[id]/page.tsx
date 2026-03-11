"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import LoadingModal from '@/components/LoadingModal';
import dynamic from 'next/dynamic';

import Editor from '@monaco-editor/react';

import { getSqlSchemaByIndex } from '@/lib/schemas';

const TerminalPanel = dynamic(
    () => import('@/components/TerminalPanel'),
    { ssr: false }
);

const cleanMarkdown = (md: string) => {
    let cleaned = md;

    // Remove the initial DEVEXAM_DOTMD frontmatter block
    cleaned = cleaned.replace(/# DEVEXAM_DOTMD[\s\S]*?---\n?/, '');

    // Remove metadata lines
    cleaned = cleaned.replace(/^(type|points|tags):.*\n?/gm, '');

    // Remove boilerplate headings
    cleaned = cleaned.replace(/^### VÁLASZ\n?/gm, '');
    cleaned = cleaned.replace(/^### ANSWER\n?/gm, '');
    cleaned = cleaned.replace(/^## VÉGE\n?/gm, '');
    cleaned = cleaned.replace(/^## END\n?/gm, '');

    // Make question titles nicer
    cleaned = cleaned.replace(/^## (\d+)\. KÉRDÉS\n?/gm, '### $1. Kérdés\n');
    cleaned = cleaned.replace(/^## QUESTION (\d+)\n?/gm, '### $1. Kérdés\n');

    // Remove '### FELADAT' / '### PROMPT'
    cleaned = cleaned.replace(/^### FELADAT\n?/gm, '');
    cleaned = cleaned.replace(/^### PROMPT\n?/gm, '');

    return cleaned.trim();
};

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const { id } = unwrappedParams;

    const [template, setTemplate] = useState<{ topic: string; difficulty: string; dotmd_content: string } | null>(null);
    const [parts, setParts] = useState<string[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch(`/api/tests/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    alert('Hiba történt a teszt betöltésekor: ' + data.error);
                    router.push('/');
                    return;
                }
                setTemplate(data);
                const segments = data.dotmd_content.split('<!-- USER_WRITES_HERE -->');
                const parsedParts: string[] = [segments[0]];
                const defaultAnswers: string[] = [];

                for (let i = 1; i < segments.length; i++) {
                    const segment = segments[i];
                    const separatorIndex = segment.indexOf('\n---');
                    let answer = "";
                    let nextPart = "";

                    if (separatorIndex !== -1) {
                        answer = segment.substring(0, separatorIndex).trim();
                        nextPart = segment.substring(separatorIndex);
                    } else {
                        answer = segment.trim();
                        nextPart = "";
                    }

                    // HEURISTIC: If the answer is short/empty but the PREVIOUS part contains
                    // boilerplate code (raw HTML, Java class, or SQL), move it to the answer.
                    const prevPartIndex = parsedParts.length - 1;
                    if (prevPartIndex >= 0) {
                        const prevPart = parsedParts[prevPartIndex];

                        // Try markdown code block first
                        const codeBlockRegex = /```(?:html|css|javascript|java|sql)?\s*\n([\s\S]*?)```\s*$/i;
                        const codeBlockMatch = prevPart.match(codeBlockRegex);

                        // Try raw HTML (<!DOCTYPE or <html)
                        const rawHtmlRegex = /(<!DOCTYPE[\s\S]*$|<html[\s\S]*$)/i;
                        const rawHtmlMatch = prevPart.match(rawHtmlRegex);

                        // Try raw Java (public class)
                        const rawJavaRegex = /(public\s+class\s+[\s\S]*$)/i;
                        const rawJavaMatch = prevPart.match(rawJavaRegex);

                        if (codeBlockMatch) {
                            // Combine: extracted code + whatever was in answer
                            const extracted = codeBlockMatch[1].trim();
                            answer = answer ? extracted + '\n' + answer : extracted;
                            parsedParts[prevPartIndex] = prevPart.substring(0, codeBlockMatch.index).trim();
                        } else if (rawHtmlMatch && rawHtmlMatch.index !== undefined) {
                            const extracted = rawHtmlMatch[1].trim();
                            answer = answer ? extracted + '\n' + answer : extracted;
                            parsedParts[prevPartIndex] = prevPart.substring(0, rawHtmlMatch.index).trim();
                        } else if (rawJavaMatch && rawJavaMatch.index !== undefined) {
                            const extracted = rawJavaMatch[1].trim();
                            answer = answer ? extracted + '\n' + answer : extracted;
                            parsedParts[prevPartIndex] = prevPart.substring(0, rawJavaMatch.index).trim();
                        }
                    }

                    defaultAnswers.push(answer);
                    parsedParts.push(nextPart);
                }

                setParts(parsedParts);

                // Try to load from localStorage first
                const savedAnswers = localStorage.getItem(`exam_answers_${id}`);
                if (savedAnswers) {
                    try {
                        setAnswers(JSON.parse(savedAnswers));
                    } catch (e) {
                        console.error('Failed to parse saved answers', e);
                        setAnswers(defaultAnswers);
                    }
                } else {
                    setAnswers(defaultAnswers);
                }

                setLoading(false);
            });
    }, [id, router]);

    // Save answers to localStorage whenever they change
    useEffect(() => {
        if (!loading && answers.length > 0) {
            localStorage.setItem(`exam_answers_${id}`, JSON.stringify(answers));
        }
    }, [answers, id, loading]);

    const handleSubmit = async () => {
        if (!confirm('Are you sure you want to submit?')) return;
        setSubmitting(true);

        const finalContent = parts.map((part, i) => {
            if (i < answers.length) {
                return part + '<!-- USER_WRITES_HERE -->\n' + answers[i] + '\n';
            }
            return part;
        }).join('');

        try {
            const res = await fetch(`/api/tests/${id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dotmd_filled: finalContent })
            });
            const data = await res.json();
            if (data.evaluation_id) {
                // Clear saved answers on successful submission
                localStorage.removeItem(`exam_answers_${id}`);
                router.push(`/results/${data.evaluation_id}`);
            } else {
                alert(data.error || 'Hiba történt az értékelés során.');
                setSubmitting(false);
            }
        } catch (e) {
            console.error(e);
            alert('Hálózati hiba történt.');
            setSubmitting(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
                <div className="animate-pulse font-medium">Vizsgamotor betöltése...</div>
            </div>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditorWillMount = (monaco: any) => {
        // Snippets for Java
        monaco.languages.registerCompletionItemProvider('java', {
            provideCompletionItems: () => ({
                suggestions: [
                    {
                        label: 'sout',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.println($1);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Prints to System.out'
                    },
                    {
                        label: 'psvm',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'public static void main(String[] args) {\n\t$0\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Main method declaration'
                    },
                    {
                        label: 'scan',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'Scanner sc = new Scanner(System.in);\n$0',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Initialize Scanner'
                    },
                    {
                        label: 'imp',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'import java.util.Scanner;\n',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Import Scanner'
                    }
                ]
            })
        });

        // Snippets for SQL
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: () => ({
                suggestions: [
                    {
                        label: 'sel',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'SELECT * FROM $1;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Select all from table'
                    }
                ]
            })
        });

        // Snippets for JS/HTML (Frontend)
        ['javascript', 'html', 'typescript'].forEach(lang => {
            monaco.languages.registerCompletionItemProvider(lang, {
                provideCompletionItems: () => ({
                    suggestions: [
                        {
                            label: 'clg',
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: 'console.log($1);',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Log to console'
                        }
                    ]
                })
            });
        });
    };

    const isComprehensive = template?.topic?.toUpperCase() === 'COMPREHENSIVE' || template?.topic?.toUpperCase() === 'GLASSDOOR';
    const isSQL = template?.topic?.toUpperCase() === 'SQL' || isComprehensive;
    let schemaContent: string | null = null;
    const renderParts = parts.map((part) => cleanMarkdown(part));

    // Parse sql_schema_index from DOTMD header
    const schemaIndexMatch = template?.dotmd_content?.match(/sql_schema_index:\s*(\d+)/);
    const sqlSchemaIndex = schemaIndexMatch ? parseInt(schemaIndexMatch[1], 10) : 0;

    // For COMPREHENSIVE and SQL: show schema sidebar from schema list
    if ((isSQL || isComprehensive) && sqlSchemaIndex > 0) {
        const schemaInfo = getSqlSchemaByIndex(sqlSchemaIndex);
        schemaContent = schemaInfo?.description || null;
    }

    // Clean renderParts[0] of any AI-generated schema/instructions to avoid duplication
    if (renderParts.length > 0) {
        const firstQuestionRegex = /(?:^|\n)(?:#{2,3}\s+\d+\.\s+(?:KÉRDÉS|Kérdés))/i;
        const match = renderParts[0].match(firstQuestionRegex);
        if (match && match.index !== undefined) {
            renderParts[0] = renderParts[0].substring(match.index).trim();
        }
    }

    // Helper: detect per-question topic in COMPREHENSIVE mode
    const getQuestionTopic = (partIndex: number): string => {
        if (!isComprehensive) return template?.topic?.toUpperCase() || '';
        // Walk backwards through parts to find the nearest section header
        for (let i = partIndex; i >= 0; i--) {
            const raw = parts[i];
            if (/═+\s*FRONTEND\s*SZEKCIÓ\s*═+/i.test(raw)) return 'FRONTEND';
            if (/═+\s*SQL\s*SZEKCIÓ\s*═+/i.test(raw)) return 'SQL';
            if (/═+\s*JAVA\s*SZEKCIÓ\s*═+/i.test(raw)) return 'JAVA';
        }
        return 'JAVA'; // default fallback
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
            <LoadingModal isOpen={submitting} text="Teszt értékelése folyamatban... Kérlek várj." />
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 px-6 text-center shadow-sm">
                <span className="text-sm font-bold text-slate-700 tracking-wider uppercase">
                    {template?.topic?.toUpperCase() === 'GLASSDOOR' ? '💀 Boss Fight' : isComprehensive ? 'Komplex Vizsga' : template?.topic} • {template?.topic === 'SQL' ? 'Junior' : template?.topic?.toUpperCase() === 'GLASSDOOR' ? '25 kérdés' : (template?.difficulty === 'EASY' ? 'Könnyű' : template?.difficulty === 'MEDIUM' ? 'Közepes' : 'Nehéz')}
                    {template?.topic?.toUpperCase() === 'GLASSDOOR' && ' • 120 perc'}
                    {isComprehensive && template?.topic?.toUpperCase() !== 'GLASSDOOR' && ' • 150 perc'}
                </span>
            </div>

            <main className="flex-1 w-full mx-auto p-6 pb-24 max-w-7xl">
                <div className={`flex flex-col ${schemaContent ? 'lg:flex-row gap-8' : ''}`}>

                    {schemaContent && (
                        <div className="lg:w-1/3 w-full flex-shrink-0 relative">
                            <div className="sticky top-24 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
                                <div className="p-6 prose prose-slate prose-sm max-w-none">
                                    <h3 className="text-lg font-bold mb-4 text-indigo-700 uppercase tracking-wider">Adatbázis Séma</h3>
                                    <ReactMarkdown>{schemaContent}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={schemaContent ? "lg:w-2/3 w-full space-y-8" : "max-w-4xl w-full mx-auto space-y-8"}>
                        {renderParts.map((cleaned, index) => {
                            if (index === renderParts.length - 1 && (!cleaned || cleaned === '---' || cleaned === '***')) return null;

                            // Per-question topic detection
                            const questionTopic = getQuestionTopic(index);
                            const qIsJava = questionTopic === 'JAVA';
                            const qIsSQL = questionTopic === 'SQL';
                            const qIsFrontend = questionTopic === 'FRONTEND';

                            return (
                                <div key={index} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
                                        <div className="p-6 prose prose-slate max-w-none">
                                            <ReactMarkdown>{cleaned}</ReactMarkdown>
                                        </div>
                                        {index < parts.length - 1 && (() => {
                                            const initialContent = answers[index] || "";
                                            const rawQuestion = parts[index];

                                            // Detect coding task: either via "type: CODE" metadata or existing boilerplate
                                            const isCodeType = /type:\s*CODE/i.test(rawQuestion);
                                            const hasExistingCode = initialContent.includes('<html') ||
                                                initialContent.includes('<!DOCTYPE') ||
                                                initialContent.includes('</html>') ||
                                                initialContent.includes('public class') ||
                                                initialContent.includes('class Main') ||
                                                initialContent.includes('SELECT') ||
                                                initialContent.includes('select');

                                            const isCoding = isCodeType || hasExistingCode;
                                            const hasPreview = qIsFrontend && isCoding;
                                            const hasRunner = (qIsJava || qIsSQL) && isCoding;

                                            // If it's a CODE task but answer is empty, inject empty boilerplate
                                            if (isCodeType && !initialContent.trim()) {
                                                let skeleton = '';
                                                if (qIsFrontend) {
                                                    skeleton = `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feladat</title>
    <style>
        /* ITT DOLGOZZ */
    </style>
</head>
<body>
    <!-- ITT DOLGOZZ -->

    <script>
        // ITT DOLGOZZ
    </script>
</body>
</html>`;
                                                } else if (qIsJava) {
                                                    skeleton = `public class Main {
    public static void main(String[] args) {
        // ITT DOLGOZZ
    }
}`;
                                                } else if (qIsSQL) {
                                                    skeleton = `SELECT `;
                                                }
                                                if (skeleton) {
                                                    const newAnswers = [...answers];
                                                    newAnswers[index] = skeleton;
                                                    // Use setTimeout to avoid state update during render
                                                    setTimeout(() => setAnswers(newAnswers), 0);
                                                }
                                            }

                                            return (
                                                <div className="bg-slate-50 border-t border-slate-200 p-6" data-color-mode="light">
                                                    <div className="mb-4">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Válaszod</label>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex flex-col border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white">
                                                            <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                                    {isCoding ? (qIsSQL ? 'SQL Query' : (qIsJava ? 'Java Source' : (qIsFrontend ? 'HTML/CSS/JS' : 'Code'))) : 'Sima válasz'}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-mono">{isCoding ? 'Monaco IDE' : 'Plain Text'}</span>
                                                            </div>
                                                            {isCoding ? (
                                                                <Editor
                                                                    height="350px"
                                                                    language={qIsSQL ? 'sql' : (qIsJava ? 'java' : (qIsFrontend ? 'html' : 'javascript'))}
                                                                    value={answers[index]}
                                                                    theme="vs-light"
                                                                    beforeMount={handleEditorWillMount}
                                                                    onChange={(value) => {
                                                                        const newAnswers = [...answers];
                                                                        newAnswers[index] = value || "";
                                                                        setAnswers(newAnswers);
                                                                    }}
                                                                    options={{
                                                                        minimap: { enabled: false },
                                                                        fontSize: 13,
                                                                        lineNumbers: 'on',
                                                                        roundedSelection: true,
                                                                        scrollBeyondLastLine: false,
                                                                        readOnly: false,
                                                                        automaticLayout: true,
                                                                        padding: { top: 10, bottom: 10 },
                                                                        suggestOnTriggerCharacters: true,
                                                                        wordWrap: 'on'
                                                                    }}
                                                                />
                                                            ) : (
                                                                <textarea
                                                                    value={answers[index]}
                                                                    onChange={(e) => {
                                                                        const newAnswers = [...answers];
                                                                        newAnswers[index] = e.target.value;
                                                                        setAnswers(newAnswers);
                                                                    }}
                                                                    placeholder="Írd ide a válaszod..."
                                                                    className="w-full p-4 min-h-[200px] outline-none text-sm font-sans text-slate-700 resize-y"
                                                                />
                                                            )}
                                                        </div>

                                                        {hasPreview && (

                                                            <div className="flex flex-col border border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner min-h-[350px]">
                                                                <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center flex justify-between items-center">
                                                                    <span>Élő előnézet (Preview)</span>
                                                                    <div className="flex gap-1.5">
                                                                        <span className="w-2 h-2 rounded-full bg-red-400" />
                                                                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                                                        <span className="w-2 h-2 rounded-full bg-green-400" />
                                                                    </div>
                                                                </div>
                                                                <iframe
                                                                    srcDoc={answers[index]}
                                                                    className="flex-1 w-full h-full border-0 bg-white"
                                                                    sandbox="allow-scripts allow-modals allow-popups allow-forms"
                                                                    title={`preview-${index}`}
                                                                />
                                                            </div>
                                                        )}

                                                        {hasRunner && (
                                                            <TerminalPanel
                                                                language={questionTopic.toLowerCase()}
                                                                code={answers[index]}
                                                                sql_schema_index={sqlSchemaIndex}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}

                        <div className="flex justify-center pt-4 pb-12">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none text-lg w-full sm:w-auto cursor-pointer"
                            >
                                Vizsga beküldése
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
