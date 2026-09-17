import { useState, useCallback } from 'react';
import { validatePdfFile } from '../utils/fileUtils';

export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'selected' | 'processing' | 'success' | 'error'
  const [progress, setProgress] = useState(0);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const selectFile = useCallback((selectedFile, acceptType = '.pdf') => {
    setError(null);
    const validation = validatePdfFile(selectedFile, acceptType);

    if (!validation.valid) {
      setError(validation.error);
      setStatus('error');
      setFile(null);
      return false;
    }

    setFile(selectedFile);
    setFiles([selectedFile]);
    setStatus('selected');
    setProgress(0);
    return true;
  }, []);

  const selectMultipleFiles = useCallback((selectedFileList, acceptType = '.pdf') => {
    setError(null);
    const validFiles = [];
    let errMessage = null;

    for (let f of selectedFileList) {
      const validation = validatePdfFile(f, acceptType);
      if (validation.valid) {
        validFiles.push(f);
      } else if (!errMessage) {
        errMessage = validation.error;
      }
    }

    if (validFiles.length === 0) {
      setError(errMessage || 'No valid files selected.');
      setStatus('error');
      return false;
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setFile(validFiles[0]);
    setStatus('selected');
    setProgress(0);
    return true;
  }, []);

  const removeFileAtIndex = useCallback((index) => {
    setFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length === 0) {
        setFile(null);
        setStatus('idle');
      } else {
        setFile(updated[0]);
      }
      return updated;
    });
  }, []);

  const handleDrop = useCallback((e, isMultiple = false) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (isMultiple) {
        selectMultipleFiles(droppedFiles);
      } else {
        selectFile(droppedFiles[0]);
      }
    }
  }, [selectFile, selectMultipleFiles]);

  const reset = useCallback(() => {
    setFile(null);
    setFiles([]);
    setError(null);
    setStatus('idle');
    setProgress(0);
    setIsDragging(false);
  }, []);

  return {
    file,
    files,
    isDragging,
    error,
    status,
    progress,
    setStatus,
    setProgress,
    setError,
    selectFile,
    selectMultipleFiles,
    removeFileAtIndex,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
  };
}

