"use client";

import { useRef, useEffect, useState, useId } from "react";
import * as d3 from "d3";
import type { TidePoint, TideExtreme } from "@/lib/tides/types";

interface TideCurveProps {
  points: TidePoint[];
  extremes: TideExtreme[];
  /** Observation-only points (drawn as solid line). Optional — if omitted, all points are drawn solid. */
  obsPoints?: TidePoint[];
  /** Forecast-only points (drawn as dashed line). Optional. */
  fcstPoints?: TidePoint[];
  /** Whether to show the full multi-day view or just today */
  view?: "today" | "7day";
  /** Current time for the "now" marker */
  currentTime?: Date;
  /** Height of the chart in pixels */
  height?: number;
}

/** Resolved theme color palette used by all drawing helpers. */
interface ThemeColors {
  secondary: string;
  primary: string;
  tertiary: string;
  outline: string;
  outlineVariant: string;
  surfaceContainerHighest: string;
  onPrimary: string;
  primaryFixedDim: string;
  onSurface: string;
}

/** Shared drawing context passed to every helper function. */
interface DrawContext {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  x: d3.ScaleTime<number, number>;
  y: d3.ScaleLinear<number, number>;
  innerWidth: number;
  innerHeight: number;
  colors: ThemeColors;
  filteredPoints: TidePoint[];
}

/**
 * Read resolved CSS custom-property values from <html>.
 * When .dark is toggled, the CSS variables swap and this returns dark palette colors.
 */
function getThemeColors(): ThemeColors {
  if (typeof window === "undefined") {
    // SSR fallback — light theme defaults
    return {
      secondary: "#146a5a",
      primary: "#002a48",
      tertiary: "#725c01",
      outline: "#72777f",
      outlineVariant: "#c2c7cf",
      surfaceContainerHighest: "#e0e3e5",
      onPrimary: "#ffffff",
      primaryFixedDim: "#9ccbfb",
      onSurface: "#181c1e",
    };
  }

  const s = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;

  return {
    secondary: get("--color-secondary", "#146a5a"),
    primary: get("--color-primary", "#002a48"),
    tertiary: get("--color-tertiary", "#725c01"),
    outline: get("--color-outline", "#72777f"),
    outlineVariant: get("--color-outline-variant", "#c2c7cf"),
    surfaceContainerHighest: get("--color-surface-container-highest", "#e0e3e5"),
    onPrimary: get("--color-on-primary", "#ffffff"),
    primaryFixedDim: get("--color-primary-fixed-dim", "#9ccbfb"),
    onSurface: get("--color-on-surface", "#181c1e"),
  };
}

// ---------------------------------------------------------------------------
// Drawing helpers — each renders one logical layer of the chart
// ---------------------------------------------------------------------------

/** Append the SVG <linearGradient> definition used by the area fill. */
function drawGradient(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  gradientId: string,
  colors: ThemeColors,
): void {
  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colors.secondary)
    .attr("stop-opacity", 0.6);
  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colors.primary)
    .attr("stop-opacity", 0.9);
}

/** Draw the shaded area under the tide curve, split at the obs/forecast boundary. */
function drawAreaFill(
  ctx: DrawContext,
  gradientId: string,
  lastObsTime: number | null,
  hasForecast: boolean,
): void {
  const { g, x, y, innerHeight, filteredPoints } = ctx;

  const area = d3
    .area<TidePoint>()
    .x((d) => x(new Date(d.time)))
    .y0(innerHeight)
    .y1((d) => y(d.height))
    .curve(d3.curveCatmullRom.alpha(0.5));

  if (lastObsTime && hasForecast) {
    const observedSegment = filteredPoints.filter(
      (p) => new Date(p.time).getTime() <= lastObsTime,
    );
    const forecastSegment = filteredPoints.filter(
      (p) => new Date(p.time).getTime() >= lastObsTime,
    );

    if (observedSegment.length > 1) {
      g.append("path")
        .datum(observedSegment)
        .attr("d", area)
        .attr("fill", `url(#${gradientId})`);
    }
    if (forecastSegment.length > 1) {
      g.append("path")
        .datum(forecastSegment)
        .attr("d", area)
        .attr("fill", `url(#${gradientId})`)
        .attr("opacity", 0.6);
    }
  } else {
    g.append("path")
      .datum(filteredPoints)
      .attr("d", area)
      .attr("fill", `url(#${gradientId})`);
  }
}

/** Draw the tide curve line(s) — solid for observations, dashed for forecast. */
function drawLines(
  ctx: DrawContext,
  lastObsTime: number | null,
  hasForecast: boolean,
): void {
  const { g, x, y, colors, filteredPoints } = ctx;

  const line = d3
    .line<TidePoint>()
    .x((d) => x(new Date(d.time)))
    .y((d) => y(d.height))
    .curve(d3.curveCatmullRom.alpha(0.5));

  if (lastObsTime && hasForecast) {
    const observedSegment = filteredPoints.filter(
      (p) => new Date(p.time).getTime() <= lastObsTime,
    );
    const forecastSegment = filteredPoints.filter(
      (p) => new Date(p.time).getTime() >= lastObsTime,
    );

    if (observedSegment.length > 1) {
      g.append("path")
        .datum(observedSegment)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colors.secondary)
        .attr("stroke-width", 2.5)
        .attr("class", "tide-wave-path");
    }
    if (forecastSegment.length > 1) {
      g.append("path")
        .datum(forecastSegment)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colors.secondary)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.7);
    }
  } else {
    g.append("path")
      .datum(filteredPoints)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", colors.secondary)
      .attr("stroke-width", 2.5)
      .attr("class", "tide-wave-path");
  }
}

/** Draw the X (time) and Y (height) axes with grid lines. */
function drawAxes(ctx: DrawContext, view: "today" | "7day"): void {
  const { g, x, y, innerWidth, innerHeight, colors } = ctx;

  // Time axis
  const xAxis = d3
    .axisBottom(x)
    .ticks(view === "today" ? 6 : 7)
    .tickFormat((domainValue) => {
      const date =
        domainValue instanceof Date
          ? domainValue
          : new Date(domainValue.valueOf());
      if (view === "today") {
        return d3.timeFormat("%H:%M")(date);
      }
      if (date.getHours() === 0 && date.getMinutes() === 0) {
        return d3.timeFormat("%d/%m")(date);
      }
      return d3.timeFormat("%H:%M")(date);
    })
    .tickSize(0)
    .tickPadding(8);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .attr("class", "text-outline font-label")
    .selectAll("text")
    .attr("fill", colors.outline)
    .attr("font-size", "11px");

  g.select(".domain")
    .attr("stroke", colors.outlineVariant)
    .attr("stroke-width", 0.5);

  // Y axis (height in meters)
  const yAxis = d3
    .axisLeft(y)
    .ticks(4)
    .tickFormat((d) => `${d}m`)
    .tickSize(-innerWidth)
    .tickPadding(6);

  const yAxisG = g.append("g").call(yAxis);
  yAxisG
    .selectAll("text")
    .attr("fill", colors.outline)
    .attr("font-size", "11px");
  yAxisG.select(".domain").remove();
  yAxisG
    .selectAll(".tick line")
    .attr("stroke", colors.surfaceContainerHighest)
    .attr("stroke-dasharray", "2,4");
}

/** Draw high/low extreme dots and labels, clamped to chart bounds. */
function drawExtremeMarkers(
  ctx: DrawContext,
  extremes: TideExtreme[],
  xExtent: [Date, Date],
): void {
  const { g, x, y, innerWidth, innerHeight, colors } = ctx;

  const filteredExtremes = extremes.filter((e) => {
    const t = new Date(e.time);
    return t >= xExtent[0] && t <= xExtent[1];
  });

  // Dots
  g.selectAll(".extreme-dot")
    .data(filteredExtremes)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(new Date(d.time)))
    .attr("cy", (d) => y(d.height))
    .attr("r", 4)
    .attr("fill", (d) =>
      d.type === "high" ? colors.secondary : colors.primary,
    )
    .attr("stroke", colors.onPrimary)
    .attr("stroke-width", 2);

  // Labels
  g.selectAll(".extreme-label")
    .data(filteredExtremes)
    .enter()
    .append("text")
    .attr("x", (d) => {
      const cx = x(new Date(d.time));
      return Math.max(40, Math.min(cx, innerWidth - 40));
    })
    .attr("y", (d) => {
      const cy = y(d.height);
      if (d.type === "low" && cy + 18 > innerHeight - 4) return cy - 14;
      if (d.type === "high" && cy - 14 < 4) return cy + 18;
      return cy + (d.type === "high" ? -14 : 18);
    })
    .attr("text-anchor", "middle")
    .attr("fill", (d) =>
      d.type === "high" ? colors.secondary : colors.primary,
    )
    .attr("font-size", "10px")
    .attr("font-weight", "600")
    .text(
      (d) =>
        `${d.height.toFixed(1)}m ${new Date(d.time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
    );
}

/** Draw the "AHORA" now-marker: dashed vertical line, interpolated dot, and pill badge. */
function drawNowMarker(ctx: DrawContext, currentTime: Date | undefined): void {
  const { g, x, y, innerHeight, colors, filteredPoints } = ctx;

  const now = currentTime ?? new Date();
  const nowX = x(now);

  if (nowX < 0 || nowX > ctx.innerWidth) return;

  // Dashed vertical line
  g.append("line")
    .attr("x1", nowX)
    .attr("x2", nowX)
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", colors.tertiary)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4")
    .attr("opacity", 0.7);

  // Interpolated dot on the curve
  const bisect = d3.bisector<TidePoint, Date>((d) => new Date(d.time)).left;
  const idx = bisect(filteredPoints, now);
  if (idx <= 0 || idx >= filteredPoints.length) return;

  const p0 = filteredPoints[idx - 1];
  const p1 = filteredPoints[idx];
  const t0 = new Date(p0.time).getTime();
  const t1 = new Date(p1.time).getTime();
  const frac = (now.getTime() - t0) / (t1 - t0);
  const interpolatedY = p0.height + frac * (p1.height - p0.height);

  g.append("circle")
    .attr("cx", nowX)
    .attr("cy", y(interpolatedY))
    .attr("r", 6)
    .attr("fill", colors.tertiary)
    .attr("stroke", colors.onPrimary)
    .attr("stroke-width", 2.5)
    .attr("class", "drop-shadow-lg");

  // "AHORA" pill badge
  g.append("rect")
    .attr("x", nowX - 22)
    .attr("y", -16)
    .attr("width", 44)
    .attr("height", 18)
    .attr("rx", 9)
    .attr("fill", colors.tertiary);

  g.append("text")
    .attr("x", nowX)
    .attr("y", -4)
    .attr("text-anchor", "middle")
    .attr("fill", colors.onPrimary)
    .attr("font-size", "9px")
    .attr("font-weight", "700")
    .attr("letter-spacing", "0.5px")
    .text("AHORA");
}

/** Set up the interactive tooltip overlay (crosshair, dot, text box on hover/touch). */
function setupTooltip(ctx: DrawContext): void {
  const { g, x, y, innerWidth, innerHeight, colors, filteredPoints } = ctx;

  const bisect = d3.bisector<TidePoint, Date>((d) => new Date(d.time)).left;

  // Crosshair line (hidden by default)
  const crosshairLine = g
    .append("line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", colors.outline)
    .attr("stroke-width", 0.8)
    .attr("stroke-dasharray", "3,3")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Tooltip dot (hidden by default)
  const tooltipDot = g
    .append("circle")
    .attr("r", 5)
    .attr("fill", colors.secondary)
    .attr("stroke", colors.onPrimary)
    .attr("stroke-width", 2)
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Tooltip background + text group
  const tooltipG = g
    .append("g")
    .style("opacity", 0)
    .style("pointer-events", "none");

  tooltipG
    .append("rect")
    .attr("class", "tooltip-bg")
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", colors.primary)
    .attr("opacity", 0.92);

  const tooltipText1 = tooltipG
    .append("text")
    .attr("class", "tooltip-time")
    .attr("fill", colors.onPrimary)
    .attr("font-size", "10px")
    .attr("font-weight", "600");

  const tooltipText2 = tooltipG
    .append("text")
    .attr("class", "tooltip-height")
    .attr("fill", colors.primaryFixedDim)
    .attr("font-size", "12px")
    .attr("font-weight", "700");

  function showTooltip(mouseX: number) {
    const hoveredDate = x.invert(mouseX);
    const idx = bisect(filteredPoints, hoveredDate);

    if (idx <= 0 || idx >= filteredPoints.length) {
      hideTooltip();
      return;
    }

    const p0 = filteredPoints[idx - 1];
    const p1 = filteredPoints[idx];
    const t0 = new Date(p0.time).getTime();
    const t1 = new Date(p1.time).getTime();
    const tHover = hoveredDate.getTime();
    const frac = t1 !== t0 ? (tHover - t0) / (t1 - t0) : 0;
    const interpolatedH = p0.height + frac * (p1.height - p0.height);

    const cx = x(hoveredDate);
    const cy = y(interpolatedH);

    // Crosshair
    crosshairLine.attr("x1", cx).attr("x2", cx).style("opacity", 1);

    // Dot
    tooltipDot.attr("cx", cx).attr("cy", cy).style("opacity", 1);

    // Text content
    const timeStr = hoveredDate.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const heightStr = `${interpolatedH.toFixed(2)}m`;

    tooltipText1.text(timeStr);
    tooltipText2.text(heightStr);

    // Measure text for background sizing
    const textWidth = Math.max(
      (tooltipText1.node()?.getBBox().width ?? 40),
      (tooltipText2.node()?.getBBox().width ?? 40),
    );
    const boxW = textWidth + 16;
    const boxH = 40;

    // Position tooltip above the dot, flip if near edge
    let tx = cx - boxW / 2;
    let ty = cy - boxH - 12;
    if (ty < 0) ty = cy + 16;
    if (tx < 0) tx = 4;
    if (tx + boxW > innerWidth) tx = innerWidth - boxW - 4;

    tooltipG
      .select(".tooltip-bg")
      .attr("x", tx)
      .attr("y", ty)
      .attr("width", boxW)
      .attr("height", boxH);
    tooltipText1.attr("x", tx + 8).attr("y", ty + 15);
    tooltipText2.attr("x", tx + 8).attr("y", ty + 32);

    tooltipG.style("opacity", 1);
  }

  function hideTooltip() {
    crosshairLine.style("opacity", 0);
    tooltipDot.style("opacity", 0);
    tooltipG.style("opacity", 0);
  }

  // Invisible overlay for mouse/touch events
  g.append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "none")
    .style("pointer-events", "all")
    .style("cursor", "crosshair")
    .on("mousemove", (event: MouseEvent) => {
      const [mx] = d3.pointer(event);
      showTooltip(mx);
    })
    .on("touchmove", (event: TouchEvent) => {
      event.preventDefault();
      const [mx] = d3.pointer(event);
      showTooltip(mx);
    })
    .on("mouseleave", hideTooltip)
    .on("touchend", hideTooltip);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TideCurve({
  points,
  extremes,
  obsPoints,
  fcstPoints,
  view = "today",
  currentTime,
  height: chartHeight = 200,
}: TideCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Theme revision counter — incremented when .dark is toggled to force re-draw
  const [themeRev, setThemeRev] = useState(0);
  // Unique gradient ID so multiple TideCurve instances on the same page don't collide
  const reactId = useId();
  const gradientId = `tide-gradient-${reactId.replace(/:/g, "")}`;

  // Track container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    setWidth(container.clientWidth);

    return () => observer.disconnect();
  }, []);

  // Watch for .dark class toggling on <html> to re-render the chart
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeRev((r) => r + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Draw chart with D3 — orchestrates the helper functions above
  useEffect(() => {
    if (!svgRef.current || width === 0 || points.length === 0) return;

    const colors = getThemeColors();

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 16, right: 16, bottom: 32, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", chartHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Filter points for current view
    let filteredPoints = points;
    if (view === "today") {
      const now = currentTime ?? new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      filteredPoints = points.filter((p) => {
        const t = new Date(p.time);
        return t >= startOfDay && t < endOfDay;
      });

      if (filteredPoints.length === 0) filteredPoints = points;
    }

    // Scales
    const xExtent = d3.extent(filteredPoints, (d) => new Date(d.time)) as [
      Date,
      Date,
    ];
    const yExtent = d3.extent(filteredPoints, (d) => d.height) as [
      number,
      number,
    ];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.15 || 0.5;

    const x = d3.scaleTime().domain(xExtent).range([0, innerWidth]);
    const y = d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0]);

    // Shared context for all drawing helpers
    const ctx: DrawContext = {
      g,
      x,
      y,
      innerWidth,
      innerHeight,
      colors,
      filteredPoints,
    };

    // Observation/forecast split point
    const lastObsTime =
      obsPoints && obsPoints.length > 0
        ? new Date(obsPoints[obsPoints.length - 1].time).getTime()
        : null;
    const hasForecast = !!(fcstPoints && fcstPoints.length > 0);

    // 1. Gradient definition
    drawGradient(svg, gradientId, colors);

    // 2. Area fill (shaded region under the curve)
    drawAreaFill(ctx, gradientId, lastObsTime, hasForecast);

    // 3. Tide curve lines (solid observed, dashed forecast)
    drawLines(ctx, lastObsTime, hasForecast);

    // 4. Axes (time + height)
    drawAxes(ctx, view);

    // 5. Extreme markers (high/low dots + labels)
    drawExtremeMarkers(ctx, extremes, xExtent);

    // 6. "Now" marker (vertical line + dot + AHORA badge)
    drawNowMarker(ctx, currentTime);

    // 7. Interactive tooltip overlay
    setupTooltip(ctx);
  }, [
    points,
    extremes,
    obsPoints,
    fcstPoints,
    view,
    currentTime,
    width,
    chartHeight,
    themeRev,
    gradientId,
  ]);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        className="w-full"
        style={{ height: chartHeight }}
        role="img"
        aria-label="Curva de mareas: gráfico mostrando la variación de la altura de marea a lo largo del tiempo"
      />
    </div>
  );
}
