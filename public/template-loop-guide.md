# 可选循环标签说明

首版正式模板为了保证和原始 Word 表格 1:1 一致，采用固定 3 行槽位标签，不使用循环标签。

如果以后需要把交通或住宿方案扩展成不定长表格，可以在新的 `.docx` 模板里这样放置：

## 城市间交通方案

在整行表格中使用：

`{#transport}`

然后在同一行的各个单元格中分别写：

- `{departureAt}`
- `{arrivalAt}`
- `{budgetAmount}`
- `{vendor}`
- `{quoteAt}`

最后在该行末尾再放：

`{/transport}`

## 住宿方案

同理可使用：

`{#accommodation}`

单元格内标签示例：

- `{checkInAt}`
- `{checkOutAt}`
- `{budgetAmount}`
- `{vendor}`
- `{quoteAt}`

结束标签：

`{/accommodation}`

注意：

- 循环开始和结束标签必须位于同一表格行的可替换文本区域内。
- 如果要继续保证版式稳定，建议在循环模板中使用固定高度行，并控制文本长度。
- 本项目当前的 `generateApprovalDoc` 不依赖循环标签，正式导出使用固定槽位占位符。
