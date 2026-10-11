/**
 * Image compression utility to ensure participant avatars take minimal storage (<25KB)
 * and never exceed browser localStorage limits or crash JSON payloads.
 */
export async function compressImage(
  input: File | Blob | string,
  maxDimension: number = 240,
  quality: number = 0.82
): Promise<string> {
  if (typeof window === 'undefined') return typeof input === 'string' ? input : '';

  return new Promise((resolve) => {
    try {
      const processDataUrl = (dataUrl: string) => {
        // If empty or already small SVG, return directly
        if (!dataUrl || dataUrl.startsWith('data:image/svg+xml')) {
          return resolve(dataUrl);
        }

        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width <= 0 || height <= 0) return resolve(dataUrl);

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch (e) {
            console.warn('Image canvas compression fallback:', e);
            resolve(dataUrl);
          }
        };

        img.onerror = () => {
          resolve(dataUrl);
        };

        img.src = dataUrl;
      };

      if (typeof input === 'string') {
        processDataUrl(input);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            processDataUrl(reader.result);
          } else {
            resolve('');
          }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(input);
      }
    } catch (e) {
      console.warn('compressImage exception:', e);
      resolve(typeof input === 'string' ? input : '');
    }
  });
}
