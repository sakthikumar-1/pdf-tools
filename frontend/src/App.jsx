import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { checkBackendHealth } from './services/api';

const Home = lazy(() => import('./pages/Home'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const PDFToJPG = lazy(() => import('./pages/PDFToJPG'));
const GenericTool = lazy(() => import('./pages/GenericTool'));
const RemovePages = lazy(() => import('./pages/RemovePages'));
const ReorderPages = lazy(() => import('./pages/ReorderPages'));
const CropPDF = lazy(() => import('./pages/CropPDF'));
const AISummarizer = lazy(() => import('./pages/AISummarizer'));
const Login = lazy(() => import('./pages/Login'));
const Account = lazy(() => import('./pages/Account'));
const History = lazy(() => import('./pages/History'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: '#303840'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid #D4D9DF',
        borderTopColor: '#303840',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        Loading page...
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

import { 
  faFileWord, 
  faFileExcel, 
  faImages, 
  faFileLines, 
  faFilePowerpoint, 
  faLayerGroup, 
  faScissors, 
  faCompress, 
  faRotate, 
  faLock, 
  faFilePdf, 
  faHashtag, 
  faStamp, 
  faCropSimple, 
  faTag 
} from '@fortawesome/free-solid-svg-icons';

// ScrollToTop component to handle page top scroll and hash target navigation
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      let attempts = 0;
      const scrollToHash = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (attempts < 20) {
          attempts++;
          setTimeout(scrollToHash, 50);
        }
      };
      scrollToHash();
    } else {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
    }
  }, [pathname, hash]);

  return null;
}

export default function App() {
  useEffect(() => {
    // Pre-warm backend in background on initial page load to eliminate Render free-tier cold starts
    checkBackendHealth().catch(() => {});
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <ErrorBoundary>
        <MainLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* 1. Main Navigation Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/recent-files" element={<History />} />
              <Route path="/history" element={<Navigate to="/recent-files" replace />} />
              <Route path="/settings" element={<Account />} />
              <Route path="/account" element={<Navigate to="/settings" replace />} />
              <Route path="/login" element={<Login />} />

              {/* 2. PDF Category Routes */}
              <Route path="/tools/organize" element={<CategoryPage explicitSlug="organize" />} />
              <Route path="/tools/convert" element={<CategoryPage explicitSlug="convert" />} />
              <Route path="/tools/compress" element={<CategoryPage explicitSlug="compress" />} />
              <Route path="/tools/edit-secure" element={<CategoryPage explicitSlug="edit-secure" />} />
              <Route path="/tools/ai" element={<CategoryPage explicitSlug="ai" />} />

              {/* 3. AI PDF Feature */}
              <Route path="/ai-summarizer" element={<AISummarizer />} />
              <Route path="/tools/ai-summarizer" element={<Navigate to="/ai-summarizer" replace />} />

              {/* 4. Individual PDF Tool Routes (both /tools/:id and /:id) */}
              {/* PDF to Word */}
              <Route 
                path="/tools/pdf-to-word" 
                element={<GenericTool title="PDF to Word" description="Convert PDF documents into editable Microsoft Word (.docx) format." icon={faFileWord} actionLabel="Convert to Word Now" />} 
              />
              <Route 
                path="/pdf-to-word" 
                element={<GenericTool title="PDF to Word" description="Convert PDF documents into editable Microsoft Word (.docx) format." icon={faFileWord} actionLabel="Convert to Word Now" />} 
              />

              {/* PDF to JPG */}
              <Route path="/tools/pdf-to-jpg" element={<PDFToJPG />} />
              <Route path="/pdf-to-jpg" element={<PDFToJPG />} />

              {/* Merge PDF */}
              <Route 
                path="/tools/merge-pdf" 
                element={<GenericTool title="Merge PDF" description="Combine multiple PDF files into one single organized file." icon={faLayerGroup} actionLabel="Merge PDF Files Now" />} 
              />
              <Route 
                path="/merge-pdf" 
                element={<GenericTool title="Merge PDF" description="Combine multiple PDF files into one single organized file." icon={faLayerGroup} actionLabel="Merge PDF Files Now" />} 
              />

              {/* Compress PDF */}
              <Route 
                path="/tools/compress-pdf" 
                element={<GenericTool title="Compress PDF" description="Reduce PDF file size without sacrificing document quality." icon={faCompress} actionLabel="Compress PDF Now" />} 
              />
              <Route 
                path="/compress-pdf" 
                element={<GenericTool title="Compress PDF" description="Reduce PDF file size without sacrificing document quality." icon={faCompress} actionLabel="Compress PDF Now" />} 
              />

              {/* Split PDF */}
              <Route 
                path="/tools/split-pdf" 
                element={<GenericTool title="Split PDF" description="Separate one PDF file into multiple documents or extract specific pages." icon={faScissors} actionLabel="Split PDF File Now" />} 
              />
              <Route 
                path="/split-pdf" 
                element={<GenericTool title="Split PDF" description="Separate one PDF file into multiple documents or extract specific pages." icon={faScissors} actionLabel="Split PDF File Now" />} 
              />

              {/* Images to PDF */}
              <Route 
                path="/tools/images-to-pdf" 
                element={<GenericTool title="Images to PDF" description="Convert JPG, PNG, or WebP images into a single PDF document." icon={faFilePdf} actionLabel="Convert Images to PDF" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />} 
              />
              <Route 
                path="/images-to-pdf" 
                element={<GenericTool title="Images to PDF" description="Convert JPG, PNG, or WebP images into a single PDF document." icon={faFilePdf} actionLabel="Convert Images to PDF" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />} 
              />

              {/* PDF to Excel */}
              <Route 
                path="/tools/pdf-to-excel" 
                element={<GenericTool title="PDF to Excel" description="Extract PDF tables into clean Microsoft Excel (.xlsx) spreadsheets." icon={faFileExcel} actionLabel="Convert to Excel Now" />} 
              />
              <Route 
                path="/pdf-to-excel" 
                element={<GenericTool title="PDF to Excel" description="Extract PDF tables into clean Microsoft Excel (.xlsx) spreadsheets." icon={faFileExcel} actionLabel="Convert to Excel Now" />} 
              />

              {/* PDF to PNG */}
              <Route 
                path="/tools/pdf-to-png" 
                element={<GenericTool title="PDF to PNG" description="Convert PDF pages into transparent PNG images." icon={faImages} actionLabel="Convert to PNG Now" />} 
              />
              <Route 
                path="/pdf-to-png" 
                element={<GenericTool title="PDF to PNG" description="Convert PDF pages into transparent PNG images." icon={faImages} actionLabel="Convert to PNG Now" />} 
              />

              {/* PDF to Text */}
              <Route 
                path="/tools/pdf-to-text" 
                element={<GenericTool title="PDF to Text" description="Extract all text content from your PDF documents." icon={faFileLines} actionLabel="Extract Text Now" />} 
              />
              <Route 
                path="/pdf-to-text" 
                element={<GenericTool title="PDF to Text" description="Extract all text content from your PDF documents." icon={faFileLines} actionLabel="Extract Text Now" />} 
              />

              {/* PDF to PowerPoint */}
              <Route 
                path="/tools/pdf-to-powerpoint" 
                element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={faFilePowerpoint} actionLabel="Convert to PowerPoint Now" />} 
              />
              <Route 
                path="/tools/pdf-to-ppt" 
                element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={faFilePowerpoint} actionLabel="Convert to PowerPoint Now" />} 
              />
              <Route 
                path="/pdf-to-powerpoint" 
                element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={faFilePowerpoint} actionLabel="Convert to PowerPoint Now" />} 
              />
              <Route 
                path="/pdf-to-ppt" 
                element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={faFilePowerpoint} actionLabel="Convert to PowerPoint Now" />} 
              />

              {/* Rotate PDF */}
              <Route 
                path="/tools/rotate-pdf" 
                element={<GenericTool title="Rotate PDF" description="Rotate PDF pages clockwise or counter-clockwise." icon={faRotate} actionLabel="Rotate PDF Now" />} 
              />
              <Route 
                path="/rotate-pdf" 
                element={<GenericTool title="Rotate PDF" description="Rotate PDF pages clockwise or counter-clockwise." icon={faRotate} actionLabel="Rotate PDF Now" />} 
              />

              {/* Protect PDF */}
              <Route 
                path="/tools/protect-pdf" 
                element={<GenericTool title="Protect PDF" description="Add strong password security and encryption to your PDF file." icon={faLock} actionLabel="Protect PDF Now" />} 
              />
              <Route 
                path="/protect-pdf" 
                element={<GenericTool title="Protect PDF" description="Add strong password security and encryption to your PDF file." icon={faLock} actionLabel="Protect PDF Now" />} 
              />

              {/* Remove Pages */}
              <Route path="/tools/remove-pages" element={<RemovePages />} />
              <Route path="/remove-pages" element={<RemovePages />} />

              {/* Add Page Numbers */}
              <Route 
                path="/tools/add-page-numbers" 
                element={<GenericTool title="Add Page Numbers" description="Add customizable page numbering to your PDF with layout and font controls." icon={faHashtag} actionLabel="Add Page Numbers Now" />} 
              />
              <Route 
                path="/add-page-numbers" 
                element={<GenericTool title="Add Page Numbers" description="Add customizable page numbering to your PDF with layout and font controls." icon={faHashtag} actionLabel="Add Page Numbers Now" />} 
              />

              {/* Watermark PDF */}
              <Route 
                path="/tools/watermark-pdf" 
                element={<GenericTool title="Watermark PDF" description="Stamp custom text or image watermarks over your PDF pages." icon={faStamp} actionLabel="Apply Watermark Now" />} 
              />
              <Route 
                path="/watermark-pdf" 
                element={<GenericTool title="Watermark PDF" description="Stamp custom text or image watermarks over your PDF pages." icon={faStamp} actionLabel="Apply Watermark Now" />} 
              />

              {/* Crop PDF */}
              <Route path="/tools/crop-pdf" element={<CropPDF />} />
              <Route path="/crop-pdf" element={<CropPDF />} />

              {/* Edit Metadata */}
              <Route 
                path="/tools/edit-metadata" 
                element={<GenericTool title="Edit PDF Metadata" description="Inspect and update PDF document properties including Title, Author, and Keywords." icon={faTag} actionLabel="Update Metadata Now" />} 
              />
              <Route 
                path="/edit-metadata" 
                element={<GenericTool title="Edit PDF Metadata" description="Inspect and update PDF document properties including Title, Author, and Keywords." icon={faTag} actionLabel="Update Metadata Now" />} 
              />

              {/* Reorder PDF */}
              <Route path="/tools/reorder-pdf" element={<ReorderPages />} />
              <Route path="/reorder-pdf" element={<ReorderPages />} />
              <Route path="/tools/organize-pdf" element={<ReorderPages />} />
              <Route path="/organize-pdf" element={<ReorderPages />} />

              {/* Dynamic Category Slug fallback */}
              <Route path="/tools/:categorySlug" element={<CategoryPage />} />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </ErrorBoundary>
    </Router>
  );
}
