import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { emptyData, geo, mockData, strings } from "./fixtures";
import { dailyAvgDays, TotalsCard } from "./TotalsCard";

const DAY = 86_400_000;

// SSR 直渲：数值由 AnimatedNumber 的 effect 写入，首帧为空 span——
// 断言标签结构与零值分支（命中率 "—"），数值语义归 lib/format 的单测。

it("统计卡：大数标签与六项指标齐全", () => {
  const html = renderToStaticMarkup(
    <TotalsCard
      geo={geo("totals")}
      strings={strings}
      data={mockData()}
      timeRange={null}
    />,
  );

  expect(html).toContain(strings.cardTotals);
  expect(html).toContain(strings.overviewTotalTokens);
  expect(html).toContain(strings.overviewTotalCalls);
  expect(html).toContain(strings.overviewUsageTime);
  expect(html).toContain(strings.overviewSessionCount);
  expect(html).toContain(strings.overviewTotalProjects);
  expect(html).toContain(strings.overviewActiveTools);
  expect(html).toContain(strings.overviewCacheHitRate);
  // 日均注记在 AnimatedNumber 的 format 回调里拼出，SSR 首帧为空 span，不在此断言。
});

it("统计卡：零数据时缓存命中率显示为占位破折号", () => {
  const html = renderToStaticMarkup(
    <TotalsCard
      geo={geo("totals")}
      strings={strings}
      data={emptyData()}
      timeRange={null}
    />,
  );

  expect(html).toContain("—");
});

describe("dailyAvgDays", () => {
  it("预设/自定义区间按跨度取天数（均天对齐）", () => {
    const today = { start: 0, end: DAY - 1 };
    expect(dailyAvgDays(today, [])).toBe(1);
    expect(
      dailyAvgDays({ start: 0, end: 6 * DAY + DAY - 1 }, []),
    ).toBe(7);
    // 24h 滚动窗口：跨度恰好一天。
    expect(dailyAvgDays({ start: DAY, end: 2 * DAY }, [])).toBe(1);
  });

  it("全部档无区间：取 daily 的日期跨度（含无数据的日子）", () => {
    const daily = [
      { date: "2026-08-01", costMicros: 0, tokens: 0, calls: 0 },
      { date: "2026-08-03", costMicros: 0, tokens: 0, calls: 0 },
      { date: "2026-09-01", costMicros: 0, tokens: 0, calls: 0 },
    ];
    expect(dailyAvgDays(null, daily)).toBe(32);
  });

  it("全部档且 daily 为空时兜底 1 天", () => {
    expect(dailyAvgDays(null, [])).toBe(1);
  });
});
