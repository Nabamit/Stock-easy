"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Lock } from "lucide-react";

interface SalesChartProps {
  data: { date: string; sales: number }[];
  title?: string;
  isLocked?: boolean;
}

export function SalesChart({ data, title = "Sales Trend", isLocked = false }: SalesChartProps) {
  return (
    <Card className="relative overflow-hidden">
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-background/50 backdrop-blur-md">
          <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">Charts Locked in Trial Mode</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs mt-1">
            Wait for central admin verification to unlock sales trends and analytics.
          </p>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `₹${v}`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value ?? 0)),
                  "Sales",
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(199, 89%, 48%)"
                fill="url(#salesGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
