"use client";

import { Camera, X, FolderOpen } from "lucide-react";
import Image from "next/image";
import type { Photo } from "@/hooks/useNewVisit";

interface PhotosSectionProps {
  photos: Photo[];
  cameraInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onOpenCamera: () => void;
  onOpenFilePicker: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (id: string) => void;
}

export function VisitPhotosSection({
  photos,
  cameraInputRef,
  fileInputRef,
  onOpenCamera,
  onOpenFilePicker,
  onFileChange,
  onRemovePhoto,
}: PhotosSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
        aria-label="צלם תמונה"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        aria-label="בחר תמונה"
      />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">תמונות</h2>
        <span className="text-sm text-gray-500">{photos.length}/3</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden"
          >
            {photo.url ? (
              <Image
                src={photo.url}
                alt={photo.name}
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 768px) 33vw, 150px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemovePhoto(photo.id)}
              className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="absolute bottom-0 right-0 left-0 text-xs text-white bg-black/50 px-2 py-1 truncate">
              {photo.name}
            </span>
          </div>
        ))}

        {photos.length < 3 && (
          <div className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 p-2">
            <button
              type="button"
              onClick={onOpenCamera}
              className="flex flex-col items-center gap-1 p-3 w-full rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Camera className="w-6 h-6 text-blue-500" />
              <span className="text-xs text-blue-600 font-medium">
                צלם תמונה
              </span>
            </button>
            <div className="w-full h-px bg-gray-200" />
            <button
              type="button"
              onClick={onOpenFilePicker}
              className="flex flex-col items-center gap-1 p-3 w-full rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FolderOpen className="w-6 h-6 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">
                בחר קובץ
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
