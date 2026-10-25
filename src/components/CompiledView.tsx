import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { CompilationResult, CompilerConfig } from '../types';
import { Copy, Check, Download, AlertTriangle, Layers } from 'lucide-react';

interface CompiledViewProps {
  compilationResult: CompilationResult | null;
  config: CompilerConfig;
  activeFileName: string;
  onDownloadJs: () => void;
  fontSize?: number;
}

export const CompiledView: React.FC<CompiledViewProps> = ({
  compilationResult,
  config,
  activeFileName,
  onDownloadJs,
  fontSize = 13,
}) => {
  const [copied, setCopied] = useState(false);

  const outputJs = compilationResult?.outputText || '// No compiled output yet';
  const outFileName = activeFileName.replace(/\.(ts|tsx)$/, '.js');

  const handleCopy = () => {
    if (compilationResult?.outputText) {
      navigator.clipboard.writeText(compilationResult.outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const diagnostics = compilationResult?.diagnostics || [];
  const errors = diagnostics.filter((d) => d.category === 'error');
  const warnings = diagnostics.filter((d) => d.category === 'warning');

  const [copiedDiags, setCopiedDiags] = useState(false);

  const handleCopyDiagnostics = () => {
    if (diagnostics.length > 0) {
      const text = diagnostics
        .map((d) => `[${d.line}:${d.column}] ${d.category.toUpperCase()} TS${d.code}: ${d.message}`)
        .join('\n');
      navigator.clipboard.writeText(text);
      setCopiedDiags(true);
      setTimeout(() => setCopiedDiags(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#282c34] overflow-hidden">
      {/* Compiled Header Bar */}
      <div className="h-10 border-b border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between text-xs text-zinc-400 select-none">
        <div className="flex items-center gap-2 font-mono">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-200 font-semibold">{outFileName}</span>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <span>{config.target}</span>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <span>{config.module}</span>
          {compilationResult && (
            <>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className="text-emerald-400">{compilationResult.durationMs}ms</span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span>{(new Blob([outputJs]).size / 1024).toFixed(1)} KB</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            title="Copy compiled JavaScript"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadJs}
            title="Download .js file"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition-colors"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">.js</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto relative">
        <CodeMirror
          value={outputJs}
          height="100%"
          extensions={[javascript()]}
          theme={oneDark}
          editable={false}
          readOnly={true}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: false,
            foldGutter: true,
            syntaxHighlighting: true,
          }}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            height: '100%',
          }}
        />
      </div>

      {/* Diagnostics / Warnings Bottom Panel */}
      {diagnostics.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-2.5 max-h-36 overflow-y-auto">
          <div className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Diagnostics ({errors.length} error{errors.length !== 1 ? 's' : ''}, {warnings.length} warning{warnings.length !== 1 ? 's' : ''})</span>
            </div>
            <button
              onClick={handleCopyDiagnostics}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-mono transition-colors"
              title="Copy diagnostics to clipboard"
            >
              {copiedDiags ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Errors</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {diagnostics.map((diag, index) => (
              <div
                key={index}
                onClick={() => {
                  navigator.clipboard.writeText(`[${diag.line}:${diag.column}] error TS${diag.code}: ${diag.message}`);
                }}
                title="Click to copy this line"
                className={`p-1.5 rounded flex items-start gap-2 cursor-pointer hover:opacity-90 transition-opacity ${
                  diag.category === 'error'
                    ? 'bg-red-950/40 text-red-300 border border-red-900/40'
                    : 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
                }`}
              >
                <span className="font-semibold text-zinc-400 shrink-0">
                  [{diag.line}:{diag.column}]
                </span>
                <span className="flex-1">{diag.message}</span>
                <span className="text-[10px] opacity-60">TS{diag.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
