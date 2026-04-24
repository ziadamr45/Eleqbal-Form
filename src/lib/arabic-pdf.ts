/**
 * Arabic PDF utilities — font loading + text shaping for jsPDF
 */

// Cache base64 font data so we don't re-fetch from server
let fontDataCache: Record<string, string> = {};
let fontLoadPromise: Promise<Record<string, string>> | null = null;

/**
 * Fetch a TTF font from /fonts/ and return base64 string
 */
async function fetchFontAsBase64(filename: string): Promise<string> {
  if (fontDataCache[filename]) return fontDataCache[filename];

  const res = await fetch(`/fonts/${filename}`);
  if (!res.ok) throw new Error(`Failed to load font: ${filename}`);

  const arrayBuffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }

  const base64 = btoa(binary);
  fontDataCache[filename] = base64;
  return base64;
}

/**
 * Load font files from server (cached after first load).
 * Returns a promise that resolves with the base64 data for both fonts.
 */
function ensureFontDataLoaded(): Promise<Record<string, string>> {
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = Promise.all([
    fetchFontAsBase64('Amiri-Regular.ttf'),
    fetchFontAsBase64('Amiri-Bold.ttf'),
  ]).then(([regular, bold]) => {
    fontDataCache['Amiri-Regular.ttf'] = regular;
    fontDataCache['Amiri-Bold.ttf'] = bold;
    return fontDataCache;
  });

  return fontLoadPromise;
}

/**
 * Load and register Arabic fonts (Amiri) in jsPDF.
 * IMPORTANT: Must be called for EVERY new jsPDF instance because each
 * doc has its own Virtual File System (VFS).
 * Font binary data is cached to avoid re-fetching from the server.
 */
export async function registerArabicFonts(doc: {
  addFileToVFS: (n: string, d: string) => void;
  addFont: (n: string, family: string, style: string) => void;
}): Promise<void> {
  const fonts = await ensureFontDataLoaded();

  doc.addFileToVFS('Amiri-Regular.ttf', fonts['Amiri-Regular.ttf']);
  doc.addFileToVFS('Amiri-Bold.ttf', fonts['Amiri-Bold.ttf']);

  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
}

/**
 * Reshape Arabic text using arabic-reshaper.
 * Handles letter joining (initial, medial, final, isolated forms).
 */
export async function reshapeArabic(text: string): Promise<string> {
  if (!text) return text;
  // Only reshape if text contains Arabic characters
  if (!/[\u0600-\u06FF]/.test(text)) return text;

  try {
    const { convertArabic } = await import('arabic-reshaper') as { convertArabic: (t: string) => string };
    return convertArabic(text);
  } catch {
    return text;
  }
}

/**
 * Reverse text for RTL rendering in jsPDF (renders LTR, so we reverse).
 * Only reverses if the text is primarily Arabic.
 */
export function reverseForRtl(text: string): string {
  if (!text) return text;
  // Check if text is primarily Arabic
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars < text.length * 0.3) return text;

  // Reverse the string
  return text.split('').reverse().join('');
}

/**
 * Full Arabic text preparation: reshape + reverse for jsPDF rendering.
 */
export async function prepareArabicText(text: string): Promise<string> {
  if (!text) return text;
  const reshaped = await reshapeArabic(text);
  return reverseForRtl(reshaped);
}
