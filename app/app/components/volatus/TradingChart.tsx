"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  buildCandles,
  sma,
  TIMEFRAMES,
  type Candle,
  type Timeframe,
  type Trade,
} from "@/app/app/lib/candles";
import { poolDisplay, type Pool } from "@/app/app/lib/market-data";
import { dec, signed } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";

type ChartType = "Candles" | "Line" | "Area";
const CHART_TYPES: ChartType[] = ["Candles", "Line", "Area"];

/**
 * Canvas colour attributes can't resolve CSS custom properties — the chart
 * library draws to a bare <canvas>, which sits outside the DOM style
 * cascade, so `fillStyle = "var(--up)"` would be silently ignored. These are
 * the literal values behind app.css's --up/--down and tokens.css's palette.
 */
const C = {
  up: "#22c55e",
  down: "#f23645",
  pink: "#ff3d9a",
  violet: "#9b6bff",
  bone3: "#7e7290",
  hair: "rgba(243,236,227,0.11)",
  hair2: "rgba(243,236,227,0.06)",
};

/**
 * A real trading chart — candlesticks, a volume pane, pan and zoom (native
 * to the library, wheel to zoom / drag to pan), switchable chart type and
 * timeframe, and an optional SMA overlay. Built on `lightweight-charts`
 * (TradingView's open-source rendering engine), the only chart in the app
 * that isn't hand-rolled SVG — a full OHLC terminal is out of scope for
 * that approach.
 *
 * Candles trade the LONG token — the instrument this market actually
 * settles — anchored so the last close always equals `market.longPrice`,
 * so this chart and the trade panel beside it never disagree.
 *
 * All three main series (candlestick/line/area) and the SMA overlay are
 * created once and switched with `visible` (a series option, not
 * destroy-and-recreate): repeatedly removing and re-adding a series on
 * every click is the fragile version of this — see the fix note below.
 */
export function TradingChart({ trades, pool }: { trades: Trade[]; pool: Pool }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);

  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [chartType, setChartType] = useState<ChartType>("Candles");
  const [showSma, setShowSma] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const candles = useMemo(() => buildCandles(trades, timeframe), [trades, timeframe]);
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // An epoch nobody has traded yet has no candles. Everything below reads
  // defensively so the header renders empty rather than throwing.
  const last = candles[candles.length - 1];
  const displayed = (hoverIndex !== null ? candles[hoverIndex] : last) ?? null;
  const change = displayed ? displayed.close - displayed.open : 0;
  const changePct = displayed && displayed.open !== 0 ? (change / displayed.open) * 100 : 0;
  const isUp = change >= 0;

  // Create the chart and all of its series exactly once, torn down on unmount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: C.bone3,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        panes: { separatorColor: C.hair },
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: C.hair2 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: C.hair },
      timeScale: { borderColor: C.hair, timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    // Fix note: an earlier version removed and re-added a single "main"
    // series every time the chart-type buttons were clicked. That's the
    // fragile pattern — after a couple of switches, clicking back to an
    // earlier type stopped rendering. All three series are created once
    // here and switched purely by toggling `visible`, which the library
    // supports natively and can't get into a bad state.
    candlestickRef.current = chart.addSeries(CandlestickSeries, {
      upColor: C.up,
      downColor: C.down,
      borderVisible: false,
      wickUpColor: C.up,
      wickDownColor: C.down,
      visible: true,
    });
    lineRef.current = chart.addSeries(LineSeries, { color: C.pink, lineWidth: 2, visible: false });
    areaRef.current = chart.addSeries(AreaSeries, {
      lineColor: C.pink,
      topColor: "rgba(255,61,154,0.28)",
      bottomColor: "rgba(255,61,154,0.02)",
      lineWidth: 2,
      visible: false,
    });

    const volumeSeries = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: "volume" }, color: C.up, priceLineVisible: false, lastValueVisible: false },
      1,
    );
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.15, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;
    chart.panes()[1]?.setHeight(88);

    const onMove = (param: MouseEventParams<Time>) => {
      if (param.time == null) {
        setHoverIndex(null);
        return;
      }
      const idx = candlesRef.current.findIndex((c) => c.time === param.time);
      setHoverIndex(idx >= 0 ? idx : null);
    };
    chart.subscribeCrosshairMove(onMove);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(onMove);
      chart.remove();
      chartRef.current = null;
      candlestickRef.current = null;
      lineRef.current = null;
      areaRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current = null;
    };
  }, []);

  // Push data to every series whenever the candle set changes (timeframe or
  // pool switch) — including the currently-hidden ones, so they're ready to
  // show the instant the user switches to them.
  useEffect(() => {
    if (!chartRef.current) return;

    candlestickRef.current?.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    const linePoints = candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }));
    lineRef.current?.setData(linePoints);
    areaRef.current?.setData(linePoints);
    volumeSeriesRef.current?.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? C.up : C.down,
      })),
    );

    chartRef.current.timeScale().fitContent();
    setHoverIndex(null);
  }, [candles]);

  // Chart-type switch: toggle visibility, nothing is destroyed or recreated.
  useEffect(() => {
    candlestickRef.current?.applyOptions({ visible: chartType === "Candles" });
    lineRef.current?.applyOptions({ visible: chartType === "Line" });
    areaRef.current?.applyOptions({ visible: chartType === "Area" });
  }, [chartType]);

  // The SMA overlay, created once and toggled the same way.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (!smaSeriesRef.current) {
      smaSeriesRef.current = chart.addSeries(LineSeries, {
        color: C.violet,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    smaSeriesRef.current.setData(sma(candles, 20).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    smaSeriesRef.current.applyOptions({ visible: showSma });
  }, [showSma, candles]);

  return (
    <div className="plate p-s4 flex flex-col gap-s3">
      <div className="flex flex-wrap items-baseline justify-between gap-s3">
        <div className="flex flex-wrap items-baseline gap-s3">
          <span className="text-t4 text-bone">{poolDisplay(pool)}</span>
          <span className="lbl">
            {timeframe} · Volatus
          </span>
        </div>
        {displayed ? (
          <div className="flex flex-wrap items-baseline gap-s3 num text-t2">
            <span className="text-bone-3">O{dec(displayed.open, 4)}</span>
            <span className="text-bone-3">H{dec(displayed.high, 4)}</span>
            <span className="text-bone-3">L{dec(displayed.low, 4)}</span>
            <span className={isUp ? "text-up" : "text-down"}>C{dec(displayed.close, 4)}</span>
            <span className={isUp ? "text-up" : "text-down"}>
              {signed(change, 4)} ({signed(changePct, 2)}%)
            </span>
          </div>
        ) : (
          <span className="num text-t2 text-bone-3">no trades this epoch yet</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-s3">
        <Segmented options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
        <div className="flex flex-wrap items-center gap-s4">
          <Segmented options={CHART_TYPES} value={chartType} onChange={setChartType} />
          <button
            type="button"
            onClick={() => setShowSma((v) => !v)}
            aria-pressed={showSma}
            className={cn(
              "text-t2 text-center px-s2 py-[3px] border transition-colors duration-[140ms]",
              showSma ? "text-violet border-violet" : "text-bone-3 border-hair hover:text-bone",
            )}
          >
            SMA 20
          </button>
          <button
            type="button"
            onClick={() => chartRef.current?.timeScale().fitContent()}
            className="text-t2 text-center text-bone-3 hover:text-bone transition-colors duration-[140ms]"
          >
            Reset zoom
          </button>
        </div>
      </div>

      <div ref={containerRef} className="w-full" style={{ height: 440 }} />

      <p className="text-t2 text-bone-3 m-0">
        Drag to pan, scroll to zoom. Candles are VAR-LONG swaps in this epoch's vol pool.
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex border border-hair">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={o === value}
          className={cn(
            "px-s3 py-[5px] text-t2 text-center transition-colors duration-[140ms]",
            o === value ? "bg-panel-2 text-bone" : "text-bone-3 hover:text-bone",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
