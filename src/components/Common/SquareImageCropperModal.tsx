import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCcw,
  RotateCw,
  Check,
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Crop
} from 'lucide-react';
import {
  cropImageRegionToWebp,
  ProcessedSquareImage,
  NormalizedCropRect,
  ImageRotation,
  ALLOWED_IMAGE_ACCEPT,
  validateImageFile,
  formatFileSize,
  IDEAL_MAX_COMPRESSED_BYTES,
  PREFERRED_MAX_COMPRESSED_BYTES
} from '../../lib/productImageService';
import { useLanguage } from '../../context/LanguageContext';

interface SquareImageCropperModalProps {
  file: File | null;
  productName?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadError?: string | null;
  onReplaceFile?: (nextFile: File) => void;
  onCancel: () => void;
  onConfirm: (processed: ProcessedSquareImage) => Promise<void> | void;
}

type AspectPreset = 'free' | '1:1' | '4:3' | '3:4';
type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const STAGE_SIZE = 280;
const MIN_CROP_FRACTION = 0.14;

const ASPECT_RATIO_VALUE: Record<AspectPreset, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4
};

const computeCenteredCropForAspect = (
  imgW: number,
  imgH: number,
  aspect: AspectPreset
): NormalizedCropRect => {
  const targetRatio = ASPECT_RATIO_VALUE[aspect];
  if (!targetRatio || imgW <= 0 || imgH <= 0) {
    return { x: 0.02, y: 0.02, width: 0.96, height: 0.96 };
  }

  const imgRatio = imgW / imgH;
  if (imgRatio > targetRatio) {
    // Image is wider than target aspect: constrain width
    const normW = Math.min(1, (targetRatio / imgRatio) * 0.94);
    const normH = 0.94;
    return {
      x: (1 - normW) / 2,
      y: (1 - normH) / 2,
      width: normW,
      height: normH
    };
  }
  // Image is taller than target aspect: constrain height
  const normW = 0.94;
  const normH = Math.min(1, (imgRatio / targetRatio) * 0.94);
  return {
    x: (1 - normW) / 2,
    y: (1 - normH) / 2,
    width: normW,
    height: normH
  };
};

export const SquareImageCropperModal: React.FC<SquareImageCropperModalProps> = ({
  file,
  productName,
  isUploading = false,
  uploadProgress = 0,
  uploadError = null,
  onReplaceFile,
  onCancel,
  onConfirm
}) => {
  const { tr } = useLanguage();
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [isImageReady, setIsImageReady] = useState(false);
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<ImageRotation>(0);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('free');
  const [cropRect, setCropRect] = useState<NormalizedCropRect>({
    x: 0,
    y: 0,
    width: 1,
    height: 1
  });
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedPreview, setCompressedPreview] = useState<ProcessedSquareImage | null>(null);
  const [compressedPreviewUrl, setCompressedPreviewUrl] = useState<string | null>(null);
  const [showCompressedPreview, setShowCompressedPreview] = useState(false);

  const dragRef = useRef<{
    handle: DragHandle | null;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    originRect: NormalizedCropRect;
    boxLeft: number;
    boxTop: number;
    boxW: number;
    boxH: number;
  }>({
    handle: null,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    originRect: { x: 0, y: 0, width: 1, height: 1 },
    boxLeft: 0,
    boxTop: 0,
    boxW: STAGE_SIZE,
    boxH: STAGE_SIZE
  });

  // Compute displayed image rect inside the STAGE_SIZE x STAGE_SIZE canvas
  const getDisplayedImageBox = useCallback(
    (natW: number, natH: number, rot: ImageRotation) => {
      if (natW <= 0 || natH <= 0) {
        return { left: 0, top: 0, width: STAGE_SIZE, height: STAGE_SIZE, rotW: 1, rotH: 1 };
      }
      const swap = rot === 90 || rot === 270;
      const rotW = swap ? natH : natW;
      const rotH = swap ? natW : natH;
      const scale = Math.min(STAGE_SIZE / rotW, STAGE_SIZE / rotH);
      const width = rotW * scale;
      const height = rotH * scale;
      return {
        left: (STAGE_SIZE - width) / 2,
        top: (STAGE_SIZE - height) / 2,
        width,
        height,
        rotW,
        rotH
      };
    },
    []
  );

  // Load selected File into an HTMLImageElement
  useEffect(() => {
    if (!file) {
      imageRef.current = null;
      setIsImageReady(false);
      setLoadError(null);
      setCompressedPreview(null);
      setShowCompressedPreview(false);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    setIsImageReady(false);
    setLoadError(null);
    setCompressedPreview(null);
    setShowCompressedPreview(false);
    setRotation(0);
    setAspectPreset('free');
    setCropRect({ x: 0, y: 0, width: 1, height: 1 });

    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        imageRef.current = null;
        setLoadError(
          tr(
            'Selected image file appears corrupted. Please choose another photo.',
            'चुनी गई इमेज फ़ाइल खराब प्रतीत होती है। कृपया दूसरा फोटो चुनें।',
            'निवडलेली फोटो फाईल खराब दिसते. कृपया दुसरा फोटो निवडा.'
          )
        );
        return;
      }
      imageRef.current = img;
      setNaturalDims({ w: img.naturalWidth, h: img.naturalHeight });
      setIsImageReady(true);
    };

    img.onerror = () => {
      imageRef.current = null;
      setLoadError(
        tr(
          'Could not read the selected image file. Please try a valid JPEG, PNG, or WebP photo.',
          'चुनी गई इमेज फ़ाइल नहीं पढ़ी जा सकी। कृपया मान्य JPEG, PNG या WebP फोटो चुनें।',
          'निवडलेली इमेज फाईल वाचता आली नाही. कृपया वैध JPEG, PNG किंवा WebP फोटो निवडा.'
        )
      );
    };

    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, tr]);

  // Draw the rotated source photo onto the stage canvas
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !isImageReady || showCompressedPreview) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== STAGE_SIZE * dpr || canvas.height !== STAGE_SIZE * dpr) {
      canvas.width = STAGE_SIZE * dpr;
      canvas.height = STAGE_SIZE * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const box = getDisplayedImageBox(img.naturalWidth, img.naturalHeight, rotation);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, STAGE_SIZE, STAGE_SIZE);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(STAGE_SIZE / 2, STAGE_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = rotation === 90 || rotation === 270 ? box.height : box.width;
    const drawH = rotation === 90 || rotation === 270 ? box.width : box.height;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [isImageReady, rotation, showCompressedPreview, getDisplayedImageBox]);

  // Automatically generate cropped & compressed WebP locally whenever crop/rotation settles
  useEffect(() => {
    const img = imageRef.current;
    if (!file || !img || !isImageReady) return;

    let cancelled = false;
    setIsCompressing(true);

    const timer = window.setTimeout(async () => {
      try {
        const processed = await cropImageRegionToWebp(img, cropRect, rotation, file.size, file);
        if (!cancelled) {
          setCompressedPreview(processed);
          setLoadError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setCompressedPreview(null);
          setLoadError(err instanceof Error ? err.message : 'Failed to compress image.');
        }
      } finally {
        if (!cancelled) {
          setIsCompressing(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [file, isImageReady, cropRect, rotation]);

  // Object URL lifecycle for inspecting exact compressed WebP output
  useEffect(() => {
    if (!compressedPreview?.blob) {
      setCompressedPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(compressedPreview.blob);
    setCompressedPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [compressedPreview]);

  // Escape key closes modal when not uploading
  useEffect(() => {
    if (!file) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isUploading, onCancel]);

  if (!file) return null;

  const busy = isCompressing || isUploading;
  const imgBox = getDisplayedImageBox(naturalDims.w, naturalDims.h, rotation);

  const handleSelectAspect = (preset: AspectPreset) => {
    if (isUploading) return;
    setAspectPreset(preset);
    if (preset === 'free') {
      setCropRect({ x: 0, y: 0, width: 1, height: 1 });
    } else {
      setCropRect(computeCenteredCropForAspect(imgBox.rotW, imgBox.rotH, preset));
    }
  };

  const handleRotate = () => {
    if (isUploading) return;
    const nextRot = ((rotation + 90) % 360) as ImageRotation;
    setRotation(nextRot);
    const nextBox = getDisplayedImageBox(naturalDims.w, naturalDims.h, nextRot);
    if (aspectPreset === 'free') {
      setCropRect({ x: 0, y: 0, width: 1, height: 1 });
    } else {
      setCropRect(computeCenteredCropForAspect(nextBox.rotW, nextBox.rotH, aspectPreset));
    }
  };

  const handleReset = () => {
    if (isUploading) return;
    setRotation(0);
    setAspectPreset('free');
    setCropRect({ x: 0, y: 0, width: 1, height: 1 });
  };

  const startDrag = (handle: DragHandle, e: React.PointerEvent<HTMLElement>) => {
    if (!isImageReady || isUploading || showCompressedPreview) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originRect: { ...cropRect },
      boxLeft: imgBox.left,
      boxTop: imgBox.top,
      boxW: Math.max(1, imgBox.width),
      boxH: Math.max(1, imgBox.height)
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag.handle || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();

    const dx = (e.clientX - drag.startClientX) / drag.boxW;
    const dy = (e.clientY - drag.startClientY) / drag.boxH;
    const orig = drag.originRect;
    const targetRatio = ASPECT_RATIO_VALUE[aspectPreset];
    const imgRatio = drag.boxW / drag.boxH;

    if (drag.handle === 'move') {
      const nextX = Math.max(0, Math.min(1 - orig.width, orig.x + dx));
      const nextY = Math.max(0, Math.min(1 - orig.height, orig.y + dy));
      setCropRect({ x: nextX, y: nextY, width: orig.width, height: orig.height });
      return;
    }

    let left = orig.x;
    let top = orig.y;
    let right = orig.x + orig.width;
    let bottom = orig.y + orig.height;

    if (drag.handle === 'nw' || drag.handle === 'sw') {
      left = Math.max(0, Math.min(right - MIN_CROP_FRACTION, orig.x + dx));
    }
    if (drag.handle === 'ne' || drag.handle === 'se') {
      right = Math.min(1, Math.max(left + MIN_CROP_FRACTION, orig.x + orig.width + dx));
    }
    if (drag.handle === 'nw' || drag.handle === 'ne') {
      top = Math.max(0, Math.min(bottom - MIN_CROP_FRACTION, orig.y + dy));
    }
    if (drag.handle === 'sw' || drag.handle === 'se') {
      bottom = Math.min(1, Math.max(top + MIN_CROP_FRACTION, orig.y + orig.height + dy));
    }

    let width = right - left;
    let height = bottom - top;

    // Enforce locked aspect ratio if preset is active
    if (targetRatio) {
      const desiredNormH = (width * imgRatio) / targetRatio;
      if (drag.handle === 'nw' || drag.handle === 'ne') {
        const clampedH = Math.min(bottom, Math.max(MIN_CROP_FRACTION, desiredNormH));
        top = bottom - clampedH;
        height = clampedH;
        width = (height * targetRatio) / imgRatio;
        if (drag.handle === 'nw') left = Math.max(0, right - width);
        else right = Math.min(1, left + width);
        width = right - left;
      } else {
        const clampedH = Math.min(1 - top, Math.max(MIN_CROP_FRACTION, desiredNormH));
        height = clampedH;
        bottom = top + clampedH;
        width = (height * targetRatio) / imgRatio;
        if (drag.handle === 'sw') left = Math.max(0, right - width);
        else right = Math.min(1, left + width);
        width = right - left;
      }
    }

    setCropRect({
      x: Math.max(0, left),
      y: Math.max(0, top),
      width: Math.max(MIN_CROP_FRACTION, Math.min(1 - Math.max(0, left), width)),
      height: Math.max(MIN_CROP_FRACTION, Math.min(1 - Math.max(0, top), height))
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.handle = null;
      dragRef.current.pointerId = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleReplaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0];
    e.target.value = '';
    if (!nextFile || !onReplaceFile) return;

    const validation = validateImageFile(nextFile);
    if (!validation.valid) {
      setLoadError(validation.error || 'Unsupported image file.');
      return;
    }
    setLoadError(null);
    onReplaceFile(nextFile);
  };

  const handleConfirmUpload = async () => {
    const img = imageRef.current;
    if (!img || !isImageReady || busy) return;

    try {
      const processed =
        compressedPreview ??
        (await cropImageRegionToWebp(img, cropRect, rotation, file.size, file));
      await onConfirm(processed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process image.';
      setLoadError(message);
    }
  };

  // Overlay pixel coordinates for the active crop box inside STAGE_SIZE x STAGE_SIZE
  const cropPxLeft = imgBox.left + cropRect.x * imgBox.width;
  const cropPxTop = imgBox.top + cropRect.y * imgBox.height;
  const cropPxW = cropRect.width * imgBox.width;
  const cropPxH = cropRect.height * imgBox.height;

  const sizeBadgeTone = !compressedPreview
    ? 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
    : compressedPreview.compressedBytes <= IDEAL_MAX_COMPRESSED_BYTES
    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
    : compressedPreview.compressedBytes <= PREFERRED_MAX_COMPRESSED_BYTES
    ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';

  const effectiveProgress = isUploading ? Math.max(10, Math.min(100, uploadProgress || 45)) : 0;

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/75 flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tr('Crop, Compress & Upload Product Photo', 'फोटो क्रॉप, कंप्रेस और अपलोड करें', 'फोटो क्रॉप, कॉम्प्रेस व अपलोड करा')}
    >
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F] shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <Crop className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{tr('Crop & Optimize Photo', 'फोटो क्रॉप व ऑप्टिमाइज़', 'फोटो क्रॉप व ऑप्टिमाइझ')}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
              {productName ? `${productName} • ` : ''}
              {tr('Drag corners to crop • Auto ~20 KB WebP', 'कोने खींचकर क्रॉप करें • ऑटो ~20 KB WebP', 'कोपरे ओढून क्रॉप करा • ऑटो ~20 KB WebP')}
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition shrink-0 disabled:opacity-40 cursor-pointer"
            aria-label={tr('Close', 'बंद करें', 'बंद करा')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-3 overflow-y-auto overscroll-contain">
          {/* Mode Switcher + Replace Photo */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-[#1A2A25] p-0.5 border border-slate-200/80 dark:border-[#24352F]">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setShowCompressedPreview(false)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  !showCompressedPreview
                    ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-500 dark:text-[#8FA69C]'
                }`}
              >
                {tr('Crop Frame', 'क्रॉप फ़्रेम', 'क्रॉप फ्रेम')}
              </button>
              <button
                type="button"
                disabled={isUploading || !compressedPreviewUrl}
                onClick={() => setShowCompressedPreview(true)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer disabled:opacity-40 ${
                  showCompressedPreview
                    ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-500 dark:text-[#8FA69C]'
                }`}
              >
                {tr('WebP Result', 'WebP प्रीव्यू', 'WebP प्रीव्ह्यू')}
              </button>
            </div>

            {onReplaceFile && (
              <>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => replaceInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] hover:bg-slate-50 dark:hover:bg-[#223630] text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] transition cursor-pointer disabled:opacity-40"
                >
                  <Upload className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{tr('Replace', 'बदलें', 'बदला')}</span>
                </button>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_ACCEPT}
                  onChange={handleReplaceInputChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Interactive Crop Stage */}
          <div className="flex flex-col items-center">
            <div
              style={{
                width: `${STAGE_SIZE}px`,
                height: `${STAGE_SIZE}px`,
                touchAction: 'none'
              }}
              className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0B1411] border-2 border-emerald-500/80 shadow-inner select-none flex items-center justify-center"
            >
              {showCompressedPreview && compressedPreviewUrl ? (
                <img
                  src={compressedPreviewUrl}
                  alt={productName || 'Compressed WebP preview'}
                  className="max-w-full max-h-full object-contain bg-white"
                />
              ) : (
                <>
                  <canvas
                    ref={stageCanvasRef}
                    style={{ width: `${STAGE_SIZE}px`, height: `${STAGE_SIZE}px` }}
                    className="block"
                  />

                  {/* Interactive Resizable & Draggable Crop Overlay */}
                  {isImageReady && (
                    <div
                      onPointerDown={(e) => startDrag('move', e)}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      style={{
                        left: `${cropPxLeft}px`,
                        top: `${cropPxTop}px`,
                        width: `${cropPxW}px`,
                        height: `${cropPxH}px`,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.48)'
                      }}
                      className="absolute border-2 border-emerald-400 cursor-move"
                    >
                      {/* 3x3 Rule-of-Thirds Grid */}
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-white/40" />
                        <div className="border-r border-white/40" />
                        <div />
                      </div>

                      {/* 4 Touch-Friendly Corner Resize Handles */}
                      <button
                        type="button"
                        aria-label="Resize top-left corner"
                        onPointerDown={(e) => startDrag('nw', e)}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        className="absolute -top-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow" />
                      </button>
                      <button
                        type="button"
                        aria-label="Resize top-right corner"
                        onPointerDown={(e) => startDrag('ne', e)}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow" />
                      </button>
                      <button
                        type="button"
                        aria-label="Resize bottom-left corner"
                        onPointerDown={(e) => startDrag('sw', e)}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        className="absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow" />
                      </button>
                      <button
                        type="button"
                        aria-label="Resize bottom-right corner"
                        onPointerDown={(e) => startDrag('se', e)}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        className="absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {!isImageReady && !loadError && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Aspect Presets + Rotate 90° + Reset */}
          {!showCompressedPreview && (
            <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-[#1A2A25] p-2 rounded-xl border border-slate-200/80 dark:border-[#24352F]">
              <div className="flex items-center gap-1">
                {(['free', '1:1', '4:3', '3:4'] as AspectPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={isUploading}
                    onClick={() => handleSelectAspect(preset)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      aspectPreset === preset
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-[#131F1B] text-slate-600 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F] hover:text-emerald-700'
                    }`}
                  >
                    {preset === 'free' ? tr('Free', 'फ़्री', 'फ्री') : preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleRotate}
                  title={tr('Rotate 90°', '90° घुमाएं', '90° फिरवा')}
                  aria-label={tr('Rotate 90 degrees', '90 डिग्री घुमाएं', '90 अंश फिरवा')}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] flex items-center justify-center text-slate-700 dark:text-[#E7F0EC] hover:text-emerald-600 transition cursor-pointer disabled:opacity-40"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleReset}
                  title={tr('Reset crop', 'क्रॉप रीसेट', 'क्रॉप रीसेट')}
                  aria-label={tr('Reset crop', 'क्रॉप रीसेट', 'क्रॉप रीसेट')}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] flex items-center justify-center text-slate-700 dark:text-[#E7F0EC] hover:text-emerald-600 transition cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Compression Stats Summary (Original, Compressed, Saved %) */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-600 dark:text-[#8FA69C]">
                {tr('Compression Summary', 'कम्प्रेशन सारांश', 'कॉम्प्रेशन सारांश')}
              </span>
              {isCompressing ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{tr('Compressing...', 'कंप्रेस हो रहा है...', 'कॉम्प्रेस होत आहे...')}</span>
                </span>
              ) : compressedPreview ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${sizeBadgeTone}`}>
                  {compressedPreview.extension.toUpperCase()} • {compressedPreview.width}×{compressedPreview.height}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200/70 dark:border-[#24352F]">
                <p className="text-[10px] font-medium text-slate-500 dark:text-[#8FA69C]">
                  {tr('Original', 'मूल साइज़', 'मूळ साईझ')}
                </p>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200/70 dark:border-[#24352F]">
                <p className="text-[10px] font-medium text-slate-500 dark:text-[#8FA69C]">
                  {tr('Compressed', 'कंप्रेस्ड', 'कॉम्प्रेस्ड')}
                </p>
                <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                  {compressedPreview ? formatFileSize(compressedPreview.compressedBytes) : '—'}
                </p>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200/70 dark:border-[#24352F]">
                <p className="text-[10px] font-medium text-slate-500 dark:text-[#8FA69C]">
                  {tr('Saved', 'बचत', 'बचत')}
                </p>
                <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                  {compressedPreview ? `${compressedPreview.savedPercent}%` : '—'}
                </p>
              </div>
            </div>

            {compressedPreview?.prioritizedClarity && (
              <div className="flex items-start gap-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200/80 dark:border-amber-800/40">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {tr(
                    'Clarity prioritized so product label, brand text, and barcode stay clearly legible.',
                    'उत्पाद लेबल और टेक्स्ट साफ़ रखने के लिए क्लैरिटी को प्राथमिकता दी गई।',
                    'उत्पादन लेबल व मजकूर स्पष्ट राहण्यासाठी क्लॅरिटीला प्राधान्य दिले आहे.'
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tr('Uploading compressed WebP...', 'कंप्रेस्ड WebP अपलोड हो रहा है...', 'कॉम्प्रेस्ड WebP अपलोड होत आहे...')}</span>
                </span>
                <span className="tabular-nums">{effectiveProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-emerald-200/70 dark:bg-emerald-900/60 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-200 rounded-full"
                  style={{ width: `${effectiveProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {(loadError || uploadError) && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loadError || uploadError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-[#24352F] flex items-center gap-2 shrink-0 bg-slate-50/60 dark:bg-[#0F1916]">
          <button
            type="button"
            disabled={isUploading}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-xs font-bold text-slate-700 dark:text-[#8FA69C] transition disabled:opacity-50 cursor-pointer"
          >
            {tr('Cancel', 'रद्द करें', 'रद्द करा')}
          </button>
          <button
            type="button"
            disabled={!isImageReady || !compressedPreview || busy}
            onClick={handleConfirmUpload}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tr('Uploading...', 'अपलोड हो रहा है...', 'अपलोड होत आहे...')}</span>
              </>
            ) : isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tr('Compressing...', 'कंप्रेस हो रहा है...', 'कॉम्प्रेस होत आहे...')}</span>
              </>
            ) : uploadError ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{tr('Retry Upload', 'पुनः अपलोड करें', 'पुन्हा अपलोड करा')}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{tr('Crop & Upload', 'क्रॉप व अपलोड', 'क्रॉप व अपलोड')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
