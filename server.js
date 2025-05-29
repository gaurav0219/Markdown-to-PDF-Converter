const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const showdown = require('showdown');
const http = require('http');
const htmlToPdf = require('html-pdf');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up static file serving
app.use(express.static('public'));

// Create uploads and downloads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const downloadsDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Cleanup function to delete existing files in a directory
function cleanupDirectory(directory) {
    try {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const filePath = path.join(directory, file);
            fs.unlinkSync(filePath);
            console.log(`Deleted existing file: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error cleaning up directory ${directory}:`, err);
    }
}

// Clean up any existing files on server startup
cleanupDirectory(uploadsDir);
cleanupDirectory(downloadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename using timestamp
        const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniquePrefix + '-' + file.originalname);
    }
});

// Filter to only accept markdown files
const fileFilter = (req, file, cb) => {
    console.log('File received:', file.originalname, file.mimetype);
    
    // Accept .md, .markdown, or .txt files
    if (file.mimetype === 'text/markdown' || 
        file.mimetype === 'text/plain' ||
        file.originalname.toLowerCase().endsWith('.md') ||
        file.originalname.toLowerCase().endsWith('.markdown') ||
        file.originalname.toLowerCase().endsWith('.txt')) {
        cb(null, true);
    } else {
        cb(new Error('Only Markdown files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
    }
});

// Serve downloads directory - only temporary access
app.use('/downloads', express.static(downloadsDir));

// Convert Markdown to PDF
function convertToPdf(markdownContent, outputPath, options, callback) {
    // Set default options if not provided
    options = options || {
        addToc: true,
        addCover: true,
        addPageNumbers: true
    };
    
    // Create a simple HTML file from markdown
    const converter = new showdown.Converter({
        tables: true,
        tasklists: true,
        strikethrough: true,
        emoji: true,
        parseImgDimensions: true
    });
    
    // Get a title from the first heading or use default
    let documentTitle = "Converted Document";
    const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
        documentTitle = titleMatch[1].trim();
    }
    
    const html = converter.makeHtml(markdownContent);
    
    // Create a table of contents by extracting headings
    let tableOfContents = '';
    if (options.addToc) {
        tableOfContents = '<div class="toc"><h2>Table of Contents</h2><ul>';
        const headings = markdownContent.match(/^(#{1,3})\s+(.+)$/gm) || [];
        
        headings.forEach(heading => {
            const level = heading.match(/^(#{1,3})/)[0].length;
            const text = heading.replace(/^#{1,3}\s+/, '').trim();
            const anchor = text.toLowerCase().replace(/[^\w]+/g, '-');
            
            tableOfContents += `<li class="toc-level-${level}"><a href="#${anchor}">${text}</a></li>`;
        });
        
        tableOfContents += '</ul></div>';
    }
    
    // Process the HTML to add IDs to headings for the TOC
    let processedHtml = html;
    if (options.addToc) {
        processedHtml = html.replace(/<h([1-3])>(.+?)<\/h\1>/g, (match, level, content) => {
            const anchor = content.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${anchor}">${content}</h${level}>`;
        });
    }
    
    // Prepare HTML sections
    let coverPage = '';
    if (options.addCover) {
        coverPage = `
        <!-- Cover Page -->
        <div class="cover-page">
            <h1>${documentTitle}</h1>
            <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
        </div>
        `;
    }
    
    // CSS for page numbers
    let pageNumbersCSS = '';
    if (options.addPageNumbers) {
        pageNumbersCSS = `
        /* Page numbers */
        @page {
            @bottom-right {
                content: counter(page);
                font-size: 10pt;
            }
        }
        `;
    }
    
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${documentTitle}</title>
        <style>
            @page {
                size: A4;
                margin: 2.54cm; /* 1 inch = 2.54 cm */
            }
            
            /* Font settings */
            body { 
                font-family: Calibri, Arial, sans-serif; 
                font-size: 11pt;
                line-height: 1.15;
                margin: 0;
                padding: 0;
                counter-reset: page;
            }
            
            /* Cover page */
            .cover-page {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                page-break-after: always;
                text-align: center;
            }
            
            .cover-page h1 {
                font-size: 24pt;
                color: #1F497D;
                margin-bottom: 2cm;
            }
            
            .cover-page .date {
                margin-top: 3cm;
                font-size: 12pt;
                color: #666;
            }
            
            /* Table of Contents */
            .toc {
                page-break-after: always;
                margin-bottom: 2cm;
            }
            
            .toc h2 {
                font-size: 18pt;
                color: #1F497D;
                margin-bottom: 1cm;
            }
            
            .toc ul {
                list-style-type: none;
                padding-left: 0;
            }
            
            .toc li {
                margin-bottom: 0.5cm;
            }
            
            .toc a {
                text-decoration: none;
                color: #333;
            }
            
            .toc-level-1 {
                font-weight: bold;
            }
            
            .toc-level-2 {
                padding-left: 1cm;
            }
            
            .toc-level-3 {
                padding-left: 2cm;
                font-size: 10pt;
            }
            
            /* Main content */
            .content {
                ${options.addToc || options.addCover ? '/* Start on a new page after TOC */\n                page-break-before: always;' : ''}
            }
            
            h1, h2, h3 { 
                color: #1F497D; 
                font-weight: bold;
                font-size: 14pt;
                margin-bottom: 6pt;
            }
            
            h1 {
                font-size: 16pt;
                border-bottom: 1px solid #1F497D;
                padding-bottom: 3pt;
            }
            
            h2 {
                font-size: 14pt;
            }
            
            h3 {
                font-size: 12pt;
            }
            
            p {
                margin-top: 0;
                margin-bottom: 6pt;
            }
            
            /* Code blocks */
            pre { 
                background: #f5f5f5; 
                border: 1px solid #ddd; 
                padding: 10px; 
                font-family: Consolas, "Courier New", monospace;
                font-size: 10.5pt;
                white-space: pre-wrap;
                page-break-inside: avoid;
            }
            
            code { 
                background: #f5f5f5; 
                padding: 2px 5px; 
                font-family: Consolas, "Courier New", monospace;
                font-size: 10.5pt;
                border-radius: 3px;
            }
            
            /* Blockquotes */
            blockquote { 
                border-left: 3px solid #1F497D; 
                padding-left: 10px;
                margin-left: 0;
                color: #666; 
                font-style: italic;
            }
            
            /* Lists */
            ul, ol {
                margin-top: 0;
                margin-bottom: 6pt;
            }
            
            li {
                margin-bottom: 3pt;
            }
            
            /* Tables */
            table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 1em;
                page-break-inside: avoid;
            }
            
            th {
                background-color: #f2f2f2;
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                font-weight: bold;
            }
            
            td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            
            /* Task lists */
            .task-list-item {
                list-style-type: none;
            }
            
            .task-list-item input {
                margin-right: 0.5em;
            }
            
            /* Horizontal rule */
            hr {
                border: none;
                height: 1px;
                background-color: #ddd;
                margin: 1em 0;
            }
            
            ${pageNumbersCSS}
            
            /* Footer */
            .footer {
                position: fixed;
                bottom: 0;
                width: 100%;
                text-align: center;
                font-size: 9pt;
                color: #666;
            }
        </style>
    </head>
    <body>
        ${coverPage}
        
        ${tableOfContents}
        
        <!-- Main Content -->
        <div class="content">
            ${processedHtml}
        </div>
        
        <!-- Footer -->
        <div class="footer">
            Generated by Markdown Converter
        </div>
    </body>
    </html>
    `;
    
    // PDF generation options
    const pdfOptions = {
        format: 'A4',
        border: {
            top: '2.54cm',    // 1 inch
            right: '2.54cm',  // 1 inch
            bottom: '2.54cm', // 1 inch
            left: '2.54cm'    // 1 inch
        }
    };
    
    // Add footer with page numbers if requested
    if (options.addPageNumbers) {
        pdfOptions.footer = {
            height: '1cm',
            contents: {
                default: '<div style="text-align: center; font-size: 9pt; color: #666;">Page {{page}} of {{pages}}</div>'
            }
        };
    }
    
    // Generate the PDF
    htmlToPdf.create(fullHtml, pdfOptions).toFile(outputPath, (err, res) => {
        if (err) {
            console.error('PDF generation error:', err);
            return callback(err);
        }
        
        // Delete the file after 60 seconds for privacy
        setTimeout(() => {
            try {
                fs.unlink(outputPath, (err) => {
                    if (err) console.error('Error deleting PDF file:', err);
                    else console.log(`PDF file ${outputPath} deleted for privacy`);
                });
            } catch (err) {
                console.error('Error in deletion timer:', err);
            }
        }, 60000); // 60 seconds timeout
        
        callback(null);
    });
}

// Conversion endpoint
app.post('/convert', upload.single('markdownFile'), (req, res) => {
    try {
        console.log('Convert request received');
        console.log('Files:', req.file ? req.file.originalname : 'No file');
        console.log('Body:', req.body);
        
        if (!req.file) {
            console.error('No file provided or invalid file type');
            return res.status(400).json({ error: 'No file provided or invalid file type' });
        }

        // Get options from the request
        const addToc = req.body.addToc === 'true' || req.body.addToc === true;
        const addCover = req.body.addCover === 'true' || req.body.addCover === true;
        const addPageNumbers = req.body.addPageNumbers === 'true' || req.body.addPageNumbers === true;
        
        console.log('Options:', { addToc, addCover, addPageNumbers });
        
        const uploadedFilePath = req.file.path;
        const fileBaseName = path.basename(req.file.originalname, '.md');
        const timestamp = Date.now();
        
        // Read the markdown content
        const markdownContent = fs.readFileSync(uploadedFilePath, 'utf8');
        console.log('Markdown content length:', markdownContent.length);
        
        // Delete the uploaded file immediately after reading its contents
        fs.unlink(uploadedFilePath, (err) => {
            if (err) console.error('Error deleting uploaded file:', err);
            else console.log(`Uploaded file ${uploadedFilePath} deleted for privacy`);
        });
        
        // Options object for the conversion functions
        const conversionOptions = {
            addToc,
            addCover,
            addPageNumbers
        };

        // Convert to PDF
        const outputFilePath = path.join(downloadsDir, `${fileBaseName}-${timestamp}.pdf`);
        
        convertToPdf(markdownContent, outputFilePath, conversionOptions, (err) => {
            if (err) {
                console.error('PDF conversion error:', err);
                return res.status(500).json({ error: 'PDF conversion failed' });
            }
            
            // Wait to ensure file is completely written
            setTimeout(() => {
                // Check if file exists and has content
                try {
                    const stats = fs.statSync(outputFilePath);
                    if (stats.size === 0) {
                        return res.status(500).json({ error: 'Generated PDF file is empty' });
                    }
                    
                    // Set content disposition header for automatic download
                    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputFilePath)}"`);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Length', stats.size);
                    
                    // Send file
                    fs.createReadStream(outputFilePath).pipe(res);
                } catch (fileErr) {
                    console.error('Error accessing PDF file:', fileErr);
                    return res.status(500).json({ error: 'Error accessing PDF file' });
                }
            }, 1000); // Give a second for the file to be completely written
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed' });
    }
});

// Handle multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        console.error('Multer error:', err);
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
        // An unknown error occurred
        console.error('Server error:', err);
        return res.status(500).json({ error: `Server error: ${err.message}` });
    }
    next();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 