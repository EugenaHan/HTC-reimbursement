# 出差与报销申请双效录入系统

## 初始化与运行

```bash
npm install
npm run generate:template
npm run dev
```

生产构建：

```bash
npm run build
```

## 关键文件

- `src/components/TravelExpenseApp.tsx`
- `src/lib/docx/generateApprovalDoc.ts`
- `src/lib/docx/mappers.ts`
- `scripts/generate_template.py`
- `public/template.docx`

## 正式模板占位符

### 顶部基础信息

- `{trip_checked}`
- `{reimbursement_checked}`
- `{name}`
- `{dept}`
- `{start_date}`
- `{end_date}`
- `{trip_days}`
- `{reason}`
- `{destination}`

### 交通方案固定槽位

- `{transport_1_departure}` `{transport_1_arrival}` `{transport_1_budget}` `{transport_1_vendor}` `{transport_1_quote_at}`
- `{transport_2_departure}` `{transport_2_arrival}` `{transport_2_budget}` `{transport_2_vendor}` `{transport_2_quote_at}`
- `{transport_3_departure}` `{transport_3_arrival}` `{transport_3_budget}` `{transport_3_vendor}` `{transport_3_quote_at}`

### 住宿方案固定槽位

- `{hotel_1_check_in}` `{hotel_1_check_out}` `{hotel_1_budget}` `{hotel_1_vendor}` `{hotel_1_quote_at}`
- `{hotel_2_check_in}` `{hotel_2_check_out}` `{hotel_2_budget}` `{hotel_2_vendor}` `{hotel_2_quote_at}`
- `{hotel_3_check_in}` `{hotel_3_check_out}` `{hotel_3_budget}` `{hotel_3_vendor}` `{hotel_3_quote_at}`

### 汇总区

- `{meal_budget}`
- `{ground_budget}`
- `{other_budget}`
- `{total_budget}`
- `{total_actual}`

说明：

- 首版正式模板不使用循环标签，目的是保证和原 Word 的 3 行固定结构一致。
- 循环标签扩展示例见 `public/template-loop-guide.md`。
- 实际金额明细只参与自动汇总，不进入原表的交通/住宿明细区。
