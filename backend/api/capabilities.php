<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function isBinaryAvailable($binary) {
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        $where = @shell_exec("where " . escapeshellarg($binary) . " 2>NUL");
        return !empty($where);
    } else {
        $which = @shell_exec("which " . escapeshellarg($binary) . " 2>/dev/null");
        return !empty($which);
    }
}

$hasQpdf = isBinaryAvailable('qpdf');
$hasLibreOffice = isBinaryAvailable('soffice') || isBinaryAvailable('libreoffice');
$hasGhostscript = isBinaryAvailable('gs') || isBinaryAvailable('gswin64c');
$hasTesseract = isBinaryAvailable('tesseract');
$hasPoppler = isBinaryAvailable('pdftotext');

$tools = [
    'protect-pdf' => [
        'available' => $hasQpdf,
        'engine' => 'qpdf',
        'status' => $hasQpdf ? 'AVAILABLE' : 'SERVER REQUIRED',
        'reason' => $hasQpdf ? 'qpdf 256-bit encryption active' : 'qpdf server binary is required for real 256-bit PDF password encryption'
    ],
    'pdf-to-word' => [
        'available' => true,
        'engine' => $hasLibreOffice ? 'LibreOffice CLI' : 'Client OpenXML AST',
        'status' => $hasLibreOffice ? 'AVAILABLE' : 'LIMITED',
        'reason' => $hasLibreOffice ? 'Full layout engine active' : 'Client structural text reconstruction active'
    ],
    'pdf-to-excel' => [
        'available' => true,
        'engine' => $hasLibreOffice ? 'LibreOffice CLI' : 'SheetJS XLSX Compiler',
        'status' => $hasLibreOffice ? 'AVAILABLE' : 'LIMITED',
        'reason' => $hasLibreOffice ? 'Full table engine active' : 'Tabular cell clustering active'
    ],
    'pdf-to-ppt' => [
        'available' => true,
        'engine' => $hasLibreOffice ? 'LibreOffice CLI' : 'OpenXML Slide AST',
        'status' => $hasLibreOffice ? 'AVAILABLE' : 'LIMITED',
        'reason' => $hasLibreOffice ? 'Presentation layout engine active' : 'Slide text shape AST active'
    ],
    'compress-pdf' => [
        'available' => true,
        'engine' => $hasGhostscript ? 'Ghostscript pdfwrite' : 'Canvas Stream Downsampler',
        'status' => 'AVAILABLE',
        'reason' => $hasGhostscript ? 'Vector Ghostscript engine active' : 'Client stream optimizer active'
    ]
];

echo json_encode([
    'status' => 'ok',
    'binaries' => [
        'qpdf' => $hasQpdf,
        'libreoffice' => $hasLibreOffice,
        'ghostscript' => $hasGhostscript,
        'tesseract' => $hasTesseract,
        'poppler' => $hasPoppler
    ],
    'tools' => $tools
]);
