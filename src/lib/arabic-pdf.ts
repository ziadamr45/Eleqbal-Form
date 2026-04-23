/**
 * Arabic PDF utilities — font loading + text shaping for jsPDF
 */

// Cache loaded fonts to avoid re-fetching
let fontCache: Record<string, string> = {};
let fontsRegistered = false;

/**
 * Fetch a TTF font from /fonts/ and return base64 string
 */
async function fetchFontAsBase64(filename: string): Promise<string> {
  if (fontCache[filename]) return fontCache[filename];

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
  fontCache[filename] = base64;
  return base64;
}

/**
 * Load and register Arabic fonts (Amiri) in jsPDF.
 * Call this once before generating any Arabic PDF.
 */
export async function registerArabicFonts(doc: { addFileToVFS: (n: string, d: string) => void; addFont: (n: string, family: string, style: string) => void }): Promise<void> {
  if (fontsRegistered) return;

  const [regularB64, boldB64] = await Promise.all([
    fetchFontAsBase64('Amiri-Regular.ttf'),
    fetchFontAsBase64('Amiri-Bold.ttf'),
  ]);

  doc.addFileToVFS('Amiri-Regular.ttf', regularB64);
  doc.addFileToVFS('Amiri-Bold.ttf', boldB64);

  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');

  fontsRegistered = true;
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
