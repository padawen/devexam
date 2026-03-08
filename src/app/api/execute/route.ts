import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export async function POST(req: Request) {
    const runId = uuidv4();
    const tempDir = path.join('/tmp', `runner-${runId}`);

    try {
        const { language, code, stdin = '' } = await req.json();

        if (!language || !code) {
            return NextResponse.json({ error: 'Language and code are required' }, { status: 400 });
        }

        const lang = language.toLowerCase();

        // Ensure temp directory exists
        await mkdir(tempDir, { recursive: true });

        if (lang === 'java') {
            const filePath = path.join(tempDir, 'Main.java');
            await writeFile(filePath, code);

            // Write stdin to a file to pipe cleanly
            const stdinPath = path.join(tempDir, 'stdin.txt');
            await writeFile(stdinPath, stdin || '');

            try {
                // Compile with fast-startup JVM flags
                await execAsync(`javac -J-XX:TieredStopAtLevel=1 -J-Xverify:none Main.java`, { cwd: tempDir, timeout: 10000 });
                // Run with fast-startup JVM flags
                const { stdout, stderr } = await execAsync(`java -XX:TieredStopAtLevel=1 -Xverify:none Main < stdin.txt`, { cwd: tempDir, timeout: 10000 });

                return NextResponse.json({
                    output: stdout || (stderr ? `Error: ${stderr}` : "No output"),
                    status: 0
                });
            } catch (err) {
                const e = err as { stdout?: string; stderr?: string; message?: string; code?: number };
                const errorOutput = e.stdout || e.stderr || e.message || 'Ismeretlen hiba';
                return NextResponse.json({
                    output: errorOutput,
                    status: e.code || 1
                });
            }
        } else if (lang === 'sql' || lang === 'sqlite3') {
            const sqlPath = path.join(tempDir, 'query.sql');
            await writeFile(sqlPath, code);

            try {
                const { stdout, stderr } = await execAsync(`sqlite3 :memory: < query.sql`, { cwd: tempDir, timeout: 5000 });
                return NextResponse.json({
                    output: stdout || (stderr ? `Error: ${stderr}` : "No output"),
                    status: 0
                });
            } catch (err) {
                const e = err as { stdout?: string; stderr?: string; message?: string; code?: number };
                return NextResponse.json({
                    output: e.stdout || e.stderr || e.message || 'Ismeretlen hiba',
                    status: e.code || 1
                });
            }
        }

        return NextResponse.json({ error: 'Unsupported language for local execution' }, { status: 400 });
    } catch (error) {
        console.error('Execution error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        // Cleanup
        try {
            await rm(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
        }
    }
}
