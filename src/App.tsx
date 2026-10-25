import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as ts from 'typescript';
import JSZip from 'jszip';
import { 
  ProjectFile, 
  CompilerConfig, 
  CompilationResult, 
  ConsoleEntry, 
  ExecutionResult 
} from './types';
import { PRESETS } from './presets';
import { 
  DEFAULT_COMPILER_CONFIG, 
  compileTypeScript, 
  compileProjectForExecution 
} from './compiler/tsCompiler';
import { 
  generateTsConfigContent, 
  parseTsConfigContent 
} from './compiler/virtualFs';
import { 
  saveWorkspaceToIDB, 
  loadWorkspaceFromIDB, 
  clearWorkspaceIDB 
} from './storage/db';
import { extractFilesFromDataTransfer } from './utils/fileImporter';
import { CodeRunner } from './runner/codeRunner';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { FileTabs } from './components/FileTabs';
import { CodeEditor } from './components/CodeEditor';
import { CompiledView } from './components/CompiledView';
import { ConsoleView } from './components/ConsoleView';
import { CanvasPreview } from './components/CanvasPreview';
import { CompilerSettingsModal } from './components/CompilerSettingsModal';
import { 
  Terminal, 
  Layers, 
  Palette, 
  Columns, 
  Maximize2, 
  Upload, 
  FolderTree, 
  RotateCcw 
} from 'lucide-react';

export default function App() {
  // Preset & File state
  const [currentPresetId, setCurrentPresetId] = useState<string>('basics');
  const [files, setFiles] = useState<ProjectFile[]>(() => {
    const initialPreset = PRESETS[0];
    const initialFiles = [...initialPreset.files];
    // Include virtual tsconfig.json
    if (!initialFiles.some((f) => f.name === 'tsconfig.json')) {
      initialFiles.push({
        id: 'tsconfig_root',
        name: 'tsconfig.json',
        content: generateTsConfigContent(DEFAULT_COMPILER_CONFIG),
      });
    }
    return initialFiles;
  });
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return PRESETS[0].activeFileId;
  });

  // Compiler state
  const [config, setConfig] = useState<CompilerConfig>(DEFAULT_COMPILER_CONFIG);
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [diagnosticsByFile, setDiagnosticsByFile] = useState<Record<string, any>>({});

  // Runner state
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // UI state
  const [showFileTree, setShowFileTree] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'console' | 'compiled' | 'canvas'>('console');
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor-only' | 'right-only' | 'three-way'>('split');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [fontSize] = useState<number>(13);
  const [isLoadedFromIDB, setIsLoadedFromIDB] = useState<boolean>(false);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Canvas & DOM preview refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active file helper
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0];
  }, [files, activeFileId]);

  // Code runner instance
  const runner = useRef<CodeRunner | null>(null);
  if (!runner.current) {
    runner.current = new CodeRunner({
      onLog: (entry) => {
        setConsoleEntries((prev) => [...prev, entry]);
      },
      onClear: () => {
        setConsoleEntries([]);
      },
    });
  }

  // Compile active file or project
  const performCompile = useCallback(
    (currentFiles: ProjectFile[], activeId: string, currentConfig: CompilerConfig) => {
      const codeFiles = currentFiles.filter((f) => !f.name.endsWith('.json') || f.name.endsWith('tsconfig.json'));
      const targetFile = currentFiles.find((f) => f.id === activeId) || codeFiles[0] || currentFiles[0];
      if (!targetFile) return;

      const result = compileTypeScript(targetFile.content, targetFile.name, currentConfig);
      setCompilationResult(result);

      // Gather diagnostics for all files
      const projectCompile = compileProjectForExecution(currentFiles, activeId, currentConfig);
      setDiagnosticsByFile(projectCompile.diagnostics);
    },
    []
  );

  // Restore workspace from IndexedDB on page load
  useEffect(() => {
    loadWorkspaceFromIDB().then((saved) => {
      if (saved && saved.files.length > 0) {
        setFiles(saved.files);
        setActiveFileId(saved.activeFileId);
        if (saved.config) setConfig(saved.config);
        if (saved.presetId) setCurrentPresetId(saved.presetId);
        performCompile(saved.files, saved.activeFileId, saved.config || DEFAULT_COMPILER_CONFIG);
      } else {
        performCompile(files, activeFileId, config);
      }
      setIsLoadedFromIDB(true);
    });
  }, []);

  // Save workspace to IndexedDB on edits (debounced)
  useEffect(() => {
    if (!isLoadedFromIDB) return;
    const timer = setTimeout(() => {
      saveWorkspaceToIDB(files, activeFileId, currentPresetId, config);
    }, 400);
    return () => clearTimeout(timer);
  }, [files, activeFileId, currentPresetId, config, isLoadedFromIDB]);

  // Execute compiled project
  const performRun = useCallback(async () => {
    if (!runner.current) return;
    setIsRunning(true);
    setExecutionResult(null);

    // Switch to appropriate tab if user is on compiled code tab
    if (activeRightTab === 'compiled') {
      setActiveRightTab('console');
    }

    try {
      // Filter out non-code files for execution
      const runnableFiles = files.filter((f) => !f.name.endsWith('.json') && !f.name.endsWith('.md'));
      const projectCompile = compileProjectForExecution(runnableFiles, activeFileId, config);
      setDiagnosticsByFile(projectCompile.diagnostics);

      const activeRes = compileTypeScript(activeFile.content, activeFile.name, config);
      setCompilationResult(activeRes);

      if (activeFile.content.includes('preview-canvas')) {
        setActiveRightTab('canvas');
      }

      await new Promise((r) => setTimeout(r, 10));

      const res = await runner.current.executeModules(
        projectCompile.compiledModules,
        projectCompile.entryModuleKey,
        canvasRef.current,
        containerRef.current
      );

      setExecutionResult(res);
    } catch (err: any) {
      runner.current['emitLog']?.('error', [err?.message || String(err)]);
      setExecutionResult({
        success: false,
        durationMs: 0,
        error: err?.message,
      });
    } finally {
      setIsRunning(false);
    }
  }, [files, activeFileId, config, activeFile, activeRightTab]);

  // Re-compile on file content change (debounced)
  useEffect(() => {
    if (!config.autoCompile) return;
    const timer = setTimeout(() => {
      performCompile(files, activeFileId, config);
      if (config.autoRun) {
        performRun();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [files, activeFileId, config, performCompile, performRun]);

  // Handle Preset Switching
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCurrentPresetId(preset.id);
    const newFiles = [...preset.files];
    if (!newFiles.some((f) => f.name === 'tsconfig.json')) {
      newFiles.push({
        id: 'tsconfig_root',
        name: 'tsconfig.json',
        content: generateTsConfigContent(config),
      });
    }

    setFiles(newFiles);
    setActiveFileId(preset.activeFileId);
    setConsoleEntries([]);
    setExecutionResult(null);

    if (preset.id === 'canvas') {
      setActiveRightTab('canvas');
    } else {
      setActiveRightTab('console');
    }

    setTimeout(() => {
      performCompile(newFiles, preset.activeFileId, config);
    }, 50);
  };

  // Reset workspace back to default template & clear IDB
  const handleResetWorkspace = async () => {
    if (confirm('Reset workspace to default template? Any local unsaved changes will be cleared.')) {
      await clearWorkspaceIDB();
      const preset = PRESETS[0];
      const newFiles = [...preset.files];
      newFiles.push({
        id: 'tsconfig_root',
        name: 'tsconfig.json',
        content: generateTsConfigContent(DEFAULT_COMPILER_CONFIG),
      });
      setFiles(newFiles);
      setActiveFileId(preset.activeFileId);
      setConfig(DEFAULT_COMPILER_CONFIG);
      setCurrentPresetId(preset.id);
      setConsoleEntries([]);
      performCompile(newFiles, preset.activeFileId, DEFAULT_COMPILER_CONFIG);
    }
  };

  // Handle File Content Changes in Editor
  const handleEditorChange = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f))
    );

    // If user edited tsconfig.json directly, sync with compiler config
    if (activeFile.name === 'tsconfig.json') {
      const updates = parseTsConfigContent(newContent, config);
      if (Object.keys(updates).length > 0) {
        setConfig((prev) => ({ ...prev, ...updates }));
      }
    }
  };

  // Handle Config Change from UI: sync back into virtual tsconfig.json
  const handleConfigChange = (newConfig: CompilerConfig) => {
    setConfig(newConfig);
    const newTsConfigContent = generateTsConfigContent(newConfig);
    setFiles((prev) =>
      prev.map((f) => (f.name === 'tsconfig.json' ? { ...f, content: newTsConfigContent } : f))
    );
  };

  // Add File / Folder
  const handleAddFile = (path: string) => {
    const newId = 'file_' + Math.random().toString(36).substring(2, 9);
    let defaultSnippet = '';

    if (path.endsWith('.json')) {
      defaultSnippet = '{\n  \n}\n';
    } else if (path.endsWith('.md')) {
      defaultSnippet = `# ${path}\n\n`;
    } else {
      const funcName = path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'helper';
      defaultSnippet = `// ${path}\nexport function ${funcName}() {\n  return 'Hello from ${path}';\n}\n`;
    }

    const newFile: ProjectFile = {
      id: newId,
      name: path,
      content: defaultSnippet,
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
  };

  // Delete File
  const handleDeleteFile = (fileId: string) => {
    if (files.length <= 1) return;
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);
    if (activeFileId === fileId) {
      setActiveFileId(newFiles[0].id);
    }
  };

  // Rename File / Path
  const handleRenameFile = (fileId: string, newPath: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, name: newPath } : f))
    );
  };

  // Import Files or Folder via Drag-and-Drop or File Picker
  const handleImportFiles = async (fileList: FileList) => {
    const imported = await extractFilesFromDataTransfer(fileList);
    if (imported.length > 0) {
      // Avoid duplicate names
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const filtered = imported.filter((f) => !existingNames.has(f.name));
        return [...prev, ...filtered];
      });
      setActiveFileId(imported[0].id);
      setConsoleEntries((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          level: 'info',
          timestamp: Date.now(),
          args: [`📥 Imported ${imported.length} file(s) into workspace`],
        },
      ]);
    }
  };

  // Download Active TS File
  const handleDownloadTs = () => {
    const blob = new Blob([activeFile.content], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.name.split('/').pop() || activeFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Compiled JS
  const handleDownloadJs = () => {
    const jsContent = compilationResult?.outputText || '';
    const jsName = (activeFile.name.split('/').pop() || activeFile.name).replace(/\.(ts|tsx)$/, '.js');
    const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = jsName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Full ZIP Project with complete folder tree mirror
  const handleDownloadZip = async () => {
    const zip = new JSZip();

    // Source files preserving folder hierarchy
    for (const f of files) {
      zip.file(f.name, f.content);
    }

    // Add compiled outputs inside dist/ mirror
    const distFolder = zip.folder('dist');
    for (const f of files) {
      if (f.name.endsWith('.ts') || f.name.endsWith('.tsx')) {
        const res = compileTypeScript(f.content, f.name, config);
        const outName = f.name.replace(/\.(ts|tsx)$/, '.js');
        distFolder?.file(outName, res.outputText);
      }
    }

    // Add package.json
    if (!files.some((f) => f.name === 'package.json')) {
      const pkg = {
        name: 'typescript-studio-project',
        version: '1.0.0',
        description: 'Exported from in-browser TypeScript Studio',
        scripts: {
          build: 'tsc',
        },
        devDependencies: {
          typescript: `^${ts.version}`,
        },
      };
      zip.file('package.json', JSON.stringify(pkg, null, 2));
    }

    // Add README.md
    if (!files.some((f) => f.name === 'README.md')) {
      const readme = `# TypeScript Project\n\nExported from TypeScript Studio.\n\n## Getting Started\n\`\`\`bash\nnpm install\nnpm run build\n\`\`\`\n`;
      zip.file('README.md', readme);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typescript-project-${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy Compiled JS
  const handleCopyJs = () => {
    if (compilationResult?.outputText) {
      navigator.clipboard.writeText(compilationResult.outputText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Reset Canvas
  const handleResetCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  };

  // Drag and Drop folder / files over window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const imported = await extractFilesFromDataTransfer(e.dataTransfer.items);
      if (imported.length > 0) {
        setFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const filtered = imported.filter((f) => !existingNames.has(f.name));
          return [...prev, ...filtered];
        });
        setActiveFileId(imported[0].id);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImportFiles(e.dataTransfer.files);
    }
  };

  // Keyboard shortcut for Cmd+Enter and Cmd+S
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        performRun();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleDownloadTs();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setShowFileTree((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [performRun, handleDownloadTs]);

  const activeDiagnostics = diagnosticsByFile[activeFile.id] || compilationResult?.diagnostics || [];
  const errorsList = activeDiagnostics.filter((d: any) => d.category === 'error');
  const hasErrors = errorsList.length > 0;

  const handleCopyErrors = () => {
    if (errorsList.length > 0) {
      const formatted = errorsList
        .map((err: any) => `${activeFile.name}:${err.line}:${err.column} - Syntax Error TS${err.code}: ${err.message}`)
        .join('\n');
      navigator.clipboard.writeText(formatted);
    }
  };

  return (
    <div
      className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Picker Input */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept=".ts,.tsx,.js,.jsx,.json,.txt,.md"
        onChange={(e) => e.target.files && handleImportFiles(e.target.files)}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-blue-900/70 backdrop-blur-sm border-2 border-dashed border-blue-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <Upload className="w-14 h-14 text-blue-200 mb-3 animate-bounce" />
          <p className="text-xl font-bold text-white">Drop Folders or TypeScript Files</p>
          <p className="text-xs text-blue-200 mt-1">Full folder hierarchies will be imported into IndexedDB VFS</p>
        </div>
      )}

      {/* Top Application Header */}
      <Header
        onRun={performRun}
        isRunning={isRunning}
        onSelectPreset={handleSelectPreset}
        currentPresetId={currentPresetId}
        onImportFiles={handleImportFiles}
        onDownloadTs={handleDownloadTs}
        onDownloadJs={handleDownloadJs}
        onDownloadZip={handleDownloadZip}
        onCopyJs={handleCopyJs}
        isCopied={isCopied}
        tsVersion={ts.version}
        compilationDurationMs={compilationResult?.durationMs}
        hasErrors={hasErrors}
        errorsCount={errorsList.length}
        config={config}
        onChangeConfig={handleConfigChange}
        onCopyErrors={handleCopyErrors}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost: File Tree Panel */}
        {showFileTree && (
          <FileTree
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFileId}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onImportTrigger={() => hiddenFileInputRef.current?.click()}
            diagnosticsByFile={diagnosticsByFile}
          />
        )}

        {/* Center: Code Editor with File Tabs */}
        {(layoutMode === 'split' || layoutMode === 'editor-only' || layoutMode === 'three-way') && (
          <div
            className={`flex flex-col border-r border-zinc-800 ${
              layoutMode === 'editor-only'
                ? 'flex-1'
                : layoutMode === 'three-way'
                ? 'w-5/12'
                : 'flex-1 md:w-1/2'
            }`}
          >
            {/* File Tabs Bar with Sidebar toggle button */}
            <div className="flex items-center bg-zinc-950 border-b border-zinc-800">
              <button
                onClick={() => setShowFileTree(!showFileTree)}
                title="Toggle Explorer Sidebar (Cmd+B)"
                className={`h-10 px-2.5 flex items-center justify-center border-r border-zinc-800 transition-colors ${
                  showFileTree ? 'text-blue-400 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <FolderTree className="w-4 h-4" />
              </button>

              <div className="flex-1 overflow-hidden">
                <FileTabs
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={setActiveFileId}
                  onAddFile={handleAddFile}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                />
              </div>

              {/* Reset to clean template button */}
              <button
                onClick={handleResetWorkspace}
                title="Reset workspace to template"
                className="h-10 px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 flex items-center text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CodeMirror TypeScript Editor */}
            <CodeEditor
              value={activeFile.content}
              fileName={activeFile.name}
              onChange={handleEditorChange}
              onRun={performRun}
              diagnostics={activeDiagnostics}
              fontSize={fontSize}
            />
          </div>
        )}

        {/* Middle: Compiled View when in three-way mode */}
        {layoutMode === 'three-way' && (
          <div className="w-3/12 border-r border-zinc-800 flex flex-col">
            <CompiledView
              compilationResult={compilationResult}
              config={config}
              activeFileName={activeFile.name}
              onDownloadJs={handleDownloadJs}
              fontSize={fontSize}
            />
          </div>
        )}

        {/* Right Side: Output Panes (Console / Compiled JS / Canvas) */}
        {(layoutMode === 'split' || layoutMode === 'right-only' || layoutMode === 'three-way') && (
          <div
            className={`flex flex-col ${
              layoutMode === 'right-only'
                ? 'flex-1'
                : layoutMode === 'three-way'
                ? 'w-4/12'
                : 'flex-1 md:w-1/2'
            }`}
          >
            {/* Right Pane Navigation Header (Tabs + Layout Switchers) */}
            <div className="h-10 border-b border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between select-none">
              {/* Tab Selector */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveRightTab('console')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeRightTab === 'console'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Console</span>
                  {consoleEntries.length > 0 && (
                    <span className="text-[10px] px-1 rounded bg-zinc-700/60 text-zinc-300 font-mono">
                      {consoleEntries.length}
                    </span>
                  )}
                </button>

                {layoutMode !== 'three-way' && (
                  <button
                    onClick={() => setActiveRightTab('compiled')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeRightTab === 'compiled'
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Compiled JS</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveRightTab('canvas')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeRightTab === 'canvas'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-pink-400" />
                  <span>Canvas</span>
                </button>
              </div>

              {/* Layout Mode Switcher */}
              <div className="hidden lg:flex items-center gap-1 text-zinc-500">
                <button
                  onClick={() => setLayoutMode('split')}
                  title="Split View (Editor + Output)"
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'split' ? 'bg-zinc-800 text-zinc-200' : 'hover:text-zinc-300'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setLayoutMode('three-way')}
                  title="3-Column View (Editor + Compiled JS + Console)"
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'three-way' ? 'bg-zinc-800 text-zinc-200' : 'hover:text-zinc-300'
                  }`}
                >
                  <div className="flex gap-0.5 items-center">
                    <div className="w-1 h-3 bg-current rounded-xs" />
                    <div className="w-1 h-3 bg-current rounded-xs" />
                    <div className="w-1 h-3 bg-current rounded-xs" />
                  </div>
                </button>
                <button
                  onClick={() => setLayoutMode(layoutMode === 'right-only' ? 'split' : 'right-only')}
                  title="Maximize Output Pane"
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'right-only' ? 'bg-zinc-800 text-zinc-200' : 'hover:text-zinc-300'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeRightTab === 'console' && (
                <ConsoleView
                  entries={consoleEntries}
                  executionResult={executionResult}
                  onClear={() => setConsoleEntries([])}
                  isRunning={isRunning}
                />
              )}

              {activeRightTab === 'compiled' && layoutMode !== 'three-way' && (
                <CompiledView
                  compilationResult={compilationResult}
                  config={config}
                  activeFileName={activeFile.name}
                  onDownloadJs={handleDownloadJs}
                  fontSize={fontSize}
                />
              )}

              {activeRightTab === 'canvas' && (
                <CanvasPreview
                  canvasRef={canvasRef}
                  containerRef={containerRef}
                  onReset={handleResetCanvas}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compiler Settings Modal */}
      <CompilerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onChangeConfig={handleConfigChange}
      />
    </div>
  );
}
