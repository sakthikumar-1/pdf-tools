<?php
/**
 * PDF Service Engine
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/security.php';

class PDFService {
    /**
     * Converts a PDF file into JPG images
     * @param string $pdfPath
     * @param int $dpi
     * @return array
     */
    public function convertPdfToJpg($pdfPath, $dpi = 150) {
        $outputPrefix = 'page_' . bin2hex(random_bytes(4));
        $outputFolder = OUTPUTS_DIR;
        $generatedImages = [];

        // 1. Try PHP Imagick Extension if available
        if (extension_loaded('imagick')) {
            try {
                $imagick = new Imagick();
                $imagick->setResolution($dpi, $dpi);
                $imagick->readImage($pdfPath);

                $numPages = $imagick->getNumberImages();

                foreach ($imagick as $i => $page) {
                    $page->setImageFormat('jpeg');
                    $page->setImageCompressionQuality(90);

                    $fileName = sprintf('%s_page_%d.jpg', $outputPrefix, $i + 1);
                    $outputPath = $outputFolder . '/' . $fileName;

                    $page->writeImage($outputPath);

                    $generatedImages[] = [
                        'pageNumber' => $i + 1,
                        'fileName' => $fileName,
                        'url' => '/api/download.php?file=' . urlencode($fileName),
                        'size' => filesize($outputPath)
                    ];
                }

                $imagick->clear();
                $imagick->destroy();

                return [
                    'success' => true,
                    'totalPages' => $numPages,
                    'images' => $generatedImages
                ];
            } catch (Exception $e) {
                error_log("Imagick conversion failed: " . $e->getMessage());
            }
        }

        // 2. Try pdftoppm shell utility if installed
        $outputFilePrefix = $outputFolder . '/' . $outputPrefix;
        $cmd = sprintf("pdftoppm -jpeg -r %d %s %s 2>&1", (int)$dpi, escapeshellarg($pdfPath), escapeshellarg($outputFilePrefix));
        @exec($cmd, $output, $returnVar);

        if ($returnVar === 0) {
            $createdFiles = glob($outputFolder . '/' . $outputPrefix . '-*.jpg');
            sort($createdFiles);

            foreach ($createdFiles as $idx => $filePath) {
                $basename = basename($filePath);
                $generatedImages[] = [
                    'pageNumber' => $idx + 1,
                    'fileName' => $basename,
                    'url' => '/api/download.php?file=' . urlencode($basename),
                    'size' => filesize($filePath)
                ];
            }

            if (!empty($generatedImages)) {
                return [
                    'success' => true,
                    'totalPages' => count($generatedImages),
                    'images' => $generatedImages
                ];
            }
        }

        // 3. Structured error feedback when server image libraries are absent
        return [
            'success' => false,
            'message' => 'PDF image rendering extension (Imagick or pdftoppm) is not installed on this PHP host.',
            'useClientFallback' => true
        ];
    }
}
