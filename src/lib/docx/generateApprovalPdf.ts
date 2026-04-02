import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 12;
const PDF_RENDER_SCALE = 2;

const createPageShell = (previewElement: HTMLElement, previewWidth: number) => {
  const computedStyle = window.getComputedStyle(previewElement);
  const page = document.createElement("div");

  page.style.boxSizing = "border-box";
  page.style.width = `${previewWidth}px`;
  page.style.minHeight = "1px";
  page.style.padding = computedStyle.padding;
  page.style.background = computedStyle.backgroundColor || "#ffffff";
  page.style.color = computedStyle.color;
  page.style.fontFamily = computedStyle.fontFamily;
  page.style.fontSize = computedStyle.fontSize;
  page.style.fontWeight = computedStyle.fontWeight;
  page.style.lineHeight = computedStyle.lineHeight;
  page.style.letterSpacing = computedStyle.letterSpacing;
  page.style.borderRadius = "0";
  page.style.boxShadow = "none";
  page.style.overflow = "hidden";

  return page;
};

const renderPageToCanvas = async (page: HTMLElement, previewWidth: number) =>
  html2canvas(page, {
    backgroundColor: "#ffffff",
    scale: PDF_RENDER_SCALE,
    useCORS: true,
    width: previewWidth,
    windowWidth: previewWidth,
  });

export async function generateApprovalPdf(previewElement: HTMLElement, fileName: string) {
  const blockElements = Array.from(
    previewElement.querySelectorAll<HTMLElement>("[data-pdf-block='true']"),
  );

  const previewWidth = Math.ceil(previewElement.getBoundingClientRect().width);
  const usableWidthMm = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2;
  const usableHeightMm = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2;
  const pageHeightPx = Math.floor((previewWidth * usableHeightMm) / usableWidthMm);

  const stagingRoot = document.createElement("div");
  stagingRoot.style.position = "fixed";
  stagingRoot.style.left = "-20000px";
  stagingRoot.style.top = "0";
  stagingRoot.style.width = `${previewWidth}px`;
  stagingRoot.style.pointerEvents = "none";
  stagingRoot.style.opacity = "0";
  stagingRoot.style.zIndex = "-1";
  stagingRoot.style.background = "#ffffff";
  document.body.appendChild(stagingRoot);

  const pages: HTMLElement[] = [];
  let currentPage = createPageShell(previewElement, previewWidth);
  stagingRoot.appendChild(currentPage);
  pages.push(currentPage);

  const blocks = blockElements.length ? blockElements : [previewElement];

  for (const block of blocks) {
    const clone = block.cloneNode(true) as HTMLElement;
    clone.style.breakInside = "avoid";
    currentPage.appendChild(clone);

    if (currentPage.scrollHeight > pageHeightPx && currentPage.childElementCount > 1) {
      currentPage.removeChild(clone);
      currentPage = createPageShell(previewElement, previewWidth);
      stagingRoot.appendChild(currentPage);
      pages.push(currentPage);
      currentPage.appendChild(clone);
    }
  }

  const pdf = new jsPDF("p", "mm", "a4");
  const imageWidthMm = usableWidthMm;

  try {
    for (const [index, page] of pages.entries()) {
      const canvas = await renderPageToCanvas(page, previewWidth);
      const imageHeightMm = (canvas.height * imageWidthMm) / canvas.width;
      const imageData = canvas.toDataURL("image/png");

      if (index > 0) {
        pdf.addPage();
      }

      pdf.addImage(imageData, "PNG", PDF_MARGIN_MM, PDF_MARGIN_MM, imageWidthMm, imageHeightMm);
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(stagingRoot);
  }
}
