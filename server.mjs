import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import path, { dirname } from 'path';
import { randomUUID } from 'crypto';
import os from 'os';
import { execSync, spawn as cpSpawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Map of active PTY sessions: sessionId -> pty process
const sessions = new Map();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // Use noServer mode so we can manually decide which upgrades to handle
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const { pathname } = parse(req.url);
        if (pathname === '/ws/terminal') {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        }
        // For all other paths (e.g. Next.js HMR /_next/webpack-hmr),
        // do nothing – Next.js sets up its own upgrade listener internally.
    });

    wss.on('connection', (ws) => {
        let sessionId = null;
        let ptyProcess = null;
        let tempDir = null;

        ws.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            if (msg.type === 'start') {
                if (ptyProcess) { try { ptyProcess.kill(); } catch { } }
                if (tempDir) { try { rmSync(tempDir, { recursive: true, force: true }); } catch { } }

                sessionId = randomUUID();
                tempDir = path.resolve(os.tmpdir(), `devexam-pty-${sessionId}`);
                mkdirSync(tempDir, { recursive: true });

                const lang = (msg.language || '').toLowerCase();
                const code = msg.code || '';

                console.log(`Starting ${lang} session in ${tempDir}`);

                if (lang === 'java') {
                    const javaFile = path.join(tempDir, 'Main.java');
                    writeFileSync(javaFile, code, 'utf8');

                    try {
                        console.log(`Compiling Java in ${tempDir}...`);
                        // Force UTF-8 encoding for javac and use fast startup JVM flags
                        execSync('javac -J-XX:TieredStopAtLevel=1 -J-Xverify:none -encoding UTF-8 Main.java', { cwd: tempDir, timeout: 15000, shell: true });
                    } catch (compileErr) {
                        const errText = compileErr.stderr?.toString() || compileErr.stdout?.toString() || compileErr.message;
                        console.error('Java Compilation Error:', errText);
                        ws.send(JSON.stringify({ type: 'stdout', data: `\x1b[31mKompilációs hiba:\x1b[0m\r\n${errText}\r\n` }));
                        ws.send(JSON.stringify({ type: 'exit', code: 1 }));
                        return;
                    }

                    console.log('Starting Java child process...');
                    const javaProc = cpSpawn('java', ['-XX:TieredStopAtLevel=1', '-Xverify:none', '-Dfile.encoding=UTF-8', 'Main'], {
                        cwd: tempDir,
                        env: process.env,
                        stdio: ['pipe', 'pipe', 'pipe'],
                    });

                    // Line buffer for manual echo + stdin forwarding
                    let lineBuffer = '';

                    // Wrap child_process in a PTY-compatible interface
                    ptyProcess = {
                        onData: (cb) => {
                            javaProc.stdout.on('data', (data) => cb(data.toString('utf8')));
                            javaProc.stderr.on('data', (data) => cb(data.toString('utf8')));
                        },
                        onExit: (cb) => {
                            javaProc.on('exit', (code) => cb({ exitCode: code || 0 }));
                        },
                        write: (data) => {
                            // Handle input with manual echo
                            for (const ch of data) {
                                if (ch === '\r' || ch === '\n') {
                                    // Enter: echo newline, send buffered line to Java stdin
                                    if (ws.readyState === 1) {
                                        ws.send(JSON.stringify({ type: 'stdout', data: '\r\n' }));
                                    }
                                    javaProc.stdin.write(lineBuffer + '\n', 'utf8');
                                    lineBuffer = '';
                                } else if (ch === '\x7f' || ch === '\b') {
                                    // Backspace: remove last char and erase on screen
                                    if (lineBuffer.length > 0) {
                                        lineBuffer = lineBuffer.slice(0, -1);
                                        if (ws.readyState === 1) {
                                            ws.send(JSON.stringify({ type: 'stdout', data: '\b \b' }));
                                        }
                                    }
                                } else if (ch === '\x03') {
                                    // Ctrl+C: kill process
                                    javaProc.kill('SIGTERM');
                                } else {
                                    // Printable char: echo + buffer
                                    lineBuffer += ch;
                                    if (ws.readyState === 1) {
                                        ws.send(JSON.stringify({ type: 'stdout', data: ch }));
                                    }
                                }
                            }
                        },
                        kill: () => { try { javaProc.kill(); } catch { } },
                        resize: () => { }, // no-op for child_process
                    };
                } else if (lang === 'sql' || lang === 'sqlite3') {
                    const sqlPath = path.join(tempDir, 'query.sql');
                    writeFileSync(sqlPath, code, 'utf8');

                    let dbPath = ':memory:';
                    const schemaIndex = msg.sql_schema_index || 1;
                    const targetDb = path.resolve(__dirname, 'prisma', 'task_dbs', `sql_${schemaIndex}.db`);

                    if (existsSync(targetDb)) {
                        dbPath = targetDb;
                    }

                    console.log(`Starting SQLite child_process with DB: ${dbPath}`);
                    const sqlProc = cpSpawn('sqlite3', ['-batch', '-header', '-box', dbPath, '.read query.sql'], {
                        cwd: tempDir,
                        env: process.env,
                    });

                    ptyProcess = {
                        onData: (cb) => {
                            sqlProc.stdout.on('data', (data) => cb(data.toString('utf8')));
                            sqlProc.stderr.on('data', (data) => cb(data.toString('utf8')));
                        },
                        onExit: (cb) => {
                            sqlProc.on('exit', (code) => cb({ exitCode: code || 0 }));
                        },
                        write: () => { },
                        kill: () => { try { sqlProc.kill(); } catch { } },
                        resize: () => { },
                    };
                } else {
                    ws.send(JSON.stringify({ type: 'stdout', data: 'Nem támogatott nyelv.\r\n' }));
                    ws.send(JSON.stringify({ type: 'exit', code: 1 }));
                    return;
                }

                sessions.set(sessionId, ptyProcess);

                ptyProcess.onData((data) => {
                    if (ws.readyState === 1 /* OPEN */) {
                        ws.send(JSON.stringify({ type: 'stdout', data }));
                    }
                });

                ptyProcess.onExit(({ exitCode }) => {
                    if (ws.readyState === 1) {
                        ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
                    }
                    sessions.delete(sessionId);
                    try { rmSync(tempDir, { recursive: true, force: true }); } catch { }
                    ptyProcess = null;
                    tempDir = null;
                });

            } else if (msg.type === 'stdin' && ptyProcess) {
                ptyProcess.write(msg.data);
            } else if (msg.type === 'resize' && ptyProcess) {
                ptyProcess.resize(msg.cols, msg.rows);
            }
        });

        ws.on('close', () => {
            if (ptyProcess) { try { ptyProcess.kill(); } catch { } }
            if (tempDir) { try { rmSync(tempDir, { recursive: true, force: true }); } catch { } }
            if (sessionId) sessions.delete(sessionId);
        });
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
});
