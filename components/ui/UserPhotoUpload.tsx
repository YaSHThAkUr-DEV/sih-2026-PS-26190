'use client';

import React, { useRef, useState } from 'react';

interface UserPhotoUploadProps {
  value?: string | null;
  onChange: (photoDataUrl: string | null) => void;
  name?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  helperText?: string;
}

export function UserPhotoUpload({
  value,
  onChange,
  name = '',
  disabled = false,
  size = 'md',
  label = 'Official Officer Photo',
  helperText = 'Clear frontal portrait for AI Face Recognition & Biometric Clearance.',
}: UserPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Derive Fallback Initials
  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  // Dimension presets
  const sizeClasses = {
    sm: {
      avatar: 'w-16 h-16 text-sm',
      iconSize: 'text-[18px]',
      badge: 'text-[9px] px-2 py-0.5',
    },
    md: {
      avatar: 'w-24 h-24 text-lg',
      iconSize: 'text-[22px]',
      badge: 'text-[10px] px-2.5 py-0.5',
    },
    lg: {
      avatar: 'w-32 h-32 text-2xl',
      iconSize: 'text-[26px]',
      badge: 'text-[11px] px-3 py-1',
    },
  }[size];

  // Process & compress image file via HTML5 Canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setUploadError(null);
    setProcessing(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError('Failed to read selected image file.');
      setProcessing(false);
    };

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        setUploadError('Failed to decode image data.');
        setProcessing(false);
      };

      img.onload = () => {
        try {
          // Normalize to max 400x400 square for fast processing and optimal AI face detection
          const targetSize = 400;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context could not be created.');
          }

          // Center crop to square
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Export as WebP or JPEG compressed
          let dataUrl = canvas.toDataURL('image/webp', 0.85);
          // Fallback to jpeg if webp unsupported
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          onChange(dataUrl);
        } catch (err: any) {
          setUploadError(err.message || 'Image compression failed.');
        } finally {
          setProcessing(false);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset file input value so re-selecting same file fires onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || processing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !processing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || processing) return;
    onChange(null);
    setUploadError(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[#10141A] font-semibold text-xs">
            {label}
          </label>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#3f5e93] bg-[rgba(131,162,219,0.12)] border border-[#83A2DB]/30 px-2 py-0.5 rounded-full font-mono">
            <span className="material-symbols-outlined text-[13px]">face</span>
            <span>AI Face Biometrics Ready</span>
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 p-3.5 rounded-[20px] bg-[#f0f3ff]/60 border border-[#D8DEEA] transition hover:bg-[#f0f3ff]">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          disabled={disabled || processing}
          className="hidden"
        />

        {/* Circular Avatar / Live Preview */}
        <div
          onClick={() => !disabled && !processing && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative shrink-0 rounded-full border-2 transition-all duration-200 overflow-hidden flex items-center justify-center cursor-pointer shadow-sm group ${
            sizeClasses.avatar
          } ${
            isDragging
              ? 'border-[#3f5e93] ring-4 ring-[#83A2DB]/40 scale-105'
              : value
              ? 'border-emerald-400 bg-white ring-2 ring-emerald-400/20'
              : 'border-dashed border-[#83A2DB] bg-white hover:border-[#3f5e93] hover:ring-2 hover:ring-[#83A2DB]/20'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={value ? 'Click or drop to replace photo' : 'Click or drop to upload photo'}
        >
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={name || 'User Photo'}
                className="w-full h-full object-cover rounded-full"
              />
              {/* Hover overlay with camera icon */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/45 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full backdrop-blur-2xs">
                  <span className={`material-symbols-outlined ${sizeClasses.iconSize}`}>
                    photo_camera
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">
                    Change
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-1 w-full h-full bg-gradient-to-br from-slate-900 to-[#1e293b] text-white">
              {processing ? (
                <span className="material-symbols-outlined text-[20px] animate-spin text-white">
                  sync
                </span>
              ) : name ? (
                <span className="font-bold tracking-tight select-none">
                  {initials}
                </span>
              ) : (
                <span className={`material-symbols-outlined text-slate-300 ${sizeClasses.iconSize}`}>
                  add_a_photo
                </span>
              )}
            </div>
          )}

          {/* AI Face Recognition Enrolled Indicator Ring */}
          {value && (
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 text-white border-2 border-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[12px] font-bold">
                check
              </span>
            </div>
          )}
        </div>

        {/* Info & Action Controls */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] text-xs font-semibold border border-[#D8DEEA] transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px] text-[#3f5e93]">
                {value ? 'cached' : 'upload'}
              </span>
              <span>{processing ? 'Processing...' : value ? 'Change Photo' : 'Upload Photo'}</span>
            </button>

            {value && (
              <button
                type="button"
                disabled={disabled || processing}
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Remove photo and revert to initials"
              >
                <span className="material-symbols-outlined text-[14px]">
                  delete
                </span>
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-[#6B7280] leading-tight">
            {helperText}
          </p>

          {uploadError && (
            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">error</span>
              <span>{uploadError}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
