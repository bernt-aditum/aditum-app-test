import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter as RScatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchSeries, type Point } from "./api";
import { useTheme, type Chrome } from "./theme";
import { agg, bucketByDay, pairXY } from "./util";
import type { Component } from "./types";

function useMultiSeries(tags: string[], windowDays: number) {
  const [data, setData] = useState<Record<string, Point[]>>({});
  const [loading, setLoading] = useState(true);
  const key = tags.join(",") + "|" + windowDays;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all(tags.map((t) => fetchSeries(t, windowDays).then((p) => [t, p] as const))).then((pairs) => {
      if (!alive) return;
      const m: Record<string, Point[]> = {};
      for (const [t, p] of pairs) m[t] = p;
      setData(m);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // key encodes tags + window
  }, [key]);
  return { data, loading };
}

function tip(chrome: Chrome) {
  return {
    background: chrome.tooltipBg,
    border: `1px solid ${chrome.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: chrome.text,
  };
}

function Loading() {
  return <div className="nodata">Loading…</div>;
}
function NoData({ tags }: { tags: string[] }) {
  return <div className="nodata">No credentialed data for {tags.join(", ") || "this component"}.</div>;
}

export function Kpis({ component }: { component: Component }) {
  const tags = component.query?.tags ?? [];
  const wd = component.query?.window_days ?? 1;
  const kind = component.query?.aggregation ?? "last";
  const { data, loading } = useMultiSeries(tags, wd);
  if (!tags.length) return <NoData tags={tags} />;
  if (loading) return <Loading />;
  return (
    <div className="kpis">
      {tags.map((t) => {
        const val = agg(data[t] ?? [], kind);
        return (
          <div className="kpi" key={t}>
            <div className="kpi-l">{t}</div>
            <div className="kpi-v">{val === null ? "—" : val}</div>
            <div className="kpi-a">{val === null ? "no data" : kind}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Trend({ component }: { component: Component }) {
  const tags = component.query?.tags ?? [];
  const wd = component.query?.window_days ?? 7;
  const { data, loading } = useMultiSeries(tags, wd);
  const { series, chrome } = useTheme();
  if (loading) return <Loading />;
  if (!tags.some((t) => (data[t] ?? []).length > 0)) return <NoData tags={tags} />;
  const len = Math.max(0, ...tags.map((t) => (data[t] ?? []).length));
  const rows = Array.from({ length: len }, (_, i) => {
    const row: Record<string, string | number> = {};
    const first = tags.find((t) => (data[t] ?? [])[i]);
    row.t = first
      ? new Date((data[first] as Point[])[i].t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" })
      : "";
    tags.forEach((t) => {
      const p = (data[t] ?? [])[i];
      if (p) row[t] = p.value;
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chrome.grid} vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 11, fill: chrome.tick }} minTickGap={40} stroke={chrome.axis} />
        <YAxis tick={{ fontSize: 11, fill: chrome.tick }} width={44} stroke={chrome.axis} />
        <Tooltip contentStyle={tip(chrome)} />
        {tags.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: chrome.text }} />}
        {tags.map((t, i) => (
          // Straight segments — real data, no smoothing.
          <Line
            key={t}
            type="linear"
            dataKey={t}
            stroke={series[i % series.length]}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScatterPlot({ component }: { component: Component }) {
  const tags = component.query?.tags ?? [];
  const wd = component.query?.window_days ?? 7;
  const { data, loading } = useMultiSeries(tags, wd);
  const { series, chrome } = useTheme();
  const [xTag, yTag] = tags;
  if (!xTag || !yTag) return <NoData tags={tags} />;
  if (loading) return <Loading />;
  const pts = pairXY(data[xTag] ?? [], data[yTag] ?? []);
  if (!pts.length) return <NoData tags={tags} />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={chrome.grid} />
        <XAxis type="number" dataKey="x" name={xTag} tick={{ fontSize: 11, fill: chrome.tick }} stroke={chrome.axis} />
        <YAxis type="number" dataKey="y" name={yTag} width={44} tick={{ fontSize: 11, fill: chrome.tick }} stroke={chrome.axis} />
        <Tooltip cursor={{ stroke: chrome.axis }} contentStyle={tip(chrome)} />
        <RScatter data={pts} fill={series[0]} fillOpacity={0.7} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function StackedBar({ component }: { component: Component }) {
  const tags = component.query?.tags ?? [];
  const wd = component.query?.window_days ?? 30;
  const { data, loading } = useMultiSeries(tags, wd);
  const { series, chrome } = useTheme();
  if (!tags.length) return <NoData tags={tags} />;
  if (loading) return <Loading />;
  const perTag = tags.map((t) => ({ tag: t, buckets: bucketByDay(data[t] ?? []) }));
  if (!perTag.some((p) => p.buckets.length)) return <NoData tags={tags} />;
  const days = Array.from(new Set(perTag.flatMap((p) => p.buckets.map((b) => b.day)))).sort();
  const rows = days.map((day) => {
    const row: Record<string, string | number> = { day };
    perTag.forEach((p) => {
      const b = p.buckets.find((x) => x.day === day);
      if (b) row[p.tag] = b.value;
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chrome.grid} vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: chrome.tick }} stroke={chrome.axis} />
        <YAxis tick={{ fontSize: 11, fill: chrome.tick }} width={44} stroke={chrome.axis} />
        <Tooltip contentStyle={tip(chrome)} />
        {tags.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: chrome.text }} />}
        {tags.map((t, i) => (
          // 1px surface stroke gives the 2px gap between stacked segments.
          <Bar
            key={t}
            dataKey={t}
            stackId="s"
            fill={series[i % series.length]}
            stroke={chrome.surface}
            strokeWidth={1}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DataTableView({ component }: { component: Component }) {
  const tags = component.query?.tags ?? [];
  const wd = component.query?.window_days ?? 1;
  const tag = tags[0];
  const { data, loading } = useMultiSeries(tag ? [tag] : [], wd);
  if (!tag) return <NoData tags={tags} />;
  if (loading) return <Loading />;
  const pts = (data[tag] ?? []).slice(-12).reverse();
  if (!pts.length) return <NoData tags={tags} />;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>{tag}</th>
        </tr>
      </thead>
      <tbody>
        {pts.map((p) => (
          <tr key={p.t}>
            <td>{new Date(p.t).toLocaleString()}</td>
            <td>{p.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AssetTree() {
  return <div className="nodata">Asset hierarchy view.</div>;
}
