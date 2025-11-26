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
  // Error messages
  errors: {
    permissionDenied: {
      title: 'Camera Permission Denied',
      message: 'Camera access was denied. Please enable camera permissions to use the scanner.',
      instructions: [
        'Click the camera icon in your browser\'s address bar',
        'Select "Allow" to enable camera access',
        'Reload the page if needed',
      ],
    },
    notFound: {
      title: 'No Camera Found',
      message: 'No camera device was detected on this device. Please connect a camera and try again.',
    },
    notReadable: {
      title: 'Camera Not Accessible',
      message: 'The camera is currently in use by another application. Please close other apps and try again.',
    },
    overconstrained: {
      title: 'Camera Constraints Error',
      message: 'The requested camera settings are not supported by your device.',
    },
    unknown: {
      title: 'Camera Error',
      message: 'An unexpected error occurred while accessing the camera. Please try again.',
    },
    loading: 'Initializing camera...',
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
  // Error messages
  errors: {
    permissionDenied: {
      title: 'Quyền Truy Cập Camera Bị Từ Chối',
      message: 'Quyền truy cập camera đã bị từ chối. Vui lòng cho phép truy cập camera để sử dụng máy quét.',
      instructions: [
        'Nhấp vào biểu tượng camera trên thanh địa chỉ trình duyệt',
        'Chọn "Cho phép" để bật quyền truy cập camera',
        'Tải lại trang nếu cần',
      ],
    },
    notFound: {
      title: 'Không Tìm Thấy Camera',
      message: 'Không phát hiện được thiết bị camera trên thiết bị này. Vui lòng kết nối camera và thử lại.',
    },
    notReadable: {
      title: 'Không Thể Truy Cập Camera',
      message: 'Camera hiện đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.',
    },
    overconstrained: {
      title: 'Lỗi Cấu Hình Camera',
      message: 'Cài đặt camera yêu cầu không được thiết bị của bạn hỗ trợ.',
    },
    unknown: {
      title: 'Lỗi Camera',
      message: 'Đã xảy ra lỗi không mong muốn khi truy cập camera. Vui lòng thử lại.',
    },
    loading: 'Đang khởi tạo camera...',
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
  // Error messages
  errors: {
    permissionDenied: {
      title: '摄像头权限被拒绝',
      message: '摄像头访问权限被拒绝。请启用摄像头权限以使用扫描仪。',
      instructions: [
        '点击浏览器地址栏中的摄像头图标',
        '选择"允许"以启用摄像头访问',
        '如有需要，请重新加载页面',
      ],
    },
    notFound: {
      title: '未找到摄像头',
      message: '此设备上未检测到摄像头设备。请连接摄像头后重试。',
    },
    notReadable: {
      title: '无法访问摄像头',
      message: '摄像头目前正被其他应用程序使用。请关闭其他应用程序后重试。',
    },
    overconstrained: {
      title: '摄像头配置错误',
      message: '您的设备不支持所请求的摄像头设置。',
    },
    unknown: {
      title: '摄像头错误',
      message: '访问摄像头时发生意外错误。请重试。',
    },
    loading: '正在初始化摄像头...',
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
  // Error messages
  errors: {
    permissionDenied: {
      title: 'カメラ権限が拒否されました',
      message: 'カメラへのアクセスが拒否されました。スキャナーを使用するにはカメラの権限を有効にしてください。',
      instructions: [
        'ブラウザのアドレスバーにあるカメラアイコンをクリックしてください',
        '「許可」を選択してカメラアクセスを有効にしてください',
        '必要に応じてページを再読み込みしてください',
      ],
    },
    notFound: {
      title: 'カメラが見つかりません',
      message: 'このデバイスでカメラデバイスが検出されませんでした。カメラを接続して再試行してください。',
    },
    notReadable: {
      title: 'カメラにアクセスできません',
      message: 'カメラは現在、別のアプリケーションによって使用されています。他のアプリを閉じて再試行してください。',
    },
    overconstrained: {
      title: 'カメラ設定エラー',
      message: '要求されたカメラ設定はお使いのデバイスでサポートされていません。',
    },
    unknown: {
      title: 'カメラエラー',
      message: 'カメラへのアクセス中に予期しないエラーが発生しました。再試行してください。',
    },
    loading: 'カメラを初期化中...',
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
  // Error messages
  errors: {
    permissionDenied: {
      title: 'Permiso de Cámara Denegado',
      message: 'Se denegó el acceso a la cámara. Por favor, habilite los permisos de cámara para usar el escáner.',
      instructions: [
        'Haz clic en el ícono de la cámara en la barra de direcciones de tu navegador',
        'Selecciona "Permitir" para habilitar el acceso a la cámara',
        'Recarga la página si es necesario',
      ],
    },
    notFound: {
      title: 'Cámara No Encontrada',
      message: 'No se detectó ningún dispositivo de cámara en este dispositivo. Por favor, conecta una cámara e inténtalo de nuevo.',
    },
    notReadable: {
      title: 'Cámara No Accesible',
      message: 'La cámara está actualmente en uso por otra aplicación. Por favor, cierra otras aplicaciones e inténtalo de nuevo.',
    },
    overconstrained: {
      title: 'Error de Configuración de Cámara',
      message: 'La configuración de cámara solicitada no es compatible con tu dispositivo.',
    },
    unknown: {
      title: 'Error de Cámara',
      message: 'Ocurrió un error inesperado al acceder a la cámara. Por favor, inténtalo de nuevo.',
    },
    loading: 'Inicializando cámara...',
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
  // Error messages
  errors: {
    permissionDenied: {
      title: 'Permission de Caméra Refusée',
      message: 'L\'accès à la caméra a été refusé. Veuillez activer les permissions de caméra pour utiliser le scanner.',
      instructions: [
        'Cliquez sur l\'icône de la caméra dans la barre d\'adresse de votre navigateur',
        'Sélectionnez "Autoriser" pour activer l\'accès à la caméra',
        'Rechargez la page si nécessaire',
      ],
    },
    notFound: {
      title: 'Caméra Non Trouvée',
      message: 'Aucun périphérique de caméra n\'a été détecté sur cet appareil. Veuillez connecter une caméra et réessayer.',
    },
    notReadable: {
      title: 'Caméra Non Accessible',
      message: 'La caméra est actuellement utilisée par une autre application. Veuillez fermer les autres applications et réessayer.',
    },
    overconstrained: {
      title: 'Erreur de Configuration de la Caméra',
      message: 'Les paramètres de caméra demandés ne sont pas pris en charge par votre appareil.',
    },
    unknown: {
      title: 'Erreur de Caméra',
      message: 'Une erreur inattendue s\'est produite lors de l\'accès à la caméra. Veuillez réessayer.',
    },
    loading: 'Initialisation de la caméra...',
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
