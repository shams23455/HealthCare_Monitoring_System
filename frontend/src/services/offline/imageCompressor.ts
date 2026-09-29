/**
 * Client-side image compression, resizing, and quality evaluation
 * for low-bandwidth rural livestock observations.
 */

export interface ImageQualityCheckResult {
  quality: 'GOOD' | 'ACCEPTABLE' | 'POOR';
  score: number; // 0 to 100
  warning?: string;
  details: string[];
}

export interface CompressedImageResult {
  blob: Blob;
  width: number;
  height: number;
  size: number;
  qualityCheck: ImageQualityCheckResult;
}

export function evaluateClientImageQuality(
  width: number,
  height: number,
  size: number,
  canvasCtx?: CanvasRenderingContext2D | null
): ImageQualityCheckResult {
  const details: string[] = [];
  let score = 85;

  // 1. Resolution checks
  if (width < 300 || height < 300) {
    details.push('Resolution is very low (< 300px); physical clinical signs may be blurry.');
    score -= 40;
  } else if (width >= 800 && height >= 600) {
    details.push('Resolution is high and suitable for veterinary inspection.');
    score += 10;
  }

  // 2. File size checks
  if (size < 8 * 1024) {
    details.push('File size is very small (< 8 KB); severe compression artifacts likely.');
    score -= 30;
  }

  // 3. Luminance / Lighting check using canvas pixel sample if available
  if (canvasCtx && width > 0 && height > 0) {
    try {
      // Sample a small 50x50 region from center
      const sampleX = Math.floor(width / 4);
      const sampleY = Math.floor(height / 4);
      const sampleW = Math.min(60, Math.floor(width / 2));
      const sampleH = Math.min(60, Math.floor(height / 2));
      const imgData = canvasCtx.getImageData(sampleX, sampleY, sampleW, sampleH);
      const data = imgData.data;

      let totalBrightness = 0;
      const step = 4; // every pixel
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += step) {
        // perceived luminance formula
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalBrightness += lum;
      }

      const avgLum = totalBrightness / pixelCount;
      if (avgLum < 25) {
        details.push('Image appears underexposed or captured in dark lighting.');
        score -= 25;
      } else if (avgLum > 240) {
        details.push('Image appears overexposed or washed out by direct glare.');
        score -= 20;
      } else {
        details.push('Lighting and exposure are acceptable for visual triage.');
      }
    } catch {
      // Canvas read access might be restricted in cross-origin situations
    }
  }

  // Determine classification
  if (score < 50 || width < 300 || height < 300 || size < 8 * 1024) {
    return {
      quality: 'POOR',
      score: Math.max(10, score),
      warning: 'Photo quality may be too low for reliable review. Please capture another photo if possible.',
      details
    };
  }

  if (score >= 80 && width >= 800 && height >= 600) {
    return {
      quality: 'GOOD',
      score: Math.min(100, score),
      details
    };
  }

  return {
    quality: 'ACCEPTABLE',
    score: Math.min(79, score),
    details
  };
}

export async function compressImage(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving bounds
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Perform quality assessment on the drawn canvas
        const qualityCheck = evaluateClientImageQuality(width, height, file.size, ctx);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob conversion failed'));
              return;
            }
            resolve({
              blob,
              width,
              height,
              size: blob.size,
              qualityCheck
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
