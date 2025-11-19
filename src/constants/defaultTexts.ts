// Default animation text in English
export const DEFAULT_TEXTS_EN = {
  scanning: 'Scanning QR Code...',
  detected: 'QR Code Detected!',
  processing: 'Processing...',
  success: 'Found {count} QR Code(s)!',
  detectedCount: 'Detected {count} QR code{plural}',
};

// Default animation text in Vietnamese
export const DEFAULT_TEXTS_VI = {
  scanning: 'Đang nhận dạng QR Code...',
  detected: 'Đã phát hiện QR Code!',
  processing: 'Đang nhận dạng...',
  success: 'Đã tìm thấy {count} QR Code!',
  detectedCount: 'Đã phát hiện {count} mã QR',
};

// Default animation text in Chinese
export const DEFAULT_TEXTS_ZH = {
  scanning: '正在扫描二维码...',
  detected: '检测到二维码！',
  processing: '处理中...',
  success: '找到 {count} 个二维码！',
  detectedCount: '检测到 {count} 个二维码',
};

// Default animation text in Japanese
export const DEFAULT_TEXTS_JA = {
  scanning: 'QRコードをスキャン中...',
  detected: 'QRコードを検出しました！',
  processing: '処理中...',
  success: '{count}個のQRコードが見つかりました！',
  detectedCount: '{count}個のQRコードを検出しました',
};

// Default animation text in Spanish
export const DEFAULT_TEXTS_ES = {
  scanning: 'Escaneando código QR...',
  detected: '¡Código QR detectado!',
  processing: 'Procesando...',
  success: '¡Se encontraron {count} código(s) QR!',
  detectedCount: 'Detectado{plural} {count} código{plural} QR',
};

// Default animation text in French
export const DEFAULT_TEXTS_FR = {
  scanning: 'Scan du code QR...',
  detected: 'Code QR détecté !',
  processing: 'Traitement...',
  success: '{count} code(s) QR trouvé(s) !',
  detectedCount: '{count} code{plural} QR détecté{plural}',
};

// Default is Vietnamese (as originally specified)
export const DEFAULT_TEXTS = DEFAULT_TEXTS_VI;

// Export all languages for easy access
export const LANGUAGES = {
  en: DEFAULT_TEXTS_EN,
  vi: DEFAULT_TEXTS_VI,
  zh: DEFAULT_TEXTS_ZH,
  ja: DEFAULT_TEXTS_JA,
  es: DEFAULT_TEXTS_ES,
  fr: DEFAULT_TEXTS_FR,
};

export type SupportedLanguage = keyof typeof LANGUAGES;

// Helper to get texts by language
export const getTextsByLanguage = (lang: SupportedLanguage) => {
  return LANGUAGES[lang] || DEFAULT_TEXTS;
};
