import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { detectPageFormat } from '../../utils/editorCoordinates';
import EditorTextOverlay from './EditorTextOverlay';
import EditorTextLayer from './EditorTextLayer';

export default function EditorCanvas({
  pdfDocProxy,
  currentPage = 1,
  zoom = 1.0,
  onPageGeometryLoaded,
  viewportContainerRef,
  // Text Overlay Props
  textBoxes = [],
  textReplacements = [],
  activeTool = 'select',
  selectedTextBoxId = null,
  onSelectTextBox,
  onDeselect,
  onCreateTextBox,
  onUpdateTextBox,
  onDeleteTextBox,
  // Existing Text Replacement & Direct Editing Props
  onApplyExistingTextReplacement,
  onDeleteExistingTextReplacement,
  onRevertExistingTextReplacement,
  onApplyDirectEdit,
  onRequestAreaTool,
  // Section-based Selection & Word-style Editing Props
  selectionLevel = 'word',
  activeTextEdit = null,
  onSetActiveTextEdit,
  onUpdateActiveTextEdit,
  onApplyActiveTextEdit,
  onCancelActiveTextEdit,
  onRevertActiveTextEdit,
}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [unscaledGeo, setUnscaledGeo] = useState({ widthPt: 612, heightPt: 792, rotation: 0 });

  useEffect(() => {
    if (!pdfDocProxy) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        setRenderError(null);

        // Cancel previous in-flight render task if user switched page or zoomed
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (_) {}
          renderTaskRef.current = null;
        }

        const page = await pdfDocProxy.getPage(currentPage);
        if (isCancelled) return;

        // Unscaled geometry (72 pt = 1 inch)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const widthPt = unscaledViewport.width;
        const heightPt = unscaledViewport.height;
        const rotation = page.rotate || 0;
        const format = detectPageFormat(widthPt, heightPt);

        setUnscaledGeo({ widthPt, heightPt, rotation });

        // Scaled viewport according to user zoom
        const viewport = page.getViewport({ scale: zoom });
        const cssWidth = Math.floor(viewport.width);
        const cssHeight = Math.floor(viewport.height);
        setPageDimensions({ width: cssWidth, height: cssHeight });

        // Notify parent of unscaled and scaled geometry
        if (typeof onPageGeometryLoaded === 'function') {
          onPageGeometryLoaded({
            widthPt,
            heightPt,
            rotation,
            format,
            zoom,
            cssWidth,
            cssHeight,
          });
        }

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) {
          setIsRendering(false);
          return;
        }

        const ctx = canvas.getContext('2d', { alpha: false });
        // High-DPI support: scale canvas buffer by devicePixelRatio (capped at 2.5 for memory)
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        // Scale context to match DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Solid white paper background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;

        await task.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error('[EditorCanvas Render Error]:', err);
          setRenderError('Failed to render document page. Please try refreshing.');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
      }
    };
  }, [pdfDocProxy, currentPage, zoom, onPageGeometryLoaded]);

  // Precise pixel sampling helper: extracts the dominant text glyph color from rendered canvas
  const sampleTextColor = React.useCallback(
    (ptX, ptY, ptWidth, ptHeight) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const sx = Math.max(0, Math.floor(ptX * zoom * dpr));
        const sy = Math.max(0, Math.floor(ptY * zoom * dpr));
        const sw = Math.min(canvas.width - sx, Math.max(1, Math.ceil(ptWidth * zoom * dpr)));
        const sh = Math.min(canvas.height - sy, Math.max(1, Math.ceil(ptHeight * zoom * dpr)));

        if (sw <= 0 || sh <= 0) return null;

        const imgData = ctx.getImageData(sx, sy, sw, sh);
        const data = imgData.data;
        const colorCounts = new Map();
        let maxCount = 0;
        let dominantColor = null;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip white/near-white background or transparent pixels
          if (a < 50 || (r > 230 && g > 230 && b > 230)) {
            continue;
          }

          // Quantize to 8 to group anti-aliased subpixels
          const qr = Math.round(r / 8) * 8;
          const qg = Math.round(g / 8) * 8;
          const qb = Math.round(b / 8) * 8;
          const key = `${qr},${qg},${qb}`;

          const count = (colorCounts.get(key) || 0) + 1;
          colorCounts.set(key, count);

          if (count > maxCount) {
            maxCount = count;
            dominantColor = { r, g, b };
          }
        }

        if (dominantColor) {
          const toHex = (c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
          return `#${toHex(dominantColor.r)}${toHex(dominantColor.g)}${toHex(dominantColor.b)}`;
        }
      } catch (err) {
        // Cross-origin or context error, safely ignore
      }
      return null;
    },
    [zoom]
  );

  return (
    <main
      ref={viewportContainerRef}
      className="editor-center-stage"
      aria-label="PDF Document Canvas Viewport"
      tabIndex={0}
    >
      <div className="canvas-scroll-container">
        {renderError ? (
          <div className="canvas-error-box" role="alert">
            <FontAwesomeIcon icon={faTriangleExclamation} className="error-icon" />
            <p className="error-text">{renderError}</p>
          </div>
        ) : (
          <div
            className="editor-page-wrapper"
            style={{
              width: `${pageDimensions.width || 612}px`,
              height: `${pageDimensions.height || 792}px`,
            }}
          >
            {/* Layer 1: PDF.js Base Render Canvas */}
            <canvas ref={canvasRef} className="editor-pdf-canvas" />

            {/* Layer 2: Text Layer (Existing Text Selection, Genuine In-Place Replacement & Area Cover) */}
            <EditorTextLayer
              pdfDocProxy={pdfDocProxy}
              currentPage={currentPage}
              zoom={zoom}
              pagePtWidth={unscaledGeo.widthPt}
              pagePtHeight={unscaledGeo.heightPt}
              activeTool={activeTool}
              textReplacements={textReplacements}
              onApplyReplacement={onApplyExistingTextReplacement || onApplyDirectEdit}
              onDeleteReplacement={onDeleteExistingTextReplacement}
              onRevertReplacement={onRevertExistingTextReplacement}
              onRequestAreaTool={onRequestAreaTool}
              selectionLevel={selectionLevel}
              activeTextEdit={activeTextEdit}
              onSetActiveTextEdit={onSetActiveTextEdit}
              onUpdateActiveTextEdit={onUpdateActiveTextEdit}
              onApplyActiveTextEdit={onApplyActiveTextEdit}
              onCancelActiveTextEdit={onCancelActiveTextEdit}
              onRevertActiveTextEdit={onRevertActiveTextEdit}
              sampleTextColor={sampleTextColor}
            />

            {/* Layer 3: Interactive Text & Annotations Overlay */}
            <EditorTextOverlay
              textBoxes={textBoxes}
              currentPage={currentPage}
              zoom={zoom}
              pagePtWidth={unscaledGeo.widthPt}
              pagePtHeight={unscaledGeo.heightPt}
              activeTool={activeTool}
              selectedTextBoxId={selectedTextBoxId}
              onSelectTextBox={onSelectTextBox}
              onDeselect={onDeselect}
              onCreateTextBox={onCreateTextBox}
              onUpdateTextBox={onUpdateTextBox}
              onDeleteTextBox={onDeleteTextBox}
            />

            {/* In-flight Rendering Spinner */}
            {isRendering && (
              <div className="canvas-render-loading-overlay" aria-live="polite">
                <FontAwesomeIcon icon={faSpinner} spin className="render-spin-icon" />
                <span className="render-spin-text">Rendering Page {currentPage}...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
