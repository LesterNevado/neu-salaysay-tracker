
import { jsPDF } from 'jspdf';

/**
 * Converts an image file to a PDF
 * @param imageFile - The image file to convert
 * @returns Promise resolving to a File object containing the PDF
 */
export async function convertImageToPdf(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        try {
          if (!event.target?.result) {
            throw new Error('Failed to load image data');
          }
          
          // Create a new jsPDF instance
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
          });
          
          // Create an image element to get dimensions
          const img = new Image();
          img.src = event.target.result as string;
          
          img.onload = function() {
            // Calculate dimensions to fit the image properly on the PDF page
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Calculate scaling to fit image on page while maintaining aspect ratio
            const imgRatio = img.height / img.width;
            let imgWidth = pageWidth - 40; // Add margins
            let imgHeight = imgWidth * imgRatio;
            
            // If image height exceeds page height, scale down further
            if (imgHeight > pageHeight - 40) {
              imgHeight = pageHeight - 40;
              imgWidth = imgHeight / imgRatio;
            }
            
            // Calculate position to center the image
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            
            // Add the image to the PDF
            doc.addImage(
              event.target.result as string,
              imageFile.type === 'image/png' ? 'PNG' : 'JPEG',
              x,
              y,
              imgWidth,
              imgHeight
            );
            
            // Generate the PDF as a blob
            const pdfBlob = doc.output('blob');
            
            // Create a new file from the blob
            const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '.pdf';
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            resolve(pdfFile);
          };
        } catch (error) {
          console.error('Error in PDF conversion:', error);
          reject(error);
        }
      };
      
      reader.onerror = function(error) {
        console.error('Error reading file:', error);
        reject(error);
      };
      
      // Read the image file as a data URL
      reader.readAsDataURL(imageFile);
      
    } catch (error) {
      console.error('Error in convertImageToPdf:', error);
      reject(error);
    }
  });
}
