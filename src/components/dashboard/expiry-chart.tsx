"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface ExpiryChartProps {
  data: { range: string; count: number; color: string }[];
  isLocked?: boolean;
}

export function ExpiryChart({ data, isLocked = false }: ExpiryChartProps) {
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
        <CardTitle className="text-base">Expiry Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
