import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generateApprovalPdf(previewElement: HTMLElement, fileName: string) {
  const canvas = await html2canvas(previewElement, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
  });

  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 6;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  let renderedHeight = imageHeight;
  let position = margin;

  pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
  renderedHeight -= pageHeight - margin * 2;

  while (renderedHeight > 0) {
    position = renderedHeight - imageHeight + margin;
    pdf.addPage();
    pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
    renderedHeight -= pageHeight - margin * 2;
  }

  pdf.save(fileName);
}
