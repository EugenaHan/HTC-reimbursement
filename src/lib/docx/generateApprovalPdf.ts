import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 12;
const PDF_TARGET_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_EXPORT_PROFILES = [
  { scale: 1.9, quality: 0.88 },
  { scale: 1.7, quality: 0.82 },
  { scale: 1.5, quality: 0.76 },
  { scale: 1.35, quality: 0.7 },
  { scale: 1.2, quality: 0.62 },
  { scale: 1.05, quality: 0.54 },
] as const;

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

const renderPageToCanvas = async (page: HTMLElement, previewWidth: number, scale: number) =>
  html2canvas(page, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    width: previewWidth,
    windowWidth: previewWidth,
  });

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

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

  const imageWidthMm = usableWidthMm;

  try {
    let bestBlob: Blob | null = null;

    for (const profile of PDF_EXPORT_PROFILES) {
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
        putOnlyUsedFonts: true,
      });

      for (const [index, page] of pages.entries()) {
        const canvas = await renderPageToCanvas(page, previewWidth, profile.scale);
        const imageHeightMm = (canvas.height * imageWidthMm) / canvas.width;
        const imageData = canvas.toDataURL("image/jpeg", profile.quality);

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          imageData,
          "JPEG",
          PDF_MARGIN_MM,
          PDF_MARGIN_MM,
          imageWidthMm,
          imageHeightMm,
          undefined,
          "MEDIUM",
        );
      }

      const blob = pdf.output("blob");
      bestBlob = blob;

      if (blob.size <= PDF_TARGET_SIZE_BYTES) {
        break;
      }
    }

    if (bestBlob) {
      downloadBlob(bestBlob, fileName);
    }
  } finally {
    document.body.removeChild(stagingRoot);
  }
}
