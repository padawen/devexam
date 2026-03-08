"use client";

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface Props {
    language: string;
    code: string;
    sql_schema_index?: number;
}

export default function TerminalPanel({ language, code, sql_schema_index }: Props) {
    const [running, setRunning] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            theme: {
                background: '#0f172a',
                foreground: '#f8fafc',
                cursor: '#6366f1',
                selectionBackground: '#4338ca55',
            },
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        term.writeln('\x1b[90mTerminál készen áll. Kattints a \x1b[97mFuttatás\x1b[90m gombra.\x1b[0m');

        term.onData(data => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'stdin', data }));
            }
        });

        const handleResize = () => {
            fitAddon.fit();
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'resize',
                    cols: term.cols,
                    rows: term.rows
                }));
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const handleRun = () => {
        if (!xtermRef.current) return;
        const term = xtermRef.current;

        // Close any existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        term.clear();
        term.writeln('\x1b[34m▶ Fordítás és futtatás...\x1b[0m');
        setRunning(true);

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocol}://${window.location.host}/ws/terminal`);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'start',
                language,
                code,
                sql_schema_index,
                cols: term.cols,
                rows: term.rows
            }));
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'stdout') {
                term.write(msg.data);
            } else if (msg.type === 'exit') {
                setRunning(false);
                term.writeln(`\r\n\x1b[90m[Processzus leállt, kód: ${msg.code}]\x1b[0m`);
                wsRef.current = null;
            }
        };

        ws.onerror = () => {
            term.writeln('\x1b[31mHiba: Nem sikerült csatlakozni a szerverhez.\x1b[0m');
            setRunning(false);
        };

        ws.onclose = () => {
            setRunning(false);
        };
    };

    const handleClear = () => {
        if (!xtermRef.current) return;
        xtermRef.current.clear();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setRunning(false);
    };

    return (
        <div className="flex flex-col border border-slate-700 rounded-lg overflow-hidden bg-[#0f172a] h-[350px]">
            {/* Title bar */}
            <div className="flex items-center justify-between bg-slate-800 border-b border-slate-700 px-4 py-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="ml-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Konzol</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleClear}
                        className="text-xs text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                        Törlés
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold transition-all active:scale-95 cursor-pointer"
                    >
                        {running ? '⟳ Fut...' : '▶ Futtatás'}
                    </button>
                </div>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 p-2 overflow-hidden" ref={terminalRef} />
        </div>
    );
}
