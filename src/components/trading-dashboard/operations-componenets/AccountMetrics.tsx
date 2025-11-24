import { formatCurrency } from "@/lib/utils";

export function AccountMetrics({
  items,
  currency,
}: {
  items: { label: string; value: number }[];
  currency: string;
}) {
  return (
    <>
      {items.map((item, index) => (
        <div key={index} className="col-span-1">
          <p className="text-[11px] md:text-xs text-[var(--color-text-muted)] mb-1 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
            {item.label}
          </p>
          <p
            className={`text-sm md:text-base font-medium ${Number(item.value) < 0 ? "text-red-400" : "text-[var(--color-text)]"}`}
          >
            {item.label != 'Nvl margen (%)'
              ? formatCurrency(Number(item.value), "en-US", currency)
              : `${item.value.toFixed(2)} %`
            }
          </p>
        </div>
      ))}
    </>
  );
}
