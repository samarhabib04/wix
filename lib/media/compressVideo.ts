import type { FFmpeg } from "@ffmpeg/ffmpeg";

const MIN_BYTES_TO_COMPRESS = 1.5 * 1024 * 1024;
/** Skip wasm transcode above this to reduce OOM risk in the browser */
const MAX_BYTES_TO_COMPRESS = 92 * 1024 * 1024;

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (typeof window === "undefined") {
    throw new Error("Video compression runs in the browser only");
  }
  if (ffmpegSingleton?.loaded) {
    return ffmpegSingleton;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const coreVersion = "0.12.10";
      const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${coreVersion}/dist/esm`;
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegSingleton = ffmpeg;
      return ffmpeg;
    })();
  }
  return loadPromise;
}

function inputSuffix(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".webm")) return ".webm";
  if (n.endsWith(".mp4")) return ".mp4";
  if (file.type === "video/webm") return ".webm";
  return ".mp4";
}

export type VideoCompressProgress = (ratio: number) => void;

/**
 * Re-encodes video to H.264 MP4 (max width 1280, CRF-style quality, AAC audio).
 * Falls back to the original file if loading ffmpeg fails or the output is not smaller.
 */
export async function compressVideoForUpload(
  file: File,
  onProgress?: VideoCompressProgress
): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }
  if (!file.type.startsWith("video/")) {
    return file;
  }

  if (file.size < MIN_BYTES_TO_COMPRESS) {
    return file;
  }
  if (file.size > MAX_BYTES_TO_COMPRESS) {
    console.warn("[compressVideoForUpload] skipping transcode — file very large for in-browser ffmpeg");
    return file;
  }

  const { fetchFile } = await import("@ffmpeg/util");

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await getFFmpeg();
  } catch (e) {
    console.warn("[compressVideoForUpload] ffmpeg load failed:", e);
    return file;
  }

  const inName = `in${inputSuffix(file)}`;
  const outName = "out.mp4";

  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(0.99, Math.max(0, progress)));
  };
  ffmpeg.on("progress", onFfmpegProgress);

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));

    const code = await ffmpeg.exec([
      "-i",
      inName,
      "-vf",
      "scale='min(1280,iw)':-2",
      "-c:v",
      "libx264",
      "-crf",
      "28",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outName,
    ]);

    await ffmpeg.deleteFile(inName).catch(() => {});

    if (code !== 0) {
      await ffmpeg.deleteFile(outName).catch(() => {});
      return file;
    }

    const data = await ffmpeg.readFile(outName);
    await ffmpeg.deleteFile(outName).catch(() => {});

    if (typeof data === "string") {
      return file;
    }
    const buf = data;
    if (buf.byteLength === 0) {
      return file;
    }

    const outBlob = new Blob([new Uint8Array(buf)], { type: "video/mp4" });
    const stem = file.name.replace(/\.[^/.]+$/, "") || "video";
    const outFile = new File([outBlob], `${stem}.mp4`, {
      type: "video/mp4",
      lastModified: Date.now(),
    });

    if (outFile.size >= file.size * 0.98) {
      return file;
    }

    onProgress?.(1);
    return outFile;
  } catch (e) {
    console.warn("[compressVideoForUpload] transcode failed, using original:", e);
    return file;
  } finally {
    ffmpeg.off("progress", onFfmpegProgress);
  }
}
