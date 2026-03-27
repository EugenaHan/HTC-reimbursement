import { formatCurrency, getLowestBudgetPlan, getPlanDisplayAmount, getSummaryDisplayAmount } from "../../lib/form/calculations";
import type { ApplicationType, ExpenseApplicationFormValues } from "../../lib/form/types";

interface ApprovalDocumentPreviewProps {
  applicationType: ApplicationType;
  values: ExpenseApplicationFormValues;
  totalBudget: number;
  totalActual: number;
  previewRef?: { current: HTMLDivElement | null };
}

const policyLines = [
  "基本原则：厉行节约、预算控制、事前审批、真实合规。",
  "城市间交通优先选择经济便捷的交通工具，三选一；特殊情况需提前说明，未经许可超标部分由个人承担。",
  "住宿标准：一线城市 1000 元/晚以内，省会城市 800 元/晚以内，其他城市 600 元/晚以内。",
  "报销需在出差结束后 7 个工作日内完成，所有票据及附件需真实、合法、完整。",
];

const displayDate = (value?: string) => (value ? value.split("-").join(".") : "");
const displayCurrency = (value?: number) => formatCurrency(value, true);

const getDepartmentLabel = (values: ExpenseApplicationFormValues) =>
  values.department === "OTHER" ? values.departmentOther.trim() : values.department;

export function ApprovalDocumentPreview({
  applicationType,
  values,
  totalBudget,
  totalActual,
  previewRef,
}: ApprovalDocumentPreviewProps) {
  const transportBest = applicationType === "trip" ? getLowestBudgetPlan(values.transportPlans) : null;
  const accommodationBest = applicationType === "trip" ? getLowestBudgetPlan(values.accommodationPlans) : null;
  const title = applicationType === "trip" ? "出差申请表" : "报销申请表";

  return (
    <div
      ref={previewRef}
      className="mx-auto w-full max-w-[860px] rounded-[28px] bg-white p-8 text-[13px] text-slate-900 shadow-panel"
    >
      <div className="space-y-1 text-center">
        <p className="text-[18px] font-semibold">乾坤恒泰（北京）国际市场营销策划有限公司</p>
        <p className="text-[18px] font-semibold">{title}</p>
      </div>

      <table className="mt-6 w-full table-fixed border-collapse border border-slate-300">
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

          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">城市间交通方案</td>
            <td className="border border-slate-300 px-2 py-3 text-center">出发日期</td>
            <td className="border border-slate-300 px-2 py-3 text-center">抵达日期</td>
            <td className="border border-slate-300 px-2 py-3 text-center">金额</td>
            <td className="border border-slate-300 px-2 py-3 text-center">服务商</td>
            <td className="border border-slate-300 px-2 py-3 text-center">报价日期</td>
          </tr>
          {values.transportPlans.map((plan, index) => (
            <tr key={`transport-row-${index}`} className={transportBest?.index === index ? "bg-accent-50" : undefined}>
              <td className="border border-slate-300 px-2 py-3">方案 {index + 1}{transportBest?.index === index ? "（最低价）" : ""}</td>
              <td className="border border-slate-300 px-2 py-3">{displayDate(plan.departureAt)}</td>
              <td className="border border-slate-300 px-2 py-3">{displayDate(plan.arrivalAt)}</td>
              <td className="border border-slate-300 px-2 py-3">
                {displayCurrency(getPlanDisplayAmount(applicationType, plan))}
              </td>
              <td className="border border-slate-300 px-2 py-3">{plan.vendor}</td>
              <td className="border border-slate-300 px-2 py-3">{displayDate(plan.quoteAt)}</td>
            </tr>
          ))}

          <tr>
            <td className="border border-slate-300 px-2 py-3 text-center">住宿方案</td>
            <td className="border border-slate-300 px-2 py-3 text-center">入住日期</td>
            <td className="border border-slate-300 px-2 py-3 text-center">退房日期</td>
            <td className="border border-slate-300 px-2 py-3 text-center">金额</td>
            <td className="border border-slate-300 px-2 py-3 text-center">服务商</td>
            <td className="border border-slate-300 px-2 py-3 text-center">报价日期</td>
          </tr>
          {values.accommodationPlans.map((plan, index) => (
            <tr key={`hotel-row-${index}`} className={accommodationBest?.index === index ? "bg-accent-50" : undefined}>
              <td className="border border-slate-300 px-2 py-3">方案 {index + 1}{accommodationBest?.index === index ? "（最低价）" : ""}</td>
              <td className="border border-slate-300 px-2 py-3">{displayDate(plan.checkInAt)}</td>
              <td className="border border-slate-300 px-2 py-3">{displayDate(plan.checkOutAt)}</td>
              <td className="border border-slate-300 px-2 py-3">
                {displayCurrency(getPlanDisplayAmount(applicationType, plan))}
              </td>
              <td className="border border-slate-300 px-2 py-3">{plan.vendor}</td>
              <td className="border border-slate-300 px-2 py-3">{displayDate(plan.quoteAt)}</td>
            </tr>
          ))}

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

      <div className="mt-5 space-y-1">
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
