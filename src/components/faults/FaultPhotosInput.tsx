"use client";

import { useRef, useCallback } from "react";
import { Camera, X, FolderOpen } from "lucide-react";

async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface FaultPhotosInputProps {
  photos: string[];
  maxPhotos?: number;
  onPhotosChange: (photos: string[]) => void;
}

export function FaultPhotosInput({
  photos,
  maxPhotos = 2,
  onPhotosChange,
}: FaultPhotosInputProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (photos.length >= maxPhotos) return;
      if (!file.type.startsWith("image/")) return;
      try {
        const base64 = await compressImage(file, 800, 0.7);
        onPhotosChange([...photos, base64]);
      } catch {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string") onPhotosChange([...photos, result]);
        };
        reader.readAsDataURL(file);
      }
    },
    [photos, maxPhotos, onPhotosChange],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          תמונות (עד {maxPhotos})
        </label>
        <span className="text-sm text-gray-500">
          {photos.length}/{maxPhotos}
        </span>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="grid grid-cols-2 gap-3">
        {photos.map((url, i) => (
          <div
            key={i}
            className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="object-cover w-full h-full"
            />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1 left-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <div className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-2 w-full rounded-lg hover:bg-blue-50"
            >
              <Camera className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-blue-600">צלם</span>
            </button>
            <div className="w-full h-px bg-gray-200" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-2 w-full rounded-lg hover:bg-gray-100"
            >
              <FolderOpen className="w-5 h-5 text-gray-500" />
              <span className="text-xs text-gray-600">קובץ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
