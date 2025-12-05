
"use client"

import { ShoppingCart } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
  pedidos: {
    label: "Pedidos",
    color: "hsl(var(--hid-secondary))",
  },
}

type ChartData = {
    date: string,
    pedidos: number,
}

interface OrdersChartProps {
  data: ChartData[] | undefined;
  isLoading: boolean;
}

export function OrdersChart({ data, isLoading }: OrdersChartProps) {
    if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos de la Semana</CardTitle>
        <CardDescription>
          Resumen de los últimos 7 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: -20,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(new Date(value), "E", { locale: es }).slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="pedidos"
              type="natural"
              fill="var(--color-pedidos)"
              fillOpacity={0.4}
              stroke="var(--color-pedidos)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
