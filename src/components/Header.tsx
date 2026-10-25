import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Download, 
  Upload, 
  Settings, 
  Code2, 
  FileArchive, 
  Copy, 
  Check, 
  Sparkles,
  RefreshCw,
  ChevronDown,
  Sliders,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { PRESETS } from '../presets';
import { CompilerConfig, JSTarget, JSModule, JSXMode } from '../types';
import { DEFAULT_COMPILER_CONFIG } from '../compiler/tsCompiler';

interface HeaderProps {
  onRun: () => void;
  isRunning: boolean;
  onSelectPreset: (presetId: string) => void;
  currentPresetId: string;
  onImportFiles: (files: FileList) => void;
  onDownloadTs: () => void;
  onDownloadJs: () => void;
  onDownloadZip: () => void;
  onCopyJs: () => void;
  isCopied: boolean;
  tsVersion: string;
  compilationDurationMs?: number;
  hasErrors?: boolean;
  errorsCount?: number;
  config: CompilerConfig;
  onChangeConfig: (newConfig: CompilerConfig) => void;
  onCopyErrors?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRun,
  isRunning,
  onSelectPreset,
  currentPresetId,
  onImportFiles,
  onDownloadTs,
  onDownloadJs,
  onDownloadZip,
  onCopyJs,
  isCopied,
  tsVersion,
  compilationDurationMs,
  hasErrors,
  errorsCount = 0,
  config,
  onChangeConfig,
  onCopyErrors,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [copiedErrorNotification, setCopiedErrorNotification] = useState(false);

  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdate = <K extends keyof CompilerConfig>(key: K, value: CompilerConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  const handleCopyErrorsInternal = () => {
    if (onCopyErrors) {
      onCopyErrors();
      setCopiedErrorNotification(true);
      setTimeout(() => setCopiedErrorNotification(false), 2000);
    }
  };

  const targets: JSTarget[] = ['ES5', 'ES6', 'ES2018', 'ES2020', 'ES2022', 'ESNext'];
  const modules: JSModule[] = ['ESNext', 'CommonJS'];
  const jsxModes: JSXMode[] = ['ReactJSX', 'React', 'Preserve'];

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 select-none">
      {/* Top Bar: Branding & Primary Actions */}
      <div className="h-12 px-4 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-inner shadow-blue-400/20">
              TS
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm text-zinc-100 tracking-tight">TypeScript Studio</span>
              <span className="text-xs text-zinc-500 font-mono">v{tsVersion}</span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1 hidden sm:block" />

          {/* Template Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <label htmlFor="preset-select" className="sr-only">Templates</label>
            <select
              id="preset-select"
              value={currentPresetId}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer pr-1"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".ts,.tsx,.js,.jsx,.json,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Run Button (Primary action) */}
          <button
            onClick={onRun}
            disabled={isRunning}
            title="Run compiled code (Ctrl+Enter / Cmd+Enter)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run</span>
            <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] bg-emerald-700/60 text-emerald-100 rounded font-mono">
              ⌘↵
            </kbd>
          </button>

          {/* Import Files Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import TypeScript, JavaScript, or JSON files"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Download Menu */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              title="Download options"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {downloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => {
                    onDownloadTs();
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Active File (.ts)</span>
                </button>
                <button
                  onClick={() => {
                    onDownloadJs();
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compiled Output (.js)</span>
                </button>
                <button
                  onClick={() => {
                    onDownloadZip();
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FileArchive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download Project (.zip)</span>
                </button>
                <div className="h-[1px] bg-zinc-800 my-1" />
                <button
                  onClick={() => {
                    onCopyJs();
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>Copy Compiled JS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Bar: Positioned directly BELOW the branding */}
      <div className="h-9 px-4 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center justify-between text-xs overflow-x-auto scrollbar-none">
        {/* Settings Menu directly below the branding */}
        <div className="flex items-center gap-3">
          {/* Settings Menu Dropdown Button */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                settingsMenuOpen
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80'
              }`}
              title="Compiler Settings Menu"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Compiler Settings</span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${settingsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Settings Popover Dropdown (anchored below branding) */}
            {settingsMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>Compiler Configuration</span>
                  </div>
                  <button
                    onClick={() => onChangeConfig(DEFAULT_COMPILER_CONFIG)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    title="Reset to defaults"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Target */}
                <div>
                  <div className="text-[11px] font-medium text-zinc-400 mb-1">Target Version</div>
                  <div className="grid grid-cols-3 gap-1">
                    {targets.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleUpdate('target', t)}
                        className={`py-1 px-1.5 rounded text-[11px] font-mono transition-colors border ${
                          config.target === t
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-zinc-800/70 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module */}
                <div>
                  <div className="text-[11px] font-medium text-zinc-400 mb-1">Module Format</div>
                  <div className="grid grid-cols-2 gap-1">
                    {modules.map((m) => (
                      <button
                        key={m}
                        onClick={() => handleUpdate('module', m)}
                        className={`py-1 px-2 rounded text-[11px] font-mono transition-colors border ${
                          config.module === m
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-zinc-800/70 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* JSX */}
                <div>
                  <div className="text-[11px] font-medium text-zinc-400 mb-1">JSX Mode</div>
                  <div className="grid grid-cols-3 gap-1">
                    {jsxModes.map((j) => (
                      <button
                        key={j}
                        onClick={() => handleUpdate('jsx', j)}
                        className={`py-1 px-1.5 rounded text-[11px] font-mono transition-colors border ${
                          config.jsx === j
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-zinc-800/70 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {j}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300 text-[11px]">Strict Type Checking</span>
                    <input
                      type="checkbox"
                      checked={config.strict}
                      onChange={(e) => handleUpdate('strict', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300 text-[11px]">Remove Comments</span>
                    <input
                      type="checkbox"
                      checked={config.removeComments}
                      onChange={(e) => handleUpdate('removeComments', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300 text-[11px]">Auto-compile on Type</span>
                    <input
                      type="checkbox"
                      checked={config.autoCompile}
                      onChange={(e) => handleUpdate('autoCompile', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300 text-[11px]">Auto-run on Compile</span>
                    <input
                      type="checkbox"
                      checked={config.autoRun}
                      onChange={(e) => handleUpdate('autoRun', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Quick Target Switcher */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <span>Target:</span>
            <select
              value={config.target}
              onChange={(e) => handleUpdate('target', e.target.value as JSTarget)}
              className="bg-zinc-800/80 text-zinc-200 border border-zinc-700/60 rounded px-1.5 py-0.5 text-[11px] outline-none cursor-pointer"
            >
              {targets.map((t) => (
                <option key={t} value={t} className="bg-zinc-900 text-zinc-200">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Module Switcher */}
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <span>Module:</span>
            <select
              value={config.module}
              onChange={(e) => handleUpdate('module', e.target.value as JSModule)}
              className="bg-zinc-800/80 text-zinc-200 border border-zinc-700/60 rounded px-1.5 py-0.5 text-[11px] outline-none cursor-pointer"
            >
              {modules.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Strict Toggle */}
          <button
            onClick={() => handleUpdate('strict', !config.strict)}
            className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono transition-colors ${
              config.strict
                ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle strict type checking"
          >
            <span>Strict:</span>
            <span>{config.strict ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Right of Sub-Bar: Compilation speed and Easy Copy Syntax Errors button */}
        <div className="flex items-center gap-2">
          {/* Easy way to Copy Syntax Errors right in the bar! */}
          {hasErrors && onCopyErrors && (
            <button
              onClick={handleCopyErrorsInternal}
              title="Copy syntax error details to clipboard"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-red-950/80 hover:bg-red-900/80 text-red-200 border border-red-800/80 text-[11px] font-mono transition-all animate-pulse"
            >
              {copiedErrorNotification ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Error Copied!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <span>Copy Syntax Error{errorsCount > 1 ? `s (${errorsCount})` : ''}</span>
                  <Copy className="w-2.5 h-2.5 opacity-70" />
                </>
              )}
            </button>
          )}

          {/* Compilation latency status */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
            <span>Compiler:</span>
            <span className={hasErrors ? 'text-amber-400' : 'text-emerald-400'}>
              {hasErrors ? 'Syntax Issues' : `${compilationDurationMs ?? 0}ms`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
