import React, { useState, useRef, useEffect } from 'react';
import { FileCode, Plus, X, Edit2, Check } from 'lucide-react';
import { ProjectFile } from '../types';

interface FileTabsProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onAddFile: (name: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
}

export const FileTabs: React.FC<FileTabsProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onRenameFile,
}) => {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');

  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFileId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFileId]);

  useEffect(() => {
    if (isAddingNew && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAddingNew]);

  const handleStartRename = (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditingName(file.name);
  };

  const handleSaveRename = (fileId: string) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== '') {
      const finalName = trimmed.endsWith('.ts') || trimmed.endsWith('.tsx') || trimmed.endsWith('.js') || trimmed.endsWith('.json')
        ? trimmed
        : `${trimmed}.ts`;
      onRenameFile(fileId, finalName);
    }
    setEditingFileId(null);
  };

  const handleSaveNewFile = () => {
    const trimmed = newFileName.trim();
    if (trimmed) {
      const finalName = trimmed.endsWith('.ts') || trimmed.endsWith('.tsx') || trimmed.endsWith('.js') || trimmed.endsWith('.json')
        ? trimmed
        : `${trimmed}.ts`;
      onAddFile(finalName);
      setNewFileName('');
    }
    setIsAddingNew(false);
  };

  return (
    <div className="h-10 border-b border-zinc-800 bg-zinc-950 flex items-center px-2 gap-1 overflow-x-auto scrollbar-none select-none">
      {files.map((file) => {
        const isActive = file.id === activeFileId;
        const isEditing = file.id === editingFileId;

        return (
          <div
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            onDoubleClick={(e) => handleStartRename(file, e)}
            className={`group relative flex items-center gap-2 h-8 px-3 rounded-md text-xs font-mono transition-colors cursor-pointer border ${
              isActive
                ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-sm'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <FileCode
              className={`w-3.5 h-3.5 shrink-0 ${
                file.name.endsWith('.tsx') || file.name.endsWith('.jsx')
                  ? 'text-cyan-400'
                  : file.name.endsWith('.json')
                  ? 'text-amber-400'
                  : 'text-blue-400'
              }`}
            />

            {isEditing ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(file.id);
                    if (e.key === 'Escape') setEditingFileId(null);
                  }}
                  onBlur={() => handleSaveRename(file.id)}
                  className="bg-zinc-800 text-zinc-100 px-1 py-0.5 rounded outline-none border border-blue-500 w-24 text-xs font-mono"
                />
                <button
                  onClick={() => handleSaveRename(file.id)}
                  className="text-emerald-400 hover:text-emerald-300 p-0.5"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="truncate max-w-[130px]">{file.name}</span>
            )}

            {file.isEntry && !isEditing && (
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-sans tracking-wide">
                main
              </span>
            )}

            {/* Rename button on hover */}
            {!isEditing && (
              <button
                onClick={(e) => handleStartRename(file, e)}
                title="Rename file"
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity p-0.5"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Close / Delete tab button (only if more than 1 file) */}
            {files.length > 1 && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.id);
                }}
                title="Delete file"
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {/* New File Inline Form or Add Button */}
      {isAddingNew ? (
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 h-8 px-2 rounded-md">
          <input
            ref={addInputRef}
            type="text"
            placeholder="utils.ts"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNewFile();
              if (e.key === 'Escape') setIsAddingNew(false);
            }}
            onBlur={handleSaveNewFile}
            className="bg-transparent text-xs text-zinc-100 outline-none w-24 font-mono placeholder:text-zinc-600"
          />
          <button
            onClick={handleSaveNewFile}
            className="text-emerald-400 hover:text-emerald-300 p-0.5"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsAddingNew(false)}
            className="text-zinc-500 hover:text-zinc-400 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsAddingNew(true);
            setNewFileName('');
          }}
          title="Create new file (+)"
          className="h-8 px-2.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 flex items-center gap-1 text-xs font-mono transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      )}
    </div>
  );
};
