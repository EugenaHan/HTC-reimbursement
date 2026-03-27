from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "public" / "template.docx"

HEADER_COL_WIDTHS_CM = [2.8, 3.0, 3.0, 3.0, 3.0, 3.0]
DETAIL_COL_WIDTHS_CM = [2.6, 3.5, 3.5, 3.0, 4.0]


def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_borders = tc_pr.first_child_found_in("w:tcBorders")
    if tc_borders is None:
        tc_borders = OxmlElement("w:tcBorders")
        tc_pr.append(tc_borders)
    for edge in ("left", "top", "right", "bottom"):
        edge_data = kwargs.get(edge)
        if not edge_data:
            continue
        tag = "w:{}".format(edge)
        element = tc_borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            tc_borders.append(element)
        for key, value in edge_data.items():
            element.set(qn("w:{}".format(key)), str(value))


def set_table_borders(table):
    for row in table.rows:
        for cell in row.cells:
            set_cell_border(
                cell,
                top={"val": "single", "sz": "8", "color": "BFBFBF"},
                bottom={"val": "single", "sz": "8", "color": "BFBFBF"},
                left={"val": "single", "sz": "8", "color": "BFBFBF"},
                right={"val": "single", "sz": "8", "color": "BFBFBF"},
            )


def set_fixed_layout(table):
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    tbl_layout = tbl_pr.first_child_found_in("w:tblLayout")
    if tbl_layout is None:
        tbl_layout = OxmlElement("w:tblLayout")
        tbl_pr.append(tbl_layout)
    tbl_layout.set(qn("w:type"), "fixed")


def set_cell_text(cell, text, *, bold=False, size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = align
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1.0
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(size)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


def merge(row, start, end):
    cell = row.cells[start]
    for index in range(start + 1, end + 1):
        cell = cell.merge(row.cells[index])
    return cell


def apply_col_widths(table, widths):
    set_fixed_layout(table)
    for row in table.rows:
        for index, width in enumerate(widths):
            row.cells[index].width = Cm(width)


def add_title(document):
    title_1 = document.add_paragraph()
    title_1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_1.add_run("乾坤恒泰（北京）国际市场营销策划有限公司")
    run.bold = True
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(16)

    title_2 = document.add_paragraph()
    title_2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_2.add_run("{form_title}")
    run.bold = True
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(16)


def add_header_table(document):
    table = document.add_table(rows=4, cols=6)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    apply_col_widths(table, HEADER_COL_WIDTHS_CM)
    set_table_borders(table)

    row = table.rows[0]
    set_cell_text(row.cells[0], "本表用途", size=11)
    set_cell_text(merge(row, 1, 2), "出差申请 {trip_checked}")
    set_cell_text(merge(row, 3, 5), "报销申请 {reimbursement_checked}")

    row = table.rows[1]
    set_cell_text(row.cells[0], "员工姓名", size=11)
    set_cell_text(merge(row, 1, 2), "{name}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(row.cells[3], "部门（HTC/SHOB）", size=11)
    set_cell_text(merge(row, 4, 5), "{dept}", align=WD_ALIGN_PARAGRAPH.LEFT)

    row = table.rows[2]
    set_cell_text(row.cells[0], "出差时间", size=11)
    set_cell_text(merge(row, 1, 2), "（{start_date}）至（{end_date}）", size=11)
    set_cell_text(row.cells[3], "天数", size=11)
    set_cell_text(merge(row, 4, 5), "{trip_days}", align=WD_ALIGN_PARAGRAPH.LEFT)

    row = table.rows[3]
    set_cell_text(row.cells[0], "出差事由", size=11)
    set_cell_text(merge(row, 1, 2), "{reason}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(row.cells[3], "目的地", size=11)
    set_cell_text(merge(row, 4, 5), "{destination}", align=WD_ALIGN_PARAGRAPH.LEFT)


def add_section_heading(document, title, description):
    heading = document.add_paragraph()
    heading.paragraph_format.space_before = Pt(10)
    heading.paragraph_format.space_after = Pt(4)
    run = heading.add_run(title)
    run.bold = True
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(12)

    sub = document.add_paragraph()
    sub.paragraph_format.space_before = Pt(0)
    sub.paragraph_format.space_after = Pt(4)
    run = sub.add_run(description)
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(10.5)


def add_loop_paragraph(document, text):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    run = paragraph.add_run(text)
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(1)


def add_group_title(document, title_tag, label_tag, best_note_tag):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(6)
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(title_tag)
    run.bold = True
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(11)

    run = paragraph.add_run("：")
    run.bold = True
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(11)

    run = paragraph.add_run(label_tag)
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(11)

    run = paragraph.add_run("  ")
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(11)

    run = paragraph.add_run(best_note_tag)
    run.italic = True
    run.font.name = "宋体"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    run.font.size = Pt(10.5)


def add_detail_table(document, start_label, end_label, name_label):
    table = document.add_table(rows=2, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    apply_col_widths(table, DETAIL_COL_WIDTHS_CM)
    set_table_borders(table)

    header = table.rows[0]
    set_cell_text(header.cells[0], "方案", size=10.5)
    set_cell_text(header.cells[1], start_label, size=10.5)
    set_cell_text(header.cells[2], end_label, size=10.5)
    set_cell_text(header.cells[3], "金额", size=10.5)
    set_cell_text(header.cells[4], name_label, size=10.5)

    row = table.rows[1]
    set_cell_text(row.cells[0], "{#options}{row_label}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(row.cells[1], "{start_date}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(row.cells[2], "{end_date}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(row.cells[3], "{amount}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(row.cells[4], "{vendor}{/options}", align=WD_ALIGN_PARAGRAPH.LEFT)


def add_summary_table(document):
    table = document.add_table(rows=5, cols=6)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    apply_col_widths(table, HEADER_COL_WIDTHS_CM)
    set_table_borders(table)

    row = table.rows[0]
    set_cell_text(row.cells[0], "餐费总支出", size=11)
    set_cell_text(merge(row, 1, 2), "{meal_budget}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(merge(row, 3, 4), "地面交通费总支出", size=11)
    set_cell_text(row.cells[5], "{ground_budget}", align=WD_ALIGN_PARAGRAPH.LEFT)

    row = table.rows[1]
    set_cell_text(row.cells[0], "其它支出", size=11)
    set_cell_text(merge(row, 1, 5), "{other_budget}", align=WD_ALIGN_PARAGRAPH.LEFT)

    row = table.rows[2]
    set_cell_text(row.cells[0], "总支出（预算）", size=11)
    set_cell_text(merge(row, 1, 2), "{total_budget}", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(merge(row, 3, 4), "总支出（实际）", size=11)
    set_cell_text(row.cells[5], "{total_actual}", align=WD_ALIGN_PARAGRAPH.LEFT)

    row = table.rows[3]
    set_cell_text(row.cells[0], "部门主管审核", size=11)
    set_cell_text(merge(row, 1, 2), "", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(merge(row, 3, 4), "部门主管签名", size=11)
    set_cell_text(row.cells[5], "", align=WD_ALIGN_PARAGRAPH.LEFT)

    row = table.rows[4]
    set_cell_text(row.cells[0], "总经理批准", size=11)
    set_cell_text(merge(row, 1, 2), "", align=WD_ALIGN_PARAGRAPH.LEFT)
    set_cell_text(merge(row, 3, 4), "总经理签名", size=11)
    set_cell_text(row.cells[5], "", align=WD_ALIGN_PARAGRAPH.LEFT)


def add_notes(document):
    note_title = document.add_paragraph()
    note_title.paragraph_format.space_before = Pt(10)
    note_title.paragraph_format.space_after = Pt(2)
    title_run = note_title.add_run("注意事项：")
    title_run.bold = True
    title_run.font.name = "宋体"
    title_run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    title_run.font.size = Pt(12)

    notes = [
        ("基本原则：", "厉行节约、预算控制、事前审批、真实合规", "。"),
        ("出差前填写申请表，明确", "出差事由、时间、地点、预算", "，并完成部门主管审核和总经理批准。"),
        ("城市间交通优先选择经济便捷的交通工具，", "同一行程按 3 个方案比价", "，最低预算默认为最佳方案。"),
        ("住宿标准：", "一线城市 1000 元/晚以内，省会城市 800 元/晚以内，其他城市 600 元/晚以内", "。"),
        ("餐费和市内交通费", "标准内根据有效票据实报实销", "；接待单位安排工作餐或交通工具的，不单独报销。"),
        ("报销须在", "出差结束后 7 个工作日内", "完成，超期需书面说明。"),
        ("所有票据及附件需", "真实、合法、完整", "，用于纳税和审计。"),
    ]

    for prefix, underline_text, suffix in notes:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1.2
        run = paragraph.add_run(prefix)
        run.font.name = "宋体"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        run.font.size = Pt(11)

        underline_run = paragraph.add_run(underline_text)
        underline_run.underline = True
        underline_run.font.name = "宋体"
        underline_run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        underline_run.font.size = Pt(11)

        suffix_run = paragraph.add_run(suffix)
        suffix_run.font.name = "宋体"
        suffix_run._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        suffix_run.font.size = Pt(11)


def build_document():
    document = Document()
    section = document.sections[0]
    section.start_type = WD_SECTION.NEW_PAGE
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.6)
    section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(1.3)
    section.right_margin = Cm(1.3)

    add_title(document)
    add_header_table(document)

    add_section_heading(document, "城市间交通方案", "支持多组交通比价。每组为同一行程下的 3 个方案，共享出发和抵达日期。")
    add_loop_paragraph(document, "{#transport_groups}")
    add_group_title(document, "{display_title}", "{group_label}", "{best_option_note}")
    add_detail_table(document, "出发日期", "抵达日期", "交通名称")
    add_loop_paragraph(document, "{/transport_groups}")

    add_section_heading(document, "住宿方案", "支持多组住宿比价。每组为同一入住场景下的 3 个方案，共享入住和离开日期。")
    add_loop_paragraph(document, "{#accommodation_groups}")
    add_group_title(document, "{display_title}", "{group_label}", "{best_option_note}")
    add_detail_table(document, "入住日期", "离开日期", "酒店名称")
    add_loop_paragraph(document, "{/accommodation_groups}")

    add_section_heading(document, "费用汇总", "系统会根据当前申请类型自动汇总预算或实际金额。")
    add_summary_table(document)
    add_notes(document)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT_PATH)


if __name__ == "__main__":
    build_document()
    print(OUTPUT_PATH)
