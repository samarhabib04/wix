import type { Options } from "browser-image-compression";

export type ImageCompressionPreset =
  | "listing"
  | "avatar"
  | "blog"
  | "familyTree"
  | "logo"
  | "banner"
  | "promotion"
  | "documentImage";

const PRESETS: Record<ImageCompressionPreset, Options> = {
  /** Sale/showcase/stud listing photos, marketplace */
  listing: {
    maxWidthOrHeight: 2048,
    maxSizeMB: 1.75,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/webp",
  },
  /** Profile avatars — smaller dimensions, tight size cap */
  avatar: {
    maxWidthOrHeight: 512,
    maxSizeMB: 0.45,
    useWebWorker: true,
    initialQuality: 0.85,
    fileType: "image/webp",
  },
  /** Blog / CMS single images */
  blog: {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.25,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/webp",
  },
  /** Family tree thumbnails */
  familyTree: {
    maxWidthOrHeight: 1200,
    maxSizeMB: 0.9,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/webp",
  },
  /** Business logo — readable but compact */
  logo: {
    maxWidthOrHeight: 800,
    maxSizeMB: 0.5,
    useWebWorker: true,
    initialQuality: 0.86,
    fileType: "image/webp",
  },
  /** Business banner / cover */
  banner: {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1.35,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/webp",
  },
  /** Promotion / hero strips */
  promotion: {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1.2,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/webp",
  },
  /** JPEG/PNG pages uploaded as “documents” */
  documentImage: {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.0,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: "image/webp",
  },
};

function shouldSkipCompression(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/svg+xml") return true;
  if (t === "image/gif") return true;
  return false;
}

function webpFileName(originalName: string): string {
  const stem = originalName.replace(/\.[^/.]+$/, "");
  const safe = stem || "image";
  return `${safe}.webp`;
}

/**
 * Client-side image compression for Supabase uploads: WebP, capped dimensions,
 * bounded file size. Falls back to the original file if compression fails.
 */
export async function compressImageForUpload(
  file: File,
  preset: ImageCompressionPreset
): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }
  if (!file.type.startsWith("image/") || shouldSkipCompression(file)) {
    return file;
  }

  try {
    const imageCompression = (await import("browser-image-compression")).default;
    const options: Options = { ...PRESETS[preset] };
    const out = await imageCompression(file, options);
    const name = webpFileName(file.name);
    const compressed = new File([out], name, {
      type: "image/webp",
      lastModified: Date.now(),
    });
    if (process.env.NEXT_PUBLIC_IMAGE_COMPRESSION_DEBUG === "true") {
      const orig = file.size;
      const next = compressed.size;
      const pct = orig > 0 ? ((1 - next / orig) * 100).toFixed(1) : "0";
      console.info("[image compression]", {
        preset,
        originalBytes: orig,
        compressedBytes: next,
        approxReductionPercent: pct,
      });
    }
    return compressed;
  } catch (e) {
    console.warn("[compressImageForUpload] falling back to original:", e);
    return file;
  }
}

/**
 * Compress a cropped canvas blob (JPEG) before storage.
 */
export async function compressCroppedImageBlob(
  blob: Blob,
  preset: ImageCompressionPreset = "listing"
): Promise<File> {
  const file = new File([blob], "crop.jpg", { type: blob.type || "image/jpeg" });
  return compressImageForUpload(file, preset);
}
