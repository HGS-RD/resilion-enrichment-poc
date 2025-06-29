"use client"

import React from "react"
import ReactECharts from "echarts-for-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"

export function EnrichmentTrendChart() {
  const option = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["Total Jobs", "Successful Jobs"],
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: ["January", "February", "March", "April", "May", "June"],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "Total Jobs",
        type: "line",
        stack: "Total",
        areaStyle: {},
        emphasis: {
          focus: "series",
        },
        data: [186, 305, 237, 273, 209, 214],
      },
      {
        name: "Successful Jobs",
        type: "line",
        stack: "Total",
        areaStyle: {},
        emphasis: {
          focus: "series",
        },
        data: [80, 200, 120, 190, 130, 140],
      },
    ],
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrichment Jobs Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: "300px" }} />
      </CardContent>
    </Card>
  )
}
