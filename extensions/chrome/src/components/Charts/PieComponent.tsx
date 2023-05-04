import * as d3 from "d3";
import React, { useCallback, useMemo } from "react";
import { DESIGN_SYSTEM_COLORS } from "../../utils/colors";
import { Theme, useTheme } from "../../hooks/useTheme";

type PieData = {
  label: string;
  questions: number;
  percentage: number;
  color: string;
};

function drawChart(
  svgRef: SVGGElement,
  data: PieData[],
  width: number,
  { mode }: Theme
) {
  const svg = d3.select(svgRef);
  const pieFn = d3.pie<PieData>().value((d) => d.percentage);
  const arcs = pieFn(data);
  console.log({ arcs });
  svg.select("#o-pie-chart").remove();
  // Add X axis
  const arc = d3
    .arc()
    .innerRadius(0)
    .outerRadius(width / 2);

  svg.attr("width", width * 2).attr("height", width);
  const g = svg
    .append("g")
    .attr("id", "o-pie-chart")
    .attr("transform", `translate(${width / 2},${width / 2})`);

  g.selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("fill", (d) => d.data.color)
    // @ts-ignore
    .attr("d", arc);

  g.selectAll("text")
    .data(arcs)
    .enter()
    .append("text")
    .attr(
      "transform",
      (d: any) =>
        `translate(${arc.centroid(d).map((e, i) => (i === 0 ? e - 12 : e))}  )`
    )
    .text((d: any) => d.data.label)
    .attr("fill", "#fff")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("text-align", "left")
    .raise();
  g.selectAll("line")
    .data(arcs.slice(0, 1))
    .enter()
    .append("line")
    .attr("x1", (d: any) => arc.centroid(d)[0] + 10)
    .attr("y1", (d: any) => arc.centroid(d)[1] - 10)
    .attr("x2", (width * 3) / 4.5)
    .attr("y2", -width / 4.4)
    .attr(
      "stroke",
      mode === "dark"
        ? DESIGN_SYSTEM_COLORS.primary500
        : DESIGN_SYSTEM_COLORS.gray600
    )
    .attr("stroke-width", 1.5);
}
type PieChartProps = {
  questions: number;
  answers: number;
  width?: number;
};
export const PieChart = ({ width, questions, answers }: PieChartProps) => {
  const { mode } = useTheme();

  const _width = width ?? 145;

  const done = (answers * 100) / questions;
  const newPie: PieData[] = useMemo(() => {
    return [
      {
        label: `${answers}A`,
        questions: answers,
        percentage: done,
        color: DESIGN_SYSTEM_COLORS.success500,
      },
      {
        label: "",
        questions: questions - answers,
        percentage: 100 - done,
        color: DESIGN_SYSTEM_COLORS.gray300,
      },
    ];
  }, [answers, done, questions]);

  const svg = useCallback(
    (svgRef: any) => {
      drawChart(svgRef, newPie, _width, { mode });
    },
    [mode, newPie, width]
  );

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svg}>
        <text
          x={`${(_width * 6) / 5}`}
          y={`${_width / 4}`}
          fill={
            mode === "dark"
              ? DESIGN_SYSTEM_COLORS.gray25
              : DESIGN_SYSTEM_COLORS.notebookG800
          }
          fontSize={`${12}px`}
        >
          <tspan>{`${answers} correct answers`}</tspan>
          <tspan
            x={`${(_width * 6) / 5}`}
            dy="1.2em"
          >{`out of ${questions} questions`}</tspan>
        </text>
      </svg>
    </div>
  );
};
