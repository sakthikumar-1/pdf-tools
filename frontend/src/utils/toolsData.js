import {
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileLines,
  faFileImage,
  faImages,
  faCompress,
  faLayerGroup,
  faScissors,
  faRotate,
  faLock,
  faWandMagicSparkles,
  faTrashCan,
  faHashtag,
  faStamp,
  faCropSimple,
  faTag,
  faUpDown,
  faTableCellsLarge,
  faArrowRightArrowLeft,
  faShieldHalved,
  faSignature
} from '@fortawesome/free-solid-svg-icons';

export const TOOL_CATEGORIES = [
  {
    id: 'all',
    slug: 'all',
    path: '/#all-tools',
    label: 'All Tools',
    count: 20,
    description: 'Explore the complete suite of 20 productivity utilities',
    icon: faTableCellsLarge
  },
  {
    id: 'organize-pdf',
    slug: 'organize',
    path: '/tools/organize',
    label: 'Organize PDF',
    count: 7,
    description: 'Merge, split, rotate, reorder, crop, and number your PDF pages',
    icon: faLayerGroup
  },
  {
    id: 'convert-pdf',
    slug: 'convert',
    path: '/tools/convert',
    label: 'Convert PDF',
    count: 7,
    description: 'Convert between PDF, Word, Excel, PowerPoint, and high-resolution images',
    icon: faArrowRightArrowLeft
  },
  {
    id: 'compress-pdf',
    slug: 'compress',
    path: '/tools/compress',
    label: 'Compress PDF',
    count: 1,
    description: 'Reduce PDF document file size while preserving high visual quality',
    icon: faCompress
  },
  {
    id: 'security-protect',
    slug: 'edit-secure',
    path: '/tools/edit-secure',
    label: 'Edit & Secure PDF',
    count: 4,
    description: 'Bank-grade password encryption, electronic signatures, watermarking, and metadata',
    icon: faShieldHalved
  },
  {
    id: 'ai-tools',
    slug: 'ai',
    path: '/tools/ai',
    label: 'AI PDF Tools',
    count: 1,
    description: 'Artificial intelligence document analysis and executive summarization',
    icon: faWandMagicSparkles
  }
];

export const TOOLS_DATA = [
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    path: '/tools/pdf-to-word',
    legacyPath: '/pdf-to-word',
    description: 'Convert PDF to editable Word documents.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faFileWord,
    keywords: ['word', 'docx', 'doc', 'microsoft', 'office', 'editable', 'text', 'format'],
    popular: true,
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    path: '/tools/pdf-to-jpg',
    legacyPath: '/pdf-to-jpg',
    description: 'Convert PDF pages to high-quality images.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faFileImage,
    keywords: ['jpg', 'jpeg', 'image', 'picture', 'photo', 'extract', 'pages', 'dpi', 'zip'],
    popular: true,
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    path: '/tools/merge-pdf',
    legacyPath: '/merge-pdf',
    description: 'Combine multiple PDFs into one file.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faLayerGroup,
    keywords: ['merge', 'combine', 'join', 'bind', 'collate', 'multiple', 'organize'],
    popular: true,
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    path: '/tools/compress-pdf',
    legacyPath: '/compress-pdf',
    description: 'Reduce PDF file size without losing quality.',
    category: 'compress-pdf',
    categorySlug: 'compress',
    categoryLabel: 'Compress PDF',
    icon: faCompress,
    keywords: ['compress', 'reduce', 'shrink', 'smaller', 'optimize', 'file size', 'fast'],
    popular: true,
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    path: '/tools/split-pdf',
    legacyPath: '/split-pdf',
    description: 'Split PDF into multiple files or extract specific pages.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faScissors,
    keywords: ['split', 'separate', 'extract', 'pages', 'range', 'cut', 'divide'],
    popular: false,
  },
  {
    id: 'images-to-pdf',
    title: 'Images to PDF',
    path: '/tools/images-to-pdf',
    legacyPath: '/images-to-pdf',
    description: 'Convert images (JPG, PNG, WebP) to PDF document with custom margins.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faImages,
    keywords: ['images to pdf', 'jpg to pdf', 'png to pdf', 'photos', 'combine', 'build'],
    popular: false,
  },
  {
    id: 'reorder-pdf',
    title: 'Reorder PDF',
    path: '/tools/reorder-pdf',
    legacyPath: '/reorder-pdf',
    description: 'Rearrange and organize pages visually with drag-and-drop.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faUpDown,
    keywords: ['reorder', 'organize', 'sort', 'arrange', 'move', 'pages', 'rearrange', 'sequence'],
    popular: false,
  },
  {
    id: 'ai-summarizer',
    title: 'AI PDF Summarizer',
    path: '/ai-summarizer',
    legacyPath: '/tools/ai-summarizer',
    description: 'Summarize PDFs with Google Gemini artificial intelligence.',
    category: 'ai-tools',
    categorySlug: 'ai',
    categoryLabel: 'AI PDF Tools',
    icon: faWandMagicSparkles,
    keywords: ['ai', 'summarize', 'summary', 'intelligence', 'abstract', 'key points', 'overview', 'gemini'],
    popular: false,
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF to Excel',
    path: '/tools/pdf-to-excel',
    legacyPath: '/pdf-to-excel',
    description: 'Extract PDF tables into clean Microsoft Excel (.xlsx) spreadsheets.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faFileExcel,
    keywords: ['excel', 'xlsx', 'spreadsheet', 'table', 'data', 'csv', 'sheets'],
    popular: false,
  },
  {
    id: 'pdf-to-png',
    title: 'PDF to PNG',
    path: '/tools/pdf-to-png',
    legacyPath: '/pdf-to-png',
    description: 'Convert PDF pages into transparent, lossless PNG images.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faImages,
    keywords: ['png', 'transparent', 'lossless', 'image', 'picture', 'graphic'],
    popular: false,
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to Text',
    path: '/tools/pdf-to-text',
    legacyPath: '/pdf-to-text',
    description: 'Extract clean plain text (.txt) from any PDF file for easy copying.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faFileLines,
    keywords: ['text', 'txt', 'plain text', 'extract', 'content', 'copy', 'raw'],
    popular: false,
  },
  {
    id: 'pdf-to-ppt',
    title: 'PDF to PowerPoint',
    path: '/tools/pdf-to-ppt',
    legacyPath: '/pdf-to-ppt',
    description: 'Transform PDF slides into Microsoft PPTX presentations.',
    category: 'convert-pdf',
    categorySlug: 'convert',
    categoryLabel: 'Convert PDF',
    icon: faFilePowerpoint,
    keywords: ['powerpoint', 'ppt', 'pptx', 'presentation', 'slides', 'deck', 'slideshow'],
    popular: false,
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    path: '/tools/rotate-pdf',
    legacyPath: '/rotate-pdf',
    description: 'Rotate PDF pages clockwise or counter-clockwise permanently.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faRotate,
    keywords: ['rotate', 'turn', 'flip', 'orientation', 'clockwise', 'direction'],
    popular: false,
  },
  {
    id: 'protect-pdf',
    title: 'Protect PDF',
    path: '/tools/protect-pdf',
    legacyPath: '/protect-pdf',
    description: 'Add bank-grade AES-256 password encryption to safeguard documents.',
    category: 'security-protect',
    categorySlug: 'edit-secure',
    categoryLabel: 'Edit & Secure PDF',
    icon: faLock,
    keywords: ['protect', 'password', 'encrypt', 'security', 'lock', 'privacy', 'aes'],
    popular: false,
  },
  {
    id: 'remove-pages',
    title: 'Remove Pages',
    path: '/tools/remove-pages',
    legacyPath: '/remove-pages',
    description: 'Select and delete unwanted or blank pages from your PDF document.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faTrashCan,
    keywords: ['remove pages', 'delete pages', 'trash', 'trim', 'cut', 'organize'],
    popular: false,
  },
  {
    id: 'add-page-numbers',
    title: 'Add Page Numbers',
    path: '/tools/add-page-numbers',
    legacyPath: '/add-page-numbers',
    description: 'Insert customizable page numbers with position, format, and font controls.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faHashtag,
    keywords: ['page numbers', 'numbering', 'pagination', 'header', 'footer', 'page count', 'bates', 'add numbers'],
    popular: false,
  },
  {
    id: 'watermark-pdf',
    title: 'Watermark PDF',
    path: '/tools/watermark-pdf',
    legacyPath: '/watermark-pdf',
    description: 'Stamp custom text watermarks with opacity, rotation, and color settings.',
    category: 'security-protect',
    categorySlug: 'edit-secure',
    categoryLabel: 'Edit & Secure PDF',
    icon: faStamp,
    keywords: ['watermark', 'stamp', 'confidential', 'draft', 'overlay', 'security', 'brand', 'copyright'],
    popular: false,
  },
  {
    id: 'crop-pdf',
    title: 'Crop PDF',
    path: '/tools/crop-pdf',
    legacyPath: '/crop-pdf',
    description: 'Trim page margins and adjust document boundaries without quality loss.',
    category: 'organize-pdf',
    categorySlug: 'organize',
    categoryLabel: 'Organize PDF',
    icon: faCropSimple,
    keywords: ['crop', 'trim', 'margins', 'cut', 'box', 'resize', 'boundaries', 'white space'],
    popular: false,
  },
  {
    id: 'edit-metadata',
    title: 'Edit PDF Metadata',
    path: '/tools/edit-metadata',
    legacyPath: '/edit-metadata',
    description: 'Inspect and update PDF properties including Title, Author, and Keywords.',
    category: 'security-protect',
    categorySlug: 'edit-secure',
    categoryLabel: 'Edit & Secure PDF',
    icon: faTag,
    keywords: ['metadata', 'properties', 'author', 'title', 'subject', 'keywords', 'info', 'document info'],
    popular: false,
  },
  {
    id: 'sign-pdf',
    title: 'Sign PDF',
    path: '/tools/sign-pdf',
    legacyPath: '/sign-pdf',
    description: 'Sign documents yourself with electronic signatures, initials, or handwriting.',
    category: 'security-protect',
    categorySlug: 'edit-secure',
    categoryLabel: 'Edit & Secure PDF',
    icon: faSignature,
    keywords: ['sign', 'signature', 'initials', 'draw', 'handwriting', 'e-sign', 'contract', 'agreement', 'fill and sign'],
    popular: true,
  }
];

export function getCategoryBySlug(slug) {
  if (!slug) return null;
  const s = slug.toLowerCase();
  return TOOL_CATEGORIES.find(c => c.slug === s || c.id === s) || null;
}

export function getToolsByCategory(categoryIdOrSlug) {
  if (!categoryIdOrSlug || categoryIdOrSlug === 'all') return TOOLS_DATA;
  const s = categoryIdOrSlug.toLowerCase();
  const cat = TOOL_CATEGORIES.find(c => c.slug === s || c.id === s);
  const targetId = cat ? cat.id : s;
  return TOOLS_DATA.filter(t => t.category === targetId);
}

export function getToolById(toolId) {
  if (!toolId) return null;
  const id = toolId.toLowerCase();
  return TOOLS_DATA.find(t => t.id === id || t.path.endsWith(`/${id}`) || t.legacyPath === `/${id}`) || null;
}

export function filterTools(query, category = 'all') {
  const q = (query || '').trim().toLowerCase();
  
  return TOOLS_DATA.filter(tool => {
    // 1. Category match
    const categoryMatch = (category === 'all') || (tool.category === category) || (tool.categorySlug === category);
    if (!categoryMatch) return false;

    // 2. Query match
    if (!q) return true;

    // Direct title or id match
    if (tool.title.toLowerCase().includes(q)) return true;
    if (tool.id.toLowerCase().includes(q)) return true;

    // Description match
    if (tool.description.toLowerCase().includes(q)) return true;

    // Category label match
    if (tool.categoryLabel.toLowerCase().includes(q)) return true;

    // Keywords match
    if (tool.keywords && tool.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) {
      return true;
    }

    return false;
  });
}
