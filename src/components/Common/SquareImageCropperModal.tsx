import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Loader2, Move, Sparkles } from 'lucide-react';
import {
  cropAndCompressToSquareWebp,
  ProcessedSquareImage,
  STANDARD_IMAGE_SIZE
} from '../../lib/productImageService';

interface SquareImageCropperModalProps {
  file: File | null;
  productName?: string;
  isUploading?: boolean;
  uploadError?: string | null;
  onCancel: () => void;
  onConfirm: (processed: ProcessedSquareImage) => Promise<void> | void;
}

const PREVIEW_CANVAS_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export const SquareImageCropperModal: React.FC<SquareImageCropperModalProps> = ({
  file,
  productName,
  isUploading = false,
  uploadError = null,
  onCancel,
  onConfirm
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originOffsetX: 0,
    originOffsetY: 0
  });

  const [isImageReady, setIsImageReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Load selected File into an HTMLImageElement
  useEffect(() => {
    if (!file) {
      imageRef.current = null;
      setIsImageReady(false);
      setLoadError(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    setIsImageReady(false);
    setLoadError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    img.onload = () => {
      imageRef.current = img;
      setIsImageReady(true);
    };

    img.onerror = () => {
      imageRef.current = null;
      setLoadError('Could not read the selected image file. Please try another JPEG, PNG, or WebP photo.');
    };

    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Clamp pan offset so the product stays reachable inside the square frame
  const clampOffset = useCallback((nextX: number, nextY: number, currentZoom: number) => {
    const maxPan = PREVIEW_CANVAS_SIZE * 0.48 * currentZoom;
    return {
      x: Math.max(-maxPan, Math.min(maxPan, nextX)),
      y: Math.max(-maxPan, Math.min(maxPan, nextY))
    };
  }, []);

  // Render live 1:1 preview onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !isImageReady) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displaySize = PREVIEW_CANVAS_SIZE;
    if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
      canvas.width = displaySize * dpr;
      canvas.height = displaySize * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Pure white canvas fill (matches final 512x512 WebP output)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displaySize, displaySize);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const baseScale = Math.min(displaySize / img.naturalWidth, displaySize / img.naturalHeight);
    const drawW = img.naturalWidth * baseScale * zoom;
    const drawH = img.naturalHeight * baseScale * zoom;
    const drawX = (displaySize - drawW) / 2 + offset.x;
    const drawY = (displaySize - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }, [isImageReady, zoom, offset]);

  // Close on Escape when not busy
  useEffect(() => {
    if (!file) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing && !isUploading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, isUploading, onCancel]);

  if (!file) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isImageReady || isProcessing || isUploading) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originOffsetX: offset.x,
      originOffsetY: offset.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setOffset(clampOffset(drag.originOffsetX + dx, drag.originOffsetY + dy, zoom));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (drag.pointerId === e.pointerId) {
      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom.toFixed(2))));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirmCrop = async () => {
    const img = imageRef.current;
    if (!img || !isImageReady || isProcessing || isUploading) return;

    setIsProcessing(true);
    setLoadError(null);
    try {
      const processed = await cropAndCompressToSquareWebp(img, {
        offsetX: offset.x,
        offsetY: offset.y,
        zoom,
        viewportSize: PREVIEW_CANVAS_SIZE
      });
      await onConfirm(processed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process image.';
      setLoadError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const busy = isProcessing || isUploading;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Square Product Image Cropper"
    >
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F] shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              Crop Square Product Photo (1:1)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
              {productName ? `${productName} • ` : ''}
              Auto-saved as {STANDARD_IMAGE_SIZE}×{STANDARD_IMAGE_SIZE} WebP
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition shrink-0 disabled:opacity-40"
            aria-label="Close cropper"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto overscroll-contain">
          {/* Required Photography Tip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Plain background, product centered, good light.</span>
          </div>

          {/* Interactive Square Canvas Viewport */}
          <div className="flex flex-col items-center">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                width: `${PREVIEW_CANVAS_SIZE}px`,
                height: `${PREVIEW_CANVAS_SIZE}px`,
                touchAction: 'none'
              }}
              className="relative rounded-2xl overflow-hidden bg-white border-2 border-emerald-500/80 shadow-inner cursor-grab active:cursor-grabbing select-none"
            >
              <canvas
                ref={canvasRef}
                style={{ width: `${PREVIEW_CANVAS_SIZE}px`, height: `${PREVIEW_CANVAS_SIZE}px` }}
                className="block"
              />

              {/* Subtle 3x3 Rule-of-Thirds Guide */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-emerald-600/20" />
                <div className="border-r border-b border-emerald-600/20" />
                <div className="border-b border-emerald-600/20" />
                <div className="border-r border-b border-emerald-600/20" />
                <div className="border-r border-b border-emerald-600/20" />
                <div className="border-b border-emerald-600/20" />
                <div className="border-r border-emerald-600/20" />
                <div className="border-r border-emerald-600/20" />
                <div />
              </div>

              {!isImageReady && !loadError && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                </div>
              )}
            </div>

            <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-[#8FA69C]">
              <Move className="w-3 h-3" />
              <span>Drag photo to center • Pinch/slider to zoom</span>
            </p>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-1.5 bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl border border-slate-200/80 dark:border-[#24352F]">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC]">
              <span>Zoom ({Math.round(zoom * 100)}%)</span>
              <button
                type="button"
                disabled={busy}
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || zoom <= MIN_ZOOM}
                onClick={() => handleZoomChange(zoom - ZOOM_STEP)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] flex items-center justify-center text-slate-700 dark:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#223630] disabled:opacity-40 shrink-0"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                disabled={busy}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-600 h-2 cursor-pointer"
                aria-label="Zoom level"
              />
              <button
                type="button"
                disabled={busy || zoom >= MAX_ZOOM}
                onClick={() => handleZoomChange(zoom + ZOOM_STEP)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] flex items-center justify-center text-slate-700 dark:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#223630] disabled:opacity-40 shrink-0"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Errors */}
          {(loadError || uploadError) && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs font-bold text-rose-700 dark:text-rose-300">
              {loadError || uploadError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-[#24352F] flex items-center gap-2 shrink-0 bg-slate-50/60 dark:bg-[#0F1916]">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-xs font-bold text-slate-700 dark:text-[#8FA69C] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isImageReady || busy}
            onClick={handleConfirmCrop}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isUploading ? 'Uploading...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Crop & Upload</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
