interface RevenueChartProps {
  data: { label: string; income: number; expense: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income || 0, d.expense || 0)),
    10000,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Revenue vs Expenses</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Monthly comparison</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#9f0f0f' }} />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-300" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Expenses</span>
          </div>
        </div>
      </div>
      <div className="w-full h-56 pt-6 pb-2 flex items-end justify-between gap-2 sm:gap-6 px-4">
        {data.map((item, idx) => {
          const incomeHeight = item.income > 0 ? Math.max(8, (item.income / maxVal) * 180) : 4;
          const expenseHeight = item.expense > 0 ? Math.max(8, (item.expense / maxVal) * 180) : 4;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2.5 h-[190px]">
                {/* Income Bar */}
                <div className="relative flex flex-col items-center">
                  <div
                    style={{ height: `${incomeHeight}px` }}
                    className="w-3 sm:w-5 bg-[#9f0f0f] rounded-t-md transition-all duration-300 hover:opacity-90"
                  />
                  {item.income > 0 && (
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none transition-opacity">
                      ₹{item.income.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                {/* Expenses Bar */}
                <div className="relative flex flex-col items-center">
                  <div
                    style={{ height: `${expenseHeight}px` }}
                    className="w-3 sm:w-5 bg-red-300 dark:bg-red-400 rounded-t-md transition-all duration-300 hover:opacity-90"
                  />
                  {item.expense > 0 && (
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none transition-opacity">
                      ₹{item.expense.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <span className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
