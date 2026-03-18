"use client"

import { RadialBar, RadialBarChart, PolarRadiusAxis, Label } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  active: {
    label: "Activos",
    color: "hsl(var(--hid-primary))",
  },
  available: {
    label: "Margen",
    color: "hsl(var(--muted))",
  },
}

interface RiderCapacityChartProps {
  totalRiders?: number
  activeRiders?: number
  isLoading: boolean
}

export function RiderCapacityChart({
  totalRiders = 0,
  activeRiders = 0,
  isLoading,
}: RiderCapacityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const normalizedTotal = Math.max(totalRiders, 0)
  const normalizedActive = Math.min(Math.max(activeRiders, 0), normalizedTotal)
  const availableRiders = Math.max(normalizedTotal - normalizedActive, 0)
  const usagePercentage =
    normalizedTotal > 0 ? Math.round((normalizedActive / normalizedTotal) * 100) : 0

  const chartData = [
    {
      name: "capacity",
      active: normalizedActive,
      available: availableRiders,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacidad de Repartidores</CardTitle>
        <CardDescription>Activos vs margen disponible</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[260px_1fr] md:items-center">
        <ChartContainer config={chartConfig} className="mx-auto h-[260px] max-w-[260px]">
          <RadialBarChart
            data={chartData}
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={120}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                    return null
                  }

                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 8}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {usagePercentage}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 16}
                        className="fill-muted-foreground text-xs"
                      >
                        En uso
                      </tspan>
                    </text>
                  )
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="available"
              stackId="a"
              cornerRadius={6}
              fill="var(--color-available)"
              className="stroke-transparent"
            />
            <RadialBar
              dataKey="active"
              stackId="a"
              cornerRadius={6}
              fill="var(--color-active)"
              className="stroke-transparent"
            />
          </RadialBarChart>
        </ChartContainer>

        <div className="grid gap-3">
          <div className="rounded-xl border bg-slate-50/60 p-4">
            <div className="text-sm text-slate-500">Repartidores activos</div>
            <div className="text-3xl font-semibold">{normalizedActive}</div>
          </div>
          <div className="rounded-xl border bg-slate-50/60 p-4">
            <div className="text-sm text-slate-500">Margen disponible</div>
            <div className="text-3xl font-semibold">{availableRiders}</div>
          </div>
          <div className="rounded-xl border bg-slate-50/60 p-4">
            <div className="text-sm text-slate-500">Base total registrada</div>
            <div className="text-3xl font-semibold">{normalizedTotal}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
