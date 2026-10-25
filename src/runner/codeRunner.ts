import { ConsoleEntry, ExecutionResult, LogLevel } from '../types';
import { normalizeModuleName } from '../compiler/tsCompiler';

export class CodeRunner {
  private logListener?: (entry: ConsoleEntry) => void;
  private clearListener?: () => void;
  private timers: Map<string, number> = new Map();

  constructor(options?: {
    onLog?: (entry: ConsoleEntry) => void;
    onClear?: () => void;
  }) {
    this.logListener = options?.onLog;
    this.clearListener = options?.onClear;
  }

  setListeners(options: {
    onLog?: (entry: ConsoleEntry) => void;
    onClear?: () => void;
  }) {
    this.logListener = options.onLog;
    this.clearListener = options.onClear;
  }

  private emitLog(level: LogLevel, args: any[]) {
    const entry: ConsoleEntry = {
      id: Math.random().toString(36).substring(2, 9),
      level,
      timestamp: Date.now(),
      args: args.map((arg) => this.cloneArgument(arg)),
    };
    this.logListener?.(entry);
  }

  private cloneArgument(arg: any): any {
    if (arg === null || arg === undefined) return arg;
    if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
    if (typeof arg === 'symbol') return arg.toString();
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (typeof arg === 'object') {
      try {
        // Deep clone safely to avoid mutation in console
        return JSON.parse(
          JSON.stringify(arg, (_, value) => {
            if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
            if (typeof value === 'symbol') return value.toString();
            return value;
          })
        );
      } catch {
        return String(arg);
      }
    }
    return arg;
  }

  async executeModules(
    compiledModules: Record<string, string>,
    entryKey: string,
    canvasElement?: HTMLCanvasElement | null,
    domContainer?: HTMLElement | null
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    this.timers.clear();

    // Create custom console
    const customConsole = {
      log: (...args: any[]) => this.emitLog('log', args),
      info: (...args: any[]) => this.emitLog('info', args),
      warn: (...args: any[]) => this.emitLog('warn', args),
      error: (...args: any[]) => this.emitLog('error', args),
      table: (...args: any[]) => this.emitLog('table', args),
      clear: () => {
        this.clearListener?.();
      },
      time: (label: string = 'default') => {
        this.timers.set(label, performance.now());
      },
      timeEnd: (label: string = 'default') => {
        const start = this.timers.get(label);
        if (start !== undefined) {
          const duration = Math.round((performance.now() - start) * 100) / 100;
          this.emitLog('info', [`${label}: ${duration}ms`]);
          this.timers.delete(label);
        } else {
          this.emitLog('warn', [`Timer '${label}' does not exist`]);
        }
      },
      dir: (...args: any[]) => this.emitLog('log', args),
      count: (label: string = 'default') => {
        this.emitLog('log', [`${label}: 1`]);
      },
    };

    // Module cache
    const moduleCache: Record<string, { exports: any }> = {};
    const moduleKeys = Object.keys(compiledModules);

    const requireModule = (modulePath: string, callingFrom: string = ''): any => {
      let resolvedKey = '';

      // Direct match
      const directKey = normalizeModuleName(modulePath);
      if (compiledModules[directKey]) {
        resolvedKey = directKey;
      } else {
        // Resolve relative to callingFrom
        if (modulePath.startsWith('.')) {
          const fromDir = callingFrom.includes('/') ? callingFrom.substring(0, callingFrom.lastIndexOf('/')) : '';
          const candidate = normalizeModuleName(fromDir ? `${fromDir}/${modulePath}` : modulePath);
          if (compiledModules[candidate]) {
            resolvedKey = candidate;
          }
        }

        // Search among available module keys
        if (!resolvedKey) {
          const stripped = normalizeModuleName(modulePath);
          const found = moduleKeys.find(
            (k) => k === stripped || k.endsWith(`/${stripped}`) || stripped.endsWith(`/${k}`)
          );
          if (found) {
            resolvedKey = found;
          }
        }
      }

      if (!resolvedKey || !compiledModules[resolvedKey]) {
        throw new Error(
          `Cannot resolve module '${modulePath}' from '${callingFrom || 'root'}'. Available modules: ${moduleKeys.join(', ')}`
        );
      }

      if (moduleCache[resolvedKey]) {
        return moduleCache[resolvedKey].exports;
      }

      const code = compiledModules[resolvedKey];
      const mod = { exports: {} };
      moduleCache[resolvedKey] = mod;

      // Scoped require for child modules
      const scopedRequire = (childPath: string) => requireModule(childPath, resolvedKey);

      // Execute module in wrapper
      const moduleWrapper = new Function(
        'require',
        'exports',
        'module',
        'console',
        'document',
        'window',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        code
      );

      // Create a mocked or actual document with preview canvas and container support
      const customDocument = {
        getElementById: (id: string) => {
          if (id === 'preview-canvas' || id === 'canvas') return canvasElement;
          if (id === 'preview-container' || id === 'output') return domContainer;
          return document.getElementById(id);
        },
        querySelector: (sel: string) => {
          if (sel === '#preview-canvas' || sel === 'canvas') return canvasElement;
          if (sel === '#preview-container' || sel === '#output') return domContainer;
          return document.querySelector(sel);
        },
        createElement: (tag: string) => document.createElement(tag),
        createTextNode: (text: string) => document.createTextNode(text),
        body: domContainer || document.body,
      };

      moduleWrapper(
        scopedRequire,
        mod.exports,
        mod,
        customConsole,
        customDocument,
        window,
        window.setTimeout.bind(window),
        window.setInterval.bind(window),
        window.clearTimeout.bind(window),
        window.clearInterval.bind(window)
      );

      return mod.exports;
    };

    try {
      const result = requireModule(entryKey);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        success: true,
        durationMs,
        returnValue: result,
      };
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      const errorMessage = err?.stack || err?.message || String(err);
      this.emitLog('error', [errorMessage]);
      return {
        success: false,
        durationMs,
        error: errorMessage,
      };
    }
  }
}
