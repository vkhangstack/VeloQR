// Default animation text in English
export const DEFAULT_TEXTS_EN = {
  // QR Scanner texts
  qr: {
    scanning: 'Scanning QR Code...',
    detected: 'QR Code Detected!',
    processing: 'Processing...',
    success: 'Found {count} QR Code(s)!',
    detectedCount: 'Detected {count} QR code{plural}',
    instruction: 'Position QR code within frame',
    dropzoneText: 'Drag and drop an image here, or click to select',
    resultLabel: 'QR',
  },
  // MRZ Scanner texts
  mrz: {
    scanning: 'Scanning MRZ...',
    detected: 'MRZ Detected!',
    processing: 'Analyzing Document...',
    success: 'MRZ Successfully Read!',
    instruction: 'Position MRZ within frame',
    stageTexts: ['Detecting document', 'Extracting MRZ', 'Validating data'],
    dropzoneText: 'Drag and drop a document image here, or click to select',
    dropzoneHint: 'Supported documents: Passports, ID cards (TD1, TD2, TD3)',
  },
  // Legacy flat structure for backward compatibility
  scanning: 'Scanning QR Code...',
  detected: 'QR Code Detected!',
  processing: 'Processing...',
  success: 'Found {count} QR Code(s)!',
  detectedCount: 'Detected {count} QR code{plural}',
};

// Default animation text in Vietnamese
export const DEFAULT_TEXTS_VI = {
  // QR Scanner texts
  qr: {
    scanning: 'Đang quét QR Code...',
    detected: 'Đã phát hiện QR Code!',
    processing: 'Đang xử lý...',
    success: 'Đã tìm thấy {count} QR Code!',
    detectedCount: 'Đã phát hiện {count} mã QR',
    instruction: 'Đặt mã QR trong khung hình',
    dropzoneText: 'Kéo thả ảnh vào đây, hoặc nhấp để chọn',
    resultLabel: 'QR',
  },
  // MRZ Scanner texts
  mrz: {
    scanning: 'Đang quét MRZ...',
    detected: 'Đã phát hiện MRZ!',
    processing: 'Đang phân tích tài liệu...',
    success: 'Đã đọc MRZ thành công!',
    instruction: 'Đặt vùng MRZ trong khung hình',
    stageTexts: ['Phát hiện tài liệu', 'Trích xuất MRZ', 'Xác thực dữ liệu'],
    dropzoneText: 'Kéo thả ảnh tài liệu vào đây, hoặc nhấp để chọn',
    dropzoneHint: 'Hỗ trợ: Hộ chiếu, Thẻ căn cước (TD1, TD2, TD3)',
  },
  // Legacy flat structure for backward compatibility
  scanning: 'Đang quét QR Code...',
  detected: 'Đã phát hiện QR Code!',
  processing: 'Đang xử lý...',
  success: 'Đã tìm thấy {count} QR Code!',
  detectedCount: 'Đã phát hiện {count} mã QR',
};

// Default animation text in Chinese
export const DEFAULT_TEXTS_ZH = {
  // QR Scanner texts
  qr: {
    scanning: '正在扫描二维码...',
    detected: '检测到二维码！',
    processing: '处理中...',
    success: '找到 {count} 个二维码！',
    detectedCount: '检测到 {count} 个二维码',
    instruction: '将二维码放入框内',
    dropzoneText: '将图片拖放到此处，或点击选择',
    resultLabel: '二维码',
  },
  // MRZ Scanner texts
  mrz: {
    scanning: '正在扫描MRZ...',
    detected: '检测到MRZ！',
    processing: '正在分析文件...',
    success: 'MRZ读取成功！',
    instruction: '将MRZ区域放入框内',
    stageTexts: ['检测文档', '提取MRZ', '验证数据'],
    dropzoneText: '将证件图片拖放到此处，或点击选择',
    dropzoneHint: '支持文档：护照、身份证（TD1、TD2、TD3）',
  },
  // Legacy flat structure for backward compatibility
  scanning: '正在扫描二维码...',
  detected: '检测到二维码！',
  processing: '处理中...',
  success: '找到 {count} 个二维码！',
  detectedCount: '检测到 {count} 个二维码',
};

// Default animation text in Japanese
export const DEFAULT_TEXTS_JA = {
  // QR Scanner texts
  qr: {
    scanning: 'QRコードをスキャン中...',
    detected: 'QRコードを検出しました！',
    processing: '処理中...',
    success: '{count}個のQRコードが見つかりました！',
    detectedCount: '{count}個のQRコードを検出しました',
    instruction: 'QRコードをフレーム内に配置してください',
    dropzoneText: '画像をここにドラッグアンドドロップするか、クリックして選択してください',
    resultLabel: 'QR',
  },
  // MRZ Scanner texts
  mrz: {
    scanning: 'MRZをスキャン中...',
    detected: 'MRZを検出しました！',
    processing: '書類を分析中...',
    success: 'MRZの読み取りに成功しました！',
    instruction: 'MRZ領域をフレーム内に配置してください',
    stageTexts: ['書類検出中', 'MRZ抽出中', 'データ検証中'],
    dropzoneText: '書類画像をここにドラッグアンドドロップするか、クリックして選択してください',
    dropzoneHint: '対応書類：パスポート、IDカード（TD1、TD2、TD3）',
  },
  // Legacy flat structure for backward compatibility
  scanning: 'QRコードをスキャン中...',
  detected: 'QRコードを検出しました！',
  processing: '処理中...',
  success: '{count}個のQRコードが見つかりました！',
  detectedCount: '{count}個のQRコードを検出しました',
};

// Default animation text in Spanish
export const DEFAULT_TEXTS_ES = {
  // QR Scanner texts
  qr: {
    scanning: 'Escaneando código QR...',
    detected: '¡Código QR detectado!',
    processing: 'Procesando...',
    success: '¡Se encontraron {count} código(s) QR!',
    detectedCount: 'Detectado{plural} {count} código{plural} QR',
    instruction: 'Coloque el código QR dentro del marco',
    dropzoneText: 'Arrastra y suelta una imagen aquí, o haz clic para seleccionar',
    resultLabel: 'QR',
  },
  // MRZ Scanner texts
  mrz: {
    scanning: 'Escaneando MRZ...',
    detected: '¡MRZ detectado!',
    processing: 'Analizando documento...',
    success: '¡MRZ leído correctamente!',
    instruction: 'Coloque la zona MRZ dentro del marco',
    stageTexts: ['Detectando documento', 'Extrayendo MRZ', 'Validando datos'],
    dropzoneText: 'Arrastra y suelta una imagen de documento aquí, o haz clic para seleccionar',
    dropzoneHint: 'Documentos compatibles: Pasaportes, Tarjetas de identidad (TD1, TD2, TD3)',
  },
  // Legacy flat structure for backward compatibility
  scanning: 'Escaneando código QR...',
  detected: '¡Código QR detectado!',
  processing: 'Procesando...',
  success: '¡Se encontraron {count} código(s) QR!',
  detectedCount: 'Detectado{plural} {count} código{plural} QR',
};

// Default animation text in French
export const DEFAULT_TEXTS_FR = {
  // QR Scanner texts
  qr: {
    scanning: 'Scan du code QR...',
    detected: 'Code QR détecté !',
    processing: 'Traitement...',
    success: '{count} code(s) QR trouvé(s) !',
    detectedCount: '{count} code{plural} QR détecté{plural}',
    instruction: 'Placez le code QR dans le cadre',
    dropzoneText: 'Glissez-déposez une image ici, ou cliquez pour sélectionner',
    resultLabel: 'QR',
  },
  // MRZ Scanner texts
  mrz: {
    scanning: 'Scan MRZ...',
    detected: 'MRZ détecté !',
    processing: 'Analyse du document...',
    success: 'MRZ lu avec succès !',
    instruction: 'Placez la zone MRZ dans le cadre',
    stageTexts: ['Détection du document', 'Extraction MRZ', 'Validation des données'],
    dropzoneText: 'Glissez-déposez une image de document ici, ou cliquez pour sélectionner',
    dropzoneHint: 'Documents pris en charge : Passeports, Cartes d\'identité (TD1, TD2, TD3)',
  },
  // Legacy flat structure for backward compatibility
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
