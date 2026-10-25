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
  faFileCirclePlus,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';

export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All Tools', description: 'Explore all 19 productivity utilities', icon: faTableCellsLarge },
  { id: 'ai-tools', label: 'AI Intelligence', description: 'AI document summarization and analysis', icon: faWandMagicSparkles },
  { id: 'convert-from-pdf', label: 'Convert from PDF', description: 'Export PDF to Word, Excel, PowerPoint, JPG, PNG & Text', icon: faFileWord },
  { id: 'convert-to-pdf', label: 'Convert to PDF', description: 'Transform image files into structured PDF documents', icon: faFileCirclePlus },
  { id: 'organize-pdf', label: 'Organize PDF', description: 'Merge, split, rotate, reorder, crop, and number pages', icon: faLayerGroup },
  { id: 'optimize-security', label: 'Optimize & Security', description: 'Compress, protect with password, watermark, and edit metadata', icon: faShieldHalved }
];

export const TOOLS_DATA = [
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    path: '/pdf-to-word',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) files with layout retention.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    icon: faFileWord,
    keywords: ['word', 'docx', 'doc', 'microsoft', 'office', 'editable', 'text', 'format'],
    badge: 'Popular',
    badgeType: 'primary',
    popular: true,
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    path: '/pdf-to-jpg',
    description: 'Extract PDF pages into high-resolution JPG images with selectable DPI and ZIP download.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    icon: faFileImage,
    keywords: ['jpg', 'jpeg', 'image', 'picture', 'photo', 'extract', 'pages', 'dpi', 'zip'],
    badge: 'Popular',
    badgeType: 'primary',
    popular: true,
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    path: '/merge-pdf',
    description: 'Combine multiple PDF files into a single organized document in your desired sequence.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faLayerGroup,
    keywords: ['merge', 'combine', 'join', 'bind', 'collate', 'multiple', 'organize'],
    badge: 'Popular',
    badgeType: 'primary',
    popular: true,
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    path: '/compress-pdf',
    description: 'Significantly reduce PDF file size while retaining visual text and vector sharpness.',
    category: 'optimize-security',
    categoryLabel: 'Optimize & Security',
    icon: faCompress,
    keywords: ['compress', 'reduce', 'shrink', 'smaller', 'optimize', 'file size', 'fast'],
    badge: 'Fast',
    badgeType: 'success',
    popular: true,
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    path: '/split-pdf',
    description: 'Extract specific page ranges or split a multi-page PDF into separate standalone documents.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faScissors,
    keywords: ['split', 'separate', 'extract', 'pages', 'range', 'cut', 'divide'],
    badge: null,
    popular: false,
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF to Excel',
    path: '/pdf-to-excel',
    description: 'Extract tabular data from PDF files directly into structured Microsoft Excel (.xlsx) spreadsheets.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    icon: faFileExcel,
    keywords: ['excel', 'xlsx', 'spreadsheet', 'table', 'data', 'csv', 'sheets'],
    badge: 'Tables',
    badgeType: 'muted',
    popular: false,
  },
  {
    id: 'pdf-to-png',
    title: 'PDF to PNG',
    path: '/pdf-to-png',
    description: 'Convert PDF pages into transparent, lossless high-fidelity PNG graphic files.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    icon: faImages,
    keywords: ['png', 'transparent', 'lossless', 'image', 'picture', 'graphic'],
    badge: 'Lossless',
    badgeType: 'muted',
    popular: false,
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to Text',
    path: '/pdf-to-text',
    description: 'Extract clean plain text (.txt) from any PDF file for straightforward copying and analysis.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    icon: faFileLines,
    keywords: ['text', 'txt', 'plain text', 'extract', 'content', 'copy', 'raw'],
    badge: null,
    popular: false,
  },
  {
    id: 'pdf-to-ppt',
    title: 'PDF to PowerPoint',
    path: '/pdf-to-ppt',
    description: 'Transform PDF slides into editable Microsoft PPTX presentation decks with layout mapping.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    icon: faFilePowerpoint,
    keywords: ['powerpoint', 'ppt', 'pptx', 'presentation', 'slides', 'deck', 'slideshow'],
    badge: 'Slides',
    badgeType: 'muted',
    popular: false,
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    path: '/rotate-pdf',
    description: 'Rotate PDF pages 90, 180, or 270 degrees clockwise or counter-clockwise permanently.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faRotate,
    keywords: ['rotate', 'turn', 'flip', 'orientation', 'clockwise', 'direction'],
    badge: null,
    popular: false,
  },
  {
    id: 'protect-pdf',
    title: 'Protect PDF',
    path: '/protect-pdf',
    description: 'Add bank-grade AES-256 password encryption to safeguard sensitive documents.',
    category: 'optimize-security',
    categoryLabel: 'Optimize & Security',
    icon: faLock,
    keywords: ['protect', 'password', 'encrypt', 'security', 'lock', 'privacy', 'aes'],
    badge: 'Secure',
    badgeType: 'success',
    popular: false,
  },
  {
    id: 'images-to-pdf',
    title: 'Images to PDF',
    path: '/images-to-pdf',
    description: 'Convert JPG, PNG, and WebP images into a single formatted PDF document.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    icon: faFilePdf,
    keywords: ['images to pdf', 'jpg to pdf', 'png to pdf', 'photos', 'combine', 'build'],
    badge: null,
    popular: false,
  },
  {
    id: 'remove-pages',
    title: 'Remove Pages',
    path: '/remove-pages',
    description: 'Interactively select and delete unwanted or blank pages from your PDF document.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faTrashCan,
    keywords: ['remove pages', 'delete pages', 'trash', 'trim', 'cut', 'organize'],
    badge: 'Visual',
    badgeType: 'muted',
    popular: false,
  },
  {
    id: 'add-page-numbers',
    title: 'Add Page Numbers',
    path: '/add-page-numbers',
    description: 'Insert customizable page numbers with selectable positions, formats, and fonts.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faHashtag,
    keywords: ['page numbers', 'numbering', 'pagination', 'header', 'footer', 'page count', 'bates', 'add numbers'],
    badge: 'Popular',
    badgeType: 'primary',
    popular: true,
  },
  {
    id: 'watermark-pdf',
    title: 'Watermark PDF',
    path: '/watermark-pdf',
    description: 'Stamp customizable text watermarks with precise opacity, rotation, and colors.',
    category: 'optimize-security',
    categoryLabel: 'Optimize & Security',
    icon: faStamp,
    keywords: ['watermark', 'stamp', 'confidential', 'draft', 'overlay', 'security', 'brand', 'copyright'],
    badge: null,
    popular: false,
  },
  {
    id: 'crop-pdf',
    title: 'Crop PDF',
    path: '/crop-pdf',
    description: 'Trim page margins and adjust PDF viewing boundaries across individual or all pages.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faCropSimple,
    keywords: ['crop', 'trim', 'margins', 'cut', 'box', 'resize', 'boundaries', 'white space'],
    badge: null,
    popular: false,
  },
  {
    id: 'edit-metadata',
    title: 'Edit PDF Metadata',
    path: '/edit-metadata',
    description: 'Inspect and update PDF document properties including Title, Author, Subject, and Keywords.',
    category: 'optimize-security',
    categoryLabel: 'Optimize & Security',
    icon: faTag,
    keywords: ['metadata', 'properties', 'author', 'title', 'subject', 'keywords', 'info', 'document info'],
    badge: null,
    popular: false,
  },
  {
    id: 'reorder-pdf',
    title: 'Reorder PDF Pages',
    path: '/reorder-pdf',
    description: 'Rearrange and organize PDF pages visually with straightforward drag-and-drop sequencing.',
    category: 'organize-pdf',
    categoryLabel: 'Organize PDF',
    icon: faUpDown,
    keywords: ['reorder', 'organize', 'sort', 'arrange', 'move', 'pages', 'rearrange', 'sequence'],
    badge: 'Popular',
    badgeType: 'primary',
    popular: true,
  },
  {
    id: 'ai-summarizer',
    title: 'AI PDF Summarizer',
    path: '/ai-summarizer',
    description: 'Summarize lengthy PDF documents and reports using intelligent Gemini AI analysis.',
    category: 'ai-tools',
    categoryLabel: 'AI Intelligence',
    icon: faWandMagicSparkles,
    keywords: ['ai', 'summarize', 'summary', 'intelligence', 'abstract', 'key points', 'overview', 'tldr', 'analysis', 'notes'],
    badge: 'AI',
    badgeType: 'primary',
    popular: true,
  }
];

export function filterTools(query, category = 'all') {
  const q = (query || '').trim().toLowerCase();
  
  return TOOLS_DATA.filter((tool) => {
    // Category match
    const categoryMatch = 
      category === 'all' || 
      (category === 'featured' && tool.popular) ||
      tool.category === category;

    if (!categoryMatch) return false;
    if (!q) return true;

    // Search query match:
    // 1. Direct title match (case-insensitive substring)
    const titleMatch = tool.title.toLowerCase().includes(q);
    
    // 2. Exact or prefix match on category label
    const categoryNameMatch = tool.categoryLabel.toLowerCase().includes(q);

    // 3. Keyword match
    const keywordMatch = tool.keywords.some((k) => {
      const kl = k.toLowerCase();
      if (kl === q || kl.startsWith(q)) return true;
      return kl.split(/\s+/).some((part) => part.startsWith(q));
    });

    return titleMatch || categoryNameMatch || keywordMatch;
  });
}
