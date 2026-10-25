export type JSTarget = 'ES5' | 'ES6' | 'ES2018' | 'ES2020' | 'ES2022' | 'ESNext';
export type JSModule = 'ESNext' | 'CommonJS' | 'None' | 'UMD' | 'AMD';
export type JSXMode = 'Preserve' | 'React' | 'ReactJSX';

export interface CompilerConfig {
  target: JSTarget;
  module: JSModule;
  jsx: JSXMode;
  removeComments: boolean;
  inlineSourceMap: boolean;
  strict: boolean;
  noImplicitAny: boolean;
  autoCompile: boolean;
  autoRun: boolean;
}

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  isEntry?: boolean;
  isReadonly?: boolean;
}

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'table';

export interface ConsoleEntry {
  id: string;
  level: LogLevel;
  timestamp: number;
  args: any[];
  executionTime?: number;
}

export interface CompilerDiagnostic {
  line: number;
  column: number;
  message: string;
  code: number;
  category: 'error' | 'warning' | 'info';
}

export interface CompilationResult {
  success: boolean;
  outputText: string;
  sourceMapText?: string;
  diagnostics: CompilerDiagnostic[];
  durationMs: number;
  compiledAt: Date;
}

export interface ExecutionResult {
  success: boolean;
  durationMs: number;
  returnValue?: any;
  error?: string;
}
