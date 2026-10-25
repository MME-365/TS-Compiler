import React, { useState, useMemo } from 'react';
import { ConsoleEntry, ExecutionResult, LogLevel } from '../types';
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';

interface ConsoleViewProps {
  entries: ConsoleEntry[];
  executionResult: ExecutionResult | null;
  onClear: () => void;
  isRunning?: boolean;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  entries,
  executionResult,
  onClear,
  isRunning,
}) => {
  const [filter, setFilter] = useState<'all' | LogLevel>('all');
  const [copied, setCopied] = useState(false);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.level === filter);
  }, [entries, filter]);

  const handleCopyLogs = () => {
    const text = entries
      .map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        const content = e.args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
          .join(' ');
        return `[${time}] [${e.level.toUpperCase()}] ${content}`;
      })
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const errorCount = entries.filter((e) => e.level === 'error').length;
  const warnCount = entries.filter((e) => e.level === 'warn').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e24] overflow-hidden text-zinc-300">
      {/* Console Top Toolbar */}
      <div className="h-10 border-b border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">Console</span>

          {/* Execution time indicator */}
          {executionResult && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 ml-2">
              <span aria-hidden="true">·</span>
              <span className={executionResult.success ? 'text-emerald-400' : 'text-red-400'}>
                {executionResult.success ? `Executed in ${executionResult.durationMs}ms` : 'Execution Failed'}
              </span>
            </div>
          )}
        </div>

        {/* Filter Controls & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Segmented Filter Control */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'error' ? 'bg-red-950/60 text-red-300' : 'text-zinc-500 hover:text-red-400'
              }`}
            >
              Errors {errorCount > 0 && `(${errorCount})`}
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'warn' ? 'bg-amber-950/60 text-amber-300' : 'text-zinc-500 hover:text-amber-400'
              }`}
            >
              Warnings {warnCount > 0 && `(${warnCount})`}
            </button>
          </div>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            disabled={entries.length === 0}
            title="Copy console output"
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Console */}
          <button
            onClick={onClear}
            disabled={entries.length === 0}
            title="Clear console"
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Output Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2 select-text">
        {filteredEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 select-none py-12">
            <Terminal className="w-8 h-8 stroke-[1.2] mb-2 text-zinc-700" />
            <p className="text-zinc-500 text-xs">Console is clear</p>
            <p className="text-zinc-600 text-[11px] mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">⌘↵</kbd> or click <strong>Run</strong> to execute code
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <ConsoleRow key={entry.id} entry={entry} />
          ))
        )}

        {isRunning && (
          <div className="text-xs text-blue-400 font-mono flex items-center gap-2 py-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Executing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Row formatter for console arguments
const ConsoleRow: React.FC<{ entry: ConsoleEntry }> = ({ entry }) => {
  const isError = entry.level === 'error';
  const isWarn = entry.level === 'warn';
  const isInfo = entry.level === 'info';
  const isTable = entry.level === 'table';

  const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`p-2 rounded border flex items-start gap-2.5 transition-colors ${
        isError
          ? 'bg-red-950/20 border-red-900/40 text-red-300'
          : isWarn
          ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
          : isInfo
          ? 'bg-blue-950/20 border-blue-900/40 text-blue-300'
          : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'
      }`}
    >
      <div className="shrink-0 mt-0.5 text-zinc-500 text-[10px]">
        {isError && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
        {isWarn && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
        {isInfo && <Info className="w-3.5 h-3.5 text-blue-400" />}
        {!isError && !isWarn && !isInfo && <span className="opacity-50">{timeStr}</span>}
      </div>

      <div className="flex-1 overflow-x-auto">
        {isTable ? (
          <ConsoleTableData data={entry.args[0]} />
        ) : (
          <div className="space-y-1">
            {entry.args.map((arg, idx) => (
              <ConsoleValue key={idx} value={arg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Formats objects, arrays, and primitive values
const ConsoleValue: React.FC<{ value: any }> = ({ value }) => {
  const [expanded, setExpanded] = useState(false);

  if (value === null) {
    return <span className="text-zinc-500 italic">null</span>;
  }
  if (value === undefined) {
    return <span className="text-zinc-500 italic">undefined</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-amber-400 font-semibold">{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-emerald-400 font-semibold">{value}</span>;
  }
  if (typeof value === 'string') {
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
  if (typeof value === 'object') {
    const isArray = Array.isArray(value);
    const keys = Object.keys(value);

    return (
      <div className="font-mono text-xs">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:underline"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-blue-400">
            {isArray ? `Array(${value.length})` : `Object {${keys.length} keys}`}
          </span>
        </button>

        {expanded ? (
          <pre className="p-2 mt-1 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          <span className="text-zinc-500 text-[11px] ml-1">
            {isArray
              ? `[${value.slice(0, 3).map((v: any) => typeof v === 'object' ? '{...}' : String(v)).join(', ')}${value.length > 3 ? '...' : ''}]`
              : `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''} }`}
          </span>
        )}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

// Formats console.table output
const ConsoleTableData: React.FC<{ data: any }> = ({ data }) => {
  if (!data || typeof data !== 'object') {
    return <ConsoleValue value={data} />;
  }

  const isArray = Array.isArray(data);
  const rows = isArray ? data : Object.entries(data).map(([key, val]) => ({ '(index)': key, ...(typeof val === 'object' ? val : { Value: val }) }));

  if (rows.length === 0) {
    return <span className="text-zinc-500 italic">Empty table</span>;
  }

  const columns = Array.from(
    new Set(
      rows.flatMap((r) => (typeof r === 'object' && r !== null ? Object.keys(r) : ['Value']))
    )
  );

  return (
    <div className="overflow-x-auto border border-zinc-800 rounded bg-zinc-950/80 my-1">
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
            <th className="p-1.5 font-semibold border-r border-zinc-800">#</th>
            {columns.map((col) => (
              <th key={col} className="p-1.5 font-semibold border-r border-zinc-800 last:border-r-0">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-zinc-800/60 hover:bg-zinc-900/40">
              <td className="p-1.5 text-zinc-500 border-r border-zinc-800 font-mono">{idx}</td>
              {columns.map((col) => {
                const cellVal = typeof row === 'object' && row !== null ? row[col] : row;
                return (
                  <td key={col} className="p-1.5 border-r border-zinc-800/60 last:border-r-0 font-mono text-zinc-300">
                    {typeof cellVal === 'object' ? JSON.stringify(cellVal) : String(cellVal ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
