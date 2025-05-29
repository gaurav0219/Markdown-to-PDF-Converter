document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('markdown-file');
    const fileNameDisplay = document.getElementById('file-name');
    const resultContainer = document.getElementById('result-container');
    const loader = document.getElementById('loader');
    const downloadLink = document.getElementById('download-link');
    const resultMessage = document.getElementById('result-message');

    // Display selected file name
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check if file is selected
        if (fileInput.files.length === 0) {
            alert('Please select a Markdown file to convert.');
            return;
        }
        
        // Get selected output format
        const outputFormat = document.querySelector('input[name="output-format"]:checked').value;
        
        // Create FormData object
        const formData = new FormData();
        formData.append('markdown', fileInput.files[0]);
        formData.append('outputFormat', outputFormat);
        
        // Show loader, hide result container
        resultContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        
        try {
            // Send conversion request
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Conversion failed. Please try again.');
            }
            
            // Get converted file information
            const data = await response.json();
            
            // Set download link
            downloadLink.href = data.downloadUrl;
            downloadLink.download = data.filename;
            
            // Display privacy message if provided
            if (data.message) {
                resultMessage.textContent = data.message;
                resultMessage.classList.remove('hidden');
            } else {
                resultMessage.classList.add('hidden');
            }
            
            // Hide loader, show result container
            loader.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            
            // Automatically start download
            setTimeout(() => {
                window.location.href = data.downloadUrl;
            }, 1000);
            
        } catch (error) {
            // Hide loader
            loader.classList.add('hidden');
            
            // Display error
            alert(error.message || 'An error occurred during conversion. Please try again.');
        }
    });
}); 