/**
 * Image utilities for Wangs Pickle Marketplace
 * Provides client-side compression and URL resolution for uploaded product photos.
 */

/**
 * Compresses an image File to a lightweight JPEG Data URL (max 900x900, ~40-70KB)
 * using HTML5 Canvas. Prevents payload-too-large errors and guarantees fast uploads.
 */
export async function compressImageFile(file, maxDimension = 900, quality = 0.82) {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPG, PNG, WebP).');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;

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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // If canvas context unavailable, fallback to FileReader
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
          return;
        }

        // Fill white background to handle transparent PNGs converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        // Fallback to FileReader on canvas error
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to parse image file. Please try another photo.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Resolves product image URLs cleanly across local dev, Vercel SPA routing,
 * and direct backend Render media paths.
 */
export function resolveProductImage(url, fallback = '/featured-pouches.png') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  // Self-contained data URL (fastest & most reliable)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Absolute external URLs (e.g. Unsplash, S3, Cloudinary)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Backend /media/ paths:
  // On production (wangs.in), proxy rewrite routes /media/(.*) -> https://wangs.onrender.com/media/$1.
  // We can also point directly to Render backend as a direct fallback.
  if (trimmed.startsWith('/media/')) {
    const isProd = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    return isProd ? `https://wangs.onrender.com${trimmed}` : trimmed;
  }

  // Local static asset paths (e.g. /featured-pouches.png, /images/...)
  return trimmed;
}
