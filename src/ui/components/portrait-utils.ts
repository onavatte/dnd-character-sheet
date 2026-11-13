/**
 * Utilitaire client de redimensionnement et compression d'image pour le portrait du personnage.
 * Produit une Data URL légère (WebP prioritaire, repli JPEG) embarquable dans IndexedDB et JSON.
 */

import defaultPortraitAsset from '../assets/avatar_placeholder_512.png';

/**
 * Portrait affiché par défaut lorsqu'aucune image personnalisée n'a été importée.
 */
export const DEFAULT_PORTRAIT_URL: string = defaultPortraitAsset;

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface PortraitCompressionResult {
  dataUrl: string;
  byteEstimate: number;
  mimeType: 'image/webp' | 'image/jpeg';
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Impossible de décoder cette image.'));
    img.src = src;
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return dataUrl.length;
  const base64Length = dataUrl.length - commaIdx - 1;
  return Math.round((base64Length * 3) / 4);
}

/**
 * Redimensionne proportionnellement une image (max 512x512 px) et la compresse côté client.
 */
export async function compressPortraitFile(
  file: File,
  maxDimension = 512,
  quality = 0.82,
): Promise<PortraitCompressionResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error(
      'Format invalide : veuillez choisir un fichier image (PNG, JPEG ou WebP).',
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      'Image trop volumineuse : la taille brute maximale autorisée est de 15 Mo.',
    );
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    if (width <= 0 || height <= 0) {
      throw new Error('Dimensions de l’image invalides.');
    }

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('Contexte graphique Canvas 2D indisponible.');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const webpUrl = canvas.toDataURL('image/webp', quality);
    if (webpUrl.startsWith('data:image/webp')) {
      return {
        dataUrl: webpUrl,
        byteEstimate: estimateDataUrlBytes(webpUrl),
        mimeType: 'image/webp',
      };
    }

    const jpegUrl = canvas.toDataURL('image/jpeg', quality);
    if (jpegUrl.startsWith('data:image/jpeg')) {
      return {
        dataUrl: jpegUrl,
        byteEstimate: estimateDataUrlBytes(jpegUrl),
        mimeType: 'image/jpeg',
      };
    }

    throw new Error('Impossible d’encoder le portrait compressé.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
