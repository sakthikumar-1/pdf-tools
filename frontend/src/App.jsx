import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import PDFToJPG from './pages/PDFToJPG';
import GenericTool from './pages/GenericTool';
import RemovePages from './pages/RemovePages';
import { 
  FileText, 
  FileSpreadsheet, 
  Images, 
  Type, 
  Presentation, 
  Layers, 
  Scissors, 
  Minimize2, 
  RotateCw, 
  Lock, 
  FileCheck 
} from 'lucide-react';

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
            element={<GenericTool title="PDF to Word" description="Convert PDF documents into editable Microsoft Word (.docx) format." icon={FileText} actionLabel="Convert to Word Now" />} 
          />
          <Route 
            path="/pdf-to-excel" 
            element={<GenericTool title="PDF to Excel" description="Extract PDF tables into clean Microsoft Excel (.xlsx) spreadsheets." icon={FileSpreadsheet} actionLabel="Convert to Excel Now" />} 
          />
          <Route 
            path="/pdf-to-png" 
            element={<GenericTool title="PDF to PNG" description="Convert PDF pages into transparent PNG images." icon={Images} actionLabel="Convert to PNG Now" />} 
          />
          <Route 
            path="/pdf-to-text" 
            element={<GenericTool title="PDF to Text" description="Extract all text content from your PDF documents." icon={Type} actionLabel="Extract Text Now" />} 
          />
          <Route 
            path="/pdf-to-ppt" 
            element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={Presentation} actionLabel="Convert to PowerPoint Now" />} 
          />
          <Route 
            path="/pdf-to-powerpoint" 
            element={<GenericTool title="PDF to PowerPoint" description="Convert PDF slides into Microsoft PPTX presentations with editable text and visual modes." icon={Presentation} actionLabel="Convert to PowerPoint Now" />} 
          />
          <Route 
            path="/merge-pdf" 
            element={<GenericTool title="Merge PDF" description="Combine multiple PDF files into one single organized file." icon={Layers} actionLabel="Merge PDF Files Now" />} 
          />
          <Route 
            path="/split-pdf" 
            element={<GenericTool title="Split PDF" description="Separate one PDF file into multiple documents or extract specific pages." icon={Scissors} actionLabel="Split PDF File Now" />} 
          />
          <Route 
            path="/compress-pdf" 
            element={<GenericTool title="Compress PDF" description="Reduce PDF file size without sacrificing document quality." icon={Minimize2} actionLabel="Compress PDF Now" />} 
          />
          <Route 
            path="/rotate-pdf" 
            element={<GenericTool title="Rotate PDF" description="Rotate PDF pages clockwise or counter-clockwise." icon={RotateCw} actionLabel="Rotate PDF Now" />} 
          />
          <Route 
            path="/protect-pdf" 
            element={<GenericTool title="Protect PDF" description="Add strong password security and encryption to your PDF file." icon={Lock} actionLabel="Protect PDF Now" />} 
          />
          <Route 
            path="/images-to-pdf" 
            element={<GenericTool title="Images to PDF" description="Convert JPG, PNG, or WebP images into a single PDF document." icon={FileCheck} actionLabel="Convert Images to PDF" accept="image/*" />} 
          />
          <Route 
            path="/remove-pages" 
            element={<RemovePages />} 
          />
        </Routes>
      </MainLayout>
    </Router>
  );
}
