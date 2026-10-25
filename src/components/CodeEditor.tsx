import React, { useMemo, useState } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { CompilerDiagnostic } from '../types';
import { AlertCircle, FileText, CheckCircle2, Copy, Check } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  fileName: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  diagnostics?: CompilerDiagnostic[];
  fontSize?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  fileName,
  onChange,
  onRun,
  diagnostics = [],
  fontSize = 13,
}) => {
  const editorRef = React.useRef<ReactCodeMirrorRef>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isJsx = fileName.endsWith('.tsx') || fileName.endsWith('.jsx');
  const extensions = useMemo(() => {
    return [javascript({ typescript: true, jsx: isJsx })];
  }, [isJsx]);

  const lineCount = useMemo(() => {
    return value.split('\n').length;
  }, [value]);

  const charCount = value.length;

  const errors = diagnostics.filter((d) => d.category === 'error');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#282c34] overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto relative">
        <CodeMirror
          ref={editorRef}
          value={value}
          height="100%"
          extensions={extensions}
          theme={oneDark}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            height: '100%',
          }}
        />
      </div>

      {/* Diagnostics Inline Banner if there are errors with easy copy button */}
      {errors.length > 0 && (
        <div className="bg-red-950/80 border-t border-red-900/80 px-3 py-2 flex items-start justify-between gap-3 text-xs text-red-200">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 max-h-24 overflow-y-auto space-y-1">
              {errors.map((err, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const text = `${fileName}:${err.line}:${err.column} - Syntax Error: ${err.message} (TS${err.code})`;
                    navigator.clipboard.writeText(text);
                    setCopiedIndex(idx);
                    setTimeout(() => setCopiedIndex(null), 2000);
                  }}
                  title="Click to copy this syntax error"
                  className="font-mono text-[11px] leading-tight p-1 rounded hover:bg-red-900/50 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div className="truncate mr-2">
                    <span className="text-red-400 font-semibold">
                      Line {err.line}, Col {err.column}:
                    </span>{' '}
                    <span>{err.message}</span>
                    <span className="text-red-400/60 text-[10px] ml-1">(TS{err.code})</span>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] text-red-300 flex items-center gap-1 shrink-0 font-sans">
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Copy All Errors Button */}
          <button
            onClick={() => {
              const formatted = errors
                .map((err) => `${fileName}:${err.line}:${err.column} - error TS${err.code}: ${err.message}`)
                .join('\n');
              navigator.clipboard.writeText(formatted);
              setCopiedAll(true);
              setTimeout(() => setCopiedAll(false), 2000);
            }}
            title="Copy all syntax errors to clipboard"
            className="shrink-0 px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800/80 text-red-100 border border-red-700/60 flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            {copiedAll ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Copied All</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy {errors.length > 1 ? `All (${errors.length})` : 'Error'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="h-6 bg-zinc-950 border-t border-zinc-800/80 px-3 flex items-center justify-between text-[11px] text-zinc-500 font-mono select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <FileText className="w-3 h-3 text-zinc-500" />
            <span>{fileName}</span>
          </div>
          <span aria-hidden="true" className="text-zinc-800">|</span>
          <span>{lineCount} lines</span>
          <span aria-hidden="true" className="text-zinc-800">·</span>
          <span>{charCount} chars</span>
        </div>

        <div className="flex items-center gap-3">
          {errors.length === 0 ? (
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Syntax OK
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.length} issue{errors.length > 1 ? 's' : ''}
            </span>
          )}
          <span aria-hidden="true" className="text-zinc-800">|</span>
          <span className="text-zinc-400">UTF-8</span>
          <span aria-hidden="true" className="text-zinc-800">·</span>
          <span className="text-zinc-400">TypeScript</span>
        </div>
      </div>
    </div>
  );
};
