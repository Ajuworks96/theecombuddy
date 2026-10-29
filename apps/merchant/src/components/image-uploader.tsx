"use client";

import React, { useState, useRef } from "react";
import { UploadCloudIcon, TrashIcon, ImageIcon, CheckIcon, AlertCircleIcon } from "./icons";

export interface UploadedImage {
  id?: string;
  url: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  thumbnail?: string | null;
  onChange: (images: UploadedImage[], thumbnail: string | null) => void;
  maxFiles?: number;
}

export function ImageUploader({
  images,
  thumbnail,
  onChange,
  maxFiles = 10,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxFiles) {
      setErrorMessage(`Maximum of ${maxFiles} images allowed per product.`);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          throw new Error(`File ${file.name} is not an image.`);
        }
        formData.append("files", file);
      }

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      const uploaded: UploadedImage[] = (data.files || []).map((f: any) => ({
        id: f.id,
        url: f.url,
      }));

      const newImages = [...images, ...uploaded];
      const newThumbnail = thumbnail || (newImages.length > 0 ? newImages[0].url : null);
      onChange(newImages, newThumbnail);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (index: number) => {
    const removedImg = images[index];
    const newImages = images.filter((_, i) => i !== index);
    let newThumbnail: string | null = thumbnail ?? null;

    if (thumbnail === removedImg.url) {
      newThumbnail = newImages.length > 0 ? newImages[0].url : null;
    }

    onChange(newImages, newThumbnail);
  };

  const handleSetThumbnail = (url: string) => {
    onChange(images, url);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50/50"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
        } ${isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloudIcon size={24} />
            )}
          </div>
          <div className="text-sm font-medium text-slate-800">
            {isUploading ? (
              <span>Uploading images...</span>
            ) : (
              <span>
                <span className="text-emerald-600 font-semibold">Click to upload</span> or drag and drop
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            PNG, JPG, WebP up to 10MB each (max {maxFiles} images)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          <AlertCircleIcon size={16} className="shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
          {images.map((img, idx) => {
            const isPrimary = thumbnail === img.url || (!thumbnail && idx === 0);
            return (
              <div
                key={img.id || img.url || idx}
                className={`relative group rounded-lg overflow-hidden border ${
                  isPrimary
                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="aspect-square relative bg-slate-100 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Product image ${idx + 1}`}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <ImageIcon size={24} className="text-slate-400 absolute -z-0" />
                </div>

                {/* Primary Tag */}
                {isPrimary && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-600 text-white rounded-md shadow-xs">
                    Primary
                  </span>
                )}

                {/* Hover Action Bar */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetThumbnail(img.url);
                      }}
                      className="text-[11px] font-medium text-white hover:text-emerald-300 flex items-center gap-1"
                    >
                      <CheckIcon size={12} /> Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="p-1 rounded text-white hover:text-red-400 ml-auto"
                    title="Remove image"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
