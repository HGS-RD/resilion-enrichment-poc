"use client"

import React from "react"
import ReactECharts from "echarts-for-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"
import { useEnrichmentJobs } from "../hooks/use-enrichment-jobs"

export function EnrichmentTrendChart() {
  const { jobs } = useEnrichmentJobs()
  
  // Generate trend data from real jobs
  const generateTrendData = () => {
    const now = new Date()
    const months = []
    const totalJobsData = []
    const successfulJobsData = []
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'long' })
      months.push(monthName)
      
      // Filter jobs for this month
      const monthJobs = jobs.filter(job => {
        const jobDate = new Date(job.startTime)
        return jobDate.getMonth() === date.getMonth() && 
               jobDate.getFullYear() === date.getFullYear()
      })
      
      const successfulJobs = monthJobs.filter(job => job.status === 'completed')
      
      totalJobsData.push(monthJobs.length)
      successfulJobsData.push(successfulJobs.length)
    }
    
    return { months, totalJobsData, successfulJobsData }
  }
  
  const { months, totalJobsData, successfulJobsData } = generateTrendData()
  
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
      data: months,
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
        data: totalJobsData,
      },
      {
        name: "Successful Jobs",
        type: "line",
        stack: "Total",
        areaStyle: {},
        emphasis: {
          focus: "series",
        },
        data: successfulJobsData,
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
