import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import PizZip from "pizzip";
import { format } from "date-fns";
import type { ExpenseApplicationFormValues } from "../form/types";
import { mapFormValuesToTemplateData } from "./mappers";

const TEMPLATE_PATH = `${import.meta.env.BASE_URL}template.docx`;

export async function generateApprovalDoc(values: ExpenseApplicationFormValues) {
  const response = await fetch(TEMPLATE_PATH);

  if (!response.ok) {
    throw new Error("未找到 public/template.docx，请先运行 npm run generate:template");
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const templateData = mapFormValuesToTemplateData(values);

  const document = new Docxtemplater(zip, {
    linebreaks: true,
    paragraphLoop: true,
  });

  document.render(templateData);

  const blob = document.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const dateSegment = format(new Date(), "yyyyMMdd");
  const safeName = values.employeeName.trim() || "未命名";
  saveAs(blob, `出差报销申请单_${safeName}_${dateSegment}.docx`);
}
