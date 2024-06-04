document.addEventListener('DOMContentLoaded', function() {
    const { jsPDF } = window.jspdf;
    const fileInput = document.getElementById('file-input');
    const fileInput2 = document.getElementById('file-input-2');
    const uploadSectionBefore = document.getElementById('upload-section-before');
    const uploadSectionAfter = document.getElementById('upload-section-after');
    const fileList = document.getElementById('file-list');
    const dropArea = document.getElementById('drop-area');
    const dropArea2 = document.getElementById('drop-area-2');
    const browseButtons = document.querySelectorAll('.browse');
    const generatePdfButton = document.getElementById('generate-pdf');
    const downloadLink = document.getElementById('download-link');
    const userText = document.getElementById('user-text');

    let filesArray = [];

    browseButtons.forEach(button => {
        button.addEventListener('click', function() {
            fileInput.click();
        });
    });

    fileInput.addEventListener('change', handleFiles);
    fileInput2.addEventListener('change', handleFiles);

    async function handleFiles(event) {
        const files = Array.from(event.target.files);
        for (const file of files) {
            if (file.type === 'image/heic') {
                try {
                    const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
                    const convertedFile = new File([convertedBlob], file.name.split('.')[0] + '.jpg', { type: 'image/jpeg' });
                    filesArray.push(convertedFile);
                    displayFile(convertedFile);
                } catch (error) {
                    console.error('HEIC conversion error:', error);
                }
            } else {
                filesArray.push(file);
                displayFile(file);
            }
        }
        uploadSectionBefore.style.display = 'none';
        uploadSectionAfter.style.display = 'block';
    }

    function displayFile(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const thumbnail = document.createElement('img');
        thumbnail.className = 'thumbnail';
        thumbnail.src = URL.createObjectURL(file);

        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        
        // Dosya ismini kısalt
        const truncatedName = file.name.length > 15 ? file.name.substring(0, 12) + '...' + file.name.split('.').pop() : file.name;
        fileName.textContent = truncatedName;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', function() {
            fileList.removeChild(fileItem);
            filesArray = filesArray.filter(f => f !== file);
            if (fileList.children.length === 0) {
                uploadSectionBefore.style.display = 'block';
                uploadSectionAfter.style.display = 'none';
                downloadLink.style.display = 'none';
            }
        });

        fileItem.appendChild(thumbnail);
        fileItem.appendChild(fileName);
        fileItem.appendChild(removeButton);
        fileList.appendChild(fileItem);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropArea.classList.add('dragover');
        dropArea2.classList.add('dragover');
    }

    function unhighlight(e) {
        dropArea.classList.remove('dragover');
        dropArea2.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        dropArea2.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
        dropArea2.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
        dropArea2.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
    dropArea2.addEventListener('drop', handleDrop, false);

    generatePdfButton.addEventListener('click', async function() {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxImageHeight = (pageHeight - 3 * margin) / 2;
        const maxImageWidth = (pageWidth - 3 * margin) / 2;
        let x = margin, y = margin;

        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(resolve => {
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // Sıkıştırma kalitesi 0.5

                    const ratio = Math.min(maxImageWidth / img.width, maxImageHeight / img.height);
                    const imgWidth = img.width * ratio;
                    const imgHeight = img.height * ratio;

                    if (i % 4 === 0 && i !== 0) {
                        pdf.addPage();
                        x = margin;
                        y = margin;
                    }

                    pdf.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);

                    x += maxImageWidth + margin;
                    if (x >= pageWidth - margin) {
                        x = margin;
                        y += maxImageHeight + margin;
                    }

                    resolve();
                }
            });
        }

        // Add the text and the black background on the first page
        pdf.setPage(1);
        const text = userText.value;
        const fontSize = 20;
        const textWidth = pdf.getTextWidth(text);
        const textX = (pageWidth - textWidth) / 2;
        const textY = pageHeight - margin;

        pdf.setFillColor(0, 0, 0, 1); // Tam siyah
        pdf.rect(0, pageHeight - margin - fontSize - 10, pageWidth, fontSize + 20, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(fontSize);
        pdf.text(text, textX, pageHeight - margin - 10);

        const pdfOutput = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfOutput);
        downloadLink.href = pdfUrl;
        downloadLink.style.display = 'block';
    });
});
