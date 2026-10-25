import React from 'react';
import { CompilerConfig, JSTarget, JSModule, JSXMode } from '../types';
import { X, Sliders, RotateCcw } from 'lucide-react';
import { DEFAULT_COMPILER_CONFIG } from '../compiler/tsCompiler';

interface CompilerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CompilerConfig;
  onChangeConfig: (newConfig: CompilerConfig) => void;
}

export const CompilerSettingsModal: React.FC<CompilerSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  const handleUpdate = <K extends keyof CompilerConfig>(key: K, value: CompilerConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  const targets: JSTarget[] = ['ES5', 'ES6', 'ES2018', 'ES2020', 'ES2022', 'ESNext'];
  const modules: JSModule[] = ['ESNext', 'CommonJS', 'None', 'UMD', 'AMD'];
  const jsxModes: JSXMode[] = ['ReactJSX', 'React', 'Preserve'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-100">TypeScript Compiler Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 text-xs text-zinc-300">
          {/* Target */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">
              ECMAScript Target (target)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {targets.map((t) => (
                <button
                  key={t}
                  onClick={() => handleUpdate('target', t)}
                  className={`py-1.5 px-3 rounded-md text-xs font-mono transition-colors border ${
                    config.target === t
                      ? 'bg-blue-600 border-blue-500 text-white font-medium'
                      : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Determines syntax downleveling (e.g. arrow functions, classes, async/await).
            </p>
          </div>

          {/* Module */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">
              Module System (module)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {modules.map((m) => (
                <button
                  key={m}
                  onClick={() => handleUpdate('module', m)}
                  className={`py-1.5 px-3 rounded-md text-xs font-mono transition-colors border ${
                    config.module === m
                      ? 'bg-blue-600 border-blue-500 text-white font-medium'
                      : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* JSX Mode */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">
              JSX Transform (jsx)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {jsxModes.map((j) => (
                <button
                  key={j}
                  onClick={() => handleUpdate('jsx', j)}
                  className={`py-1.5 px-3 rounded-md text-xs font-mono transition-colors border ${
                    config.jsx === j
                      ? 'bg-blue-600 border-blue-500 text-white font-medium'
                      : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-zinc-300">Strict Type Checking (strict)</span>
              <input
                type="checkbox"
                checked={config.strict}
                onChange={(e) => handleUpdate('strict', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-zinc-300">Remove Comments</span>
              <input
                type="checkbox"
                checked={config.removeComments}
                onChange={(e) => handleUpdate('removeComments', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-zinc-300">Auto-Compile as You Type</span>
              <input
                type="checkbox"
                checked={config.autoCompile}
                onChange={(e) => handleUpdate('autoCompile', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-zinc-300">Auto-Run on Compile</span>
              <input
                type="checkbox"
                checked={config.autoRun}
                onChange={(e) => handleUpdate('autoRun', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => onChangeConfig(DEFAULT_COMPILER_CONFIG)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
