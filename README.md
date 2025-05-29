# Markdown Converter Web Application

A simple web application that allows users to convert Markdown (.md) files to PDF or DOCX formats.

## Features

- Upload Markdown files
- Convert to PDF or DOCX format
- Download converted files
- Modern, responsive UI
- Simple and intuitive interface

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **File Handling**: Multer for file uploads
- **Conversion Tools**: 
  - markdown-pdf for PDF conversion
  - docx-templates for DOCX conversion

## Installation

1. Clone this repository
   ```
   git clone https://github.com/yourusername/md-converter.git
   cd md-converter
   ```

2. Install dependencies
   ```
   npm install
   ```

3. For DOCX conversion, you need a template file
   - Create a file named `template.docx` in the root directory
   - For a simple template, you can use any Word document with a `{content}` placeholder

## Usage

1. Start the server
   ```
   node server.js
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Upload a Markdown file, select your desired output format, and click "Convert"

4. Download your converted file when the conversion is complete

## Maintenance

- Uploaded files are stored in the `uploads` directory and are automatically deleted after 1 minute
- Converted files are stored in the `downloads` directory

## License

MIT

## Author

Gaurav Pandey