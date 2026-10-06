import type { ReactNode } from "react";

/** グラフの横軸（日付 YYYY-MM-DD）を MM/DD 表記にする */
export function dateTick(date: string) {
  return date.slice(5).replace("-", "/");
}

export function tooltipLabelFormatter(label: ReactNode) {
  return typeof label === "string" ? dateTick(label) : label;
}
