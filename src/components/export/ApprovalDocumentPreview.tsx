import {
  formatCurrency,
  getPreferredBudgetOption,
  getOptionDisplayAmount,
  getSummaryDisplayAmount,
  isAccommodationGroupVisible,
  isTransportGroupVisible,
} from "../../lib/form/calculations";
import type {
  AccommodationGroup,
  ApplicationType,
  ExpenseApplicationFormValues,
  TransportGroup,
} from "../../lib/form/types";

interface ApprovalDocumentPreviewProps {
  applicationType: ApplicationType;
  values: ExpenseApplicationFormValues;
  totalBudget: number;
  totalActual: number;
  previewRef?: { current: HTMLDivElement | null };
}

const policyLines = [
  "基本原则：厉行节约、预算控制、事前审批、真实合规。",
  "城市间交通优先选择经济便捷的交通工具，同一行程按 3 个方案比价，由员工手动勾选最优方案。",
  "住宿标准：一线城市 1000 元/晚以内，省会城市 800 元/晚以内，其他城市 600 元/晚以内。",
  "报销需在出差结束后 7 个工作日内完成，所有票据及附件需真实、合法、完整。",
];

const displayDate = (value?: string) => (value ? value.split("-").join(".") : "");
const displayCurrency = (value?: number) => formatCurrency(value, true);

const getDepartmentLabel = (values: ExpenseApplicationFormValues) =>
  values.department === "OTHER" ? values.departmentOther.trim() : values.department;

function ComparisonTable({
  title,
  startLabel,
  endLabel,
  nameLabel,
  groups,
  applicationType,
  dateAccessor,
}: {
  title: string;
  startLabel: string;
  endLabel: string;
  nameLabel: string;
  groups: Array<TransportGroup | AccommodationGroup>;
  applicationType: ApplicationType;
  dateAccessor: (group: TransportGroup | AccommodationGroup) => { start: string; end: string };
}) {
  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const preferredOption = applicationType === "trip" ? getPreferredBudgetOption(group) : null;
        const dates = dateAccessor(group);
        const visibleOptions = applicationType === "trip" ? group.options : group.options.slice(0, 1);

        return (
          <div
            key={`${title}-${groupIndex}-${group.label}`}
            data-pdf-block="true"
            className="overflow-hidden rounded-2xl border border-slate-300"
          >
            <div className="flex flex-col gap-2 border-b border-slate-300 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {title}{groupIndex + 1}
                  {group.label ? ` · ${group.label}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {startLabel}：{displayDate(dates.start)} | {endLabel}：{displayDate(dates.end)}
                </p>
              </div>
              {preferredOption ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  最优方案：方案 {preferredOption.index + 1} {formatCurrency(preferredOption.amount, false)}
                </span>
              ) : null}
            </div>

            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[21%]" />
                <col className="w-[21%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b border-r border-slate-300 px-2 py-2 text-center font-medium text-slate-800">
                    {applicationType === "trip" ? "方案" : "明细"}
                  </th>
                  <th className="border-b border-r border-slate-300 px-2 py-2 text-center font-medium text-slate-800">{startLabel}</th>
                  <th className="border-b border-r border-slate-300 px-2 py-2 text-center font-medium text-slate-800">{endLabel}</th>
                  <th className="border-b border-r border-slate-300 px-2 py-2 text-center font-medium text-slate-800">金额</th>
                  <th className="border-b border-slate-300 px-2 py-2 text-center font-medium text-slate-800">{nameLabel}</th>
                </tr>
              </thead>
              <tbody>
                {visibleOptions.map((option, optionIndex) => (
                  <tr key={`${title}-group-${groupIndex}-option-${optionIndex}`} className={preferredOption?.index === optionIndex ? "bg-amber-50" : undefined}>
                    <td className="border-r border-slate-300 px-2 py-3">
                      {applicationType === "trip" ? `方案 ${optionIndex + 1}` : "实际"}
                      {applicationType === "trip" && preferredOption?.index === optionIndex ? "（最优）" : ""}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-3">{displayDate(dates.start)}</td>
                    <td className="border-r border-slate-300 px-2 py-3">{displayDate(dates.end)}</td>
                    <td className="border-r border-slate-300 px-2 py-3">
                      {displayCurrency(getOptionDisplayAmount(applicationType, option))}
                    </td>
                    <td className="px-2 py-3">{option.vendor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function ApprovalDocumentPreview({
  applicationType,
  values,
  totalBudget,
  totalActual,
  previewRef,
}: ApprovalDocumentPreviewProps) {
  const title = applicationType === "trip" ? "出差申请表" : "报销申请表";
  const transportGroups = values.transportGroups.filter((group) =>
    isTransportGroupVisible(group, applicationType),
  );
  const accommodationGroups = values.accommodationGroups.filter((group) =>
    isAccommodationGroupVisible(group, applicationType),
  );

  return (
    <div
      ref={previewRef}
      className="mx-auto w-full max-w-[860px] rounded-[28px] bg-white p-8 text-[13px] text-slate-900 shadow-panel"
    >
      <div data-pdf-block="true" className="space-y-1 text-center">
        <p className="text-[18px] font-semibold">乾坤恒泰（北京）国际市场营销策划有限公司</p>
        <p className="text-[18px] font-semibold">{title}</p>
      </div>

      <table data-pdf-block="true" className="mt-6 w-full table-fixed border-collapse border border-slate-300">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
        </colgroup>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">本表用途</td>
            <td className="border border-slate-300 px-2 py-3 text-center" colSpan={2}>
              出差申请 {applicationType === "trip" ? "√" : ""}
            </td>
            <td className="border border-slate-300 px-2 py-3 text-center" colSpan={3}>
              报销申请 {applicationType === "reimbursement" ? "√" : ""}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">员工姓名</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {values.employeeName}
            </td>
            <td className="border border-slate-300 px-2 py-3 text-center">部门（HTC/SHOB）</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {getDepartmentLabel(values)}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">出差时间</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              （{displayDate(values.startDate)}）至（{displayDate(values.endDate)}）
            </td>
            <td className="border border-slate-300 px-2 py-3 text-center">天数</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {values.tripDays || ""}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">出差事由</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {values.tripReason}
            </td>
            <td className="border border-slate-300 px-2 py-3 text-center">目的地</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {values.destination}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 space-y-6">
        {transportGroups.length ? (
          <ComparisonTable
            applicationType={applicationType}
            dateAccessor={(group) => ({
              start: (group as TransportGroup).departureAt,
              end: (group as TransportGroup).arrivalAt,
            })}
            endLabel="抵达日期"
            groups={transportGroups}
            nameLabel="交通名称"
            startLabel="出发日期"
            title="交通"
          />
        ) : null}

        {accommodationGroups.length ? (
          <ComparisonTable
            applicationType={applicationType}
            dateAccessor={(group) => ({
              start: (group as AccommodationGroup).checkInAt,
              end: (group as AccommodationGroup).checkOutAt,
            })}
            endLabel="离开日期"
            groups={accommodationGroups}
            nameLabel="酒店名称"
            startLabel="入住日期"
            title="住宿"
          />
        ) : null}
      </div>

      <table data-pdf-block="true" className="mt-6 w-full table-fixed border-collapse border border-slate-300">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
        </colgroup>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">餐费总支出</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {displayCurrency(getSummaryDisplayAmount(applicationType, values.mealBudget, values.mealActual))}
            </td>
            <td className="border border-slate-300 px-2 py-3 text-center" colSpan={2}>
              地面交通费总支出
            </td>
            <td className="border border-slate-300 px-3 py-3">
              {displayCurrency(getSummaryDisplayAmount(applicationType, values.groundBudget, values.groundActual))}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">其它支出</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={5}>
              {displayCurrency(getSummaryDisplayAmount(applicationType, values.otherBudget, values.otherActual))}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">总支出（预算）</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}>
              {applicationType === "trip" ? formatCurrency(totalBudget, false) : ""}
            </td>
            <td className="border border-slate-300 px-2 py-3 text-center" colSpan={2}>
              总支出（实际）
            </td>
            <td className="border border-slate-300 px-3 py-3">
              {applicationType === "reimbursement" ? formatCurrency(totalActual, false) : ""}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">部门主管审核</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}></td>
            <td className="border border-slate-300 px-2 py-3 text-center" colSpan={2}>
              部门主管签名
            </td>
            <td className="border border-slate-300 px-3 py-3"></td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">总经理批准</td>
            <td className="border border-slate-300 px-3 py-3" colSpan={2}></td>
            <td className="border border-slate-300 px-2 py-3 text-center" colSpan={2}>
              总经理签名
            </td>
            <td className="border border-slate-300 px-3 py-3"></td>
          </tr>
        </tbody>
      </table>

      <div data-pdf-block="true" className="mt-5 space-y-1">
        <p className="font-semibold">注意事项：</p>
        {policyLines.map((line) => (
          <p key={line} className="leading-6 text-slate-700">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
