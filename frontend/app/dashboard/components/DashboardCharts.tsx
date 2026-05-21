"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// sleek modern color palette
const COLORS = [
  "#6366f1", // Indigo 500
  "#a855f7", // Purple 500
  "#06b6d4", // Cyan 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#ec4899", // Pink 500
  "#f43f5e", // Rose 500
  "#3b82f6", // Blue 500
];

// Custom Premium Tooltip Component
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = data.category || data.month || "";
    const value = payload[0].value;
    
    return (
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/80 p-3 rounded-2xl shadow-xl text-white text-xs font-medium animate-fade-in">
        <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">{name}</p>
        <p className="text-indigo-400 font-extrabold text-sm">
          {Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 })} F
        </p>
      </div>
    );
  }
  return null;
}

export function CategoryPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        📭 Aucune donnée disponible
      </div>
    );
  }

  // Calculate total amount to display in center of Donut
  const totalAmount = data.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
      {/* Donut Container with centered total */}
      <div className="relative h-48 w-48 flex-shrink-0">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
          <span className="text-lg font-black text-slate-800 mt-0.5">
            {totalAmount >= 1000000 
              ? `${(totalAmount / 1000000).toFixed(1)}M` 
              : totalAmount >= 1000 
                ? `${(totalAmount / 1000).toFixed(0)}k` 
                : totalAmount}
          </span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              paddingAngle={4}
              dataKey="total"
              nameKey="category"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="rgba(255,255,255,0.8)" 
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Elegant Custom Side Legend */}
      <div className="flex-1 w-full max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
        {data.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          const percent = totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(0) : "0";
          return (
            <div key={item.category} className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3.5 w-3.5 rounded-full flex-shrink-0 shadow-sm border border-white" style={{ backgroundColor: color }}></span>
                <span className="font-bold text-slate-700 truncate">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 pl-3">
                <span className="font-semibold text-slate-400">{percent}%</span>
                <span className="font-black text-slate-800">{Number(item.total).toLocaleString()} F</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyTrendBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        📭 Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 15,
            left: 5,
            bottom: 5,
          }}
        >
          {/* Beautiful SVG Gradients definitions */}
          <defs>
            <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.2} />
            </linearGradient>
          </defs>

          <CartesianGrid 
            strokeDasharray="4 4" 
            vertical={false} 
            stroke="#f1f5f9" 
          />
          <XAxis 
            dataKey="month" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={12} 
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
          />
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            tickFormatter={(value) => `${value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.04)", radius: 12 }} />
          <Bar 
            dataKey="total" 
            fill="url(#indigoGradient)" 
            stroke="#4f46e5"
            strokeWidth={1.5}
            radius={[10, 10, 0, 0]} 
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
