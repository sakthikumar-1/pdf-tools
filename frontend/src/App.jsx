import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import PDFToJPG from './pages/PDFToJPG';
import GenericTool from './pages/GenericTool';
import RemovePages from './pages/RemovePages';
import ReorderPages from './pages/ReorderPages';
import AISummarizer from './pages/AISummarizer';
import Login from './pages/Login';
import Account from './pages/Account';
import History from './pages/History';
import NotFound from './pages/NotFound';

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
  return (
    <Router>
      <ScrollToTop />
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pdf-to-jpg" element={<PDFToJPG />} />
          
          <Route 
            path="/pdf-to-word" 
            element={<GenericTool title="PDF to Word" description="Convert PDF documents into editable Microsoft Word (.docx) format." icon={faFileWord} actionLabel="Convert to Word Now" />} 
          />
          <Route 
            path="/pdf-to-excel" 
            element={<GenericTool title="PDF to Excel" description="Extract PDF tables into clean Microsoft Excel (.xlsx) spreadsheets." icon={faFileExcel} actionLabel="Convert to Excel Now" />} 
          />
          <Route 
            path="/pdf-to-png" 
            element={<GenericTool title="PDF to PNG" description="Convert PDF pages into transparent PNG images." icon={faImages} actionLabel="Convert to PNG Now" />} 
          />
          <Route 
            path="/pdf-to-text" 
            element={<GenericTool title="PDF to Text" description="Extract all text content from your PDF documents." icon={faFileLines} actionLabel="Extract Text Now" />} 
          />
          <Route 
            path="/pdf-to-ppt" 
            element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={faFilePowerpoint} actionLabel="Convert to PowerPoint Now" />} 
          />
          <Route 
            path="/pdf-to-powerpoint" 
            element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={faFilePowerpoint} actionLabel="Convert to PowerPoint Now" />} 
          />
          <Route 
            path="/merge-pdf" 
            element={<GenericTool title="Merge PDF" description="Combine multiple PDF files into one single organized file." icon={faLayerGroup} actionLabel="Merge PDF Files Now" />} 
          />
          <Route 
            path="/split-pdf" 
            element={<GenericTool title="Split PDF" description="Separate one PDF file into multiple documents or extract specific pages." icon={faScissors} actionLabel="Split PDF File Now" />} 
          />
          <Route 
            path="/compress-pdf" 
            element={<GenericTool title="Compress PDF" description="Reduce PDF file size without sacrificing document quality." icon={faCompress} actionLabel="Compress PDF Now" />} 
          />
          <Route 
            path="/rotate-pdf" 
            element={<GenericTool title="Rotate PDF" description="Rotate PDF pages clockwise or counter-clockwise." icon={faRotate} actionLabel="Rotate PDF Now" />} 
          />
          <Route 
            path="/protect-pdf" 
            element={<GenericTool title="Protect PDF" description="Add strong password security and encryption to your PDF file." icon={faLock} actionLabel="Protect PDF Now" />} 
          />
          <Route 
            path="/images-to-pdf" 
            element={<GenericTool title="Images to PDF" description="Convert JPG, PNG, or WebP images into a single PDF document." icon={faFilePdf} actionLabel="Convert Images to PDF" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />} 
          />
          <Route 
            path="/remove-pages" 
            element={<RemovePages />} 
          />
          <Route 
            path="/add-page-numbers" 
            element={<GenericTool title="Add Page Numbers" description="Add customizable page numbering to your PDF with layout and font controls." icon={faHashtag} actionLabel="Add Page Numbers Now" />} 
          />
          <Route 
            path="/watermark-pdf" 
            element={<GenericTool title="Watermark PDF" description="Stamp custom text or image watermarks over your PDF pages." icon={faStamp} actionLabel="Apply Watermark Now" />} 
          />
          <Route 
            path="/crop-pdf" 
            element={<GenericTool title="Crop PDF" description="Trim margins and adjust document boundary boxes across selected or all pages." icon={faCropSimple} actionLabel="Crop PDF Pages Now" />} 
          />
          <Route 
            path="/edit-metadata" 
            element={<GenericTool title="Edit PDF Metadata" description="Inspect and update PDF document properties including Title, Author, and Keywords." icon={faTag} actionLabel="Update Metadata Now" />} 
          />
          <Route 
            path="/reorder-pdf" 
            element={<ReorderPages />} 
          />
          <Route 
            path="/organize-pdf" 
            element={<ReorderPages />} 
          />
          <Route 
            path="/ai-summarizer" 
            element={<AISummarizer />} 
          />

          {/* Authentication & User Workspace Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/history" element={<History />} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
