import React, { useRef } from 'react';
import { RotateCcw, Palette, Sparkles } from 'lucide-react';

interface CanvasPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  canvasRef,
  containerRef,
  onReset,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#18181b] overflow-hidden text-zinc-300">
      {/* Top Bar */}
      <div className="h-10 border-b border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span className="font-semibold text-zinc-200">Canvas & DOM Output</span>
          <span className="text-zinc-500 font-mono text-[11px]">#preview-canvas · #preview-container</span>
        </div>

        <button
          onClick={onReset}
          title="Reset canvas and output"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-zinc-900/40">
        <div className="relative border border-zinc-800 rounded-lg overflow-hidden bg-black shadow-2xl max-w-full">
          <canvas
            ref={canvasRef}
            id="preview-canvas"
            width={480}
            height={280}
            className="block max-w-full h-auto bg-black"
          />
        </div>

        {/* DOM injection area for code that appends DOM nodes */}
        <div
          ref={containerRef}
          id="preview-container"
          className="w-full max-w-md mt-4 text-xs font-sans empty:hidden border border-zinc-800/80 rounded p-2 bg-zinc-950"
        />

        <div className="mt-4 text-center text-zinc-500 text-xs max-w-md font-mono">
          <p className="flex items-center justify-center gap-1.5 text-zinc-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Interactive Visual Sandbox</span>
          </p>
          <p className="text-[11px] text-zinc-500">
            Use <code className="text-blue-400">document.getElementById('preview-canvas')</code> to draw graphics,
            or <code className="text-blue-400">document.getElementById('preview-container')</code> to mount elements.
          </p>
        </div>
      </div>
    </div>
  );
};
