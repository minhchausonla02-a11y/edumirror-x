"use client";
import { useEffect, useState } from "react";
import type { AggregateSummary } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#22c55e","#ef4444","#f59e0b","#6366f1"];

export default function DashboardView() {
  const [agg, setAgg] = useState<AggregateSummary | null>(null);

  const load = async () => {
    const r = await fetch("/api/feedback");
    setAgg(await r.json());
  };
  useEffect(()=>{ load(); const t = setInterval(load, 1500); return ()=>clearInterval(t); },[]);

  const pieData = [
    { name:"Hiểu", value: agg?.understood||0 },
    { name:"Chưa rõ", value: agg?.notClear||0 },
    { name:"Nhanh quá", value: agg?.tooFast||0 },
    { name:"Muốn ví dụ", value: agg?.needExamples||0 },
  ];

  return (
    <section id="dashboard" className="card p-5 mt-6">
      <div className="section-title">📈 Dashboard phản hồi</div>
      {!agg?.total && <div className="subtle">Chưa có phản hồi nào.</div>}
      {agg?.total ? (
        <div className="grid-2">
          <div className="card p-4">
            <div className="font-medium mb-2">Tỷ lệ tổng quan</div>
            <div style={{height:260}}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">So sánh nhóm vấn đề</div>
            <div style={{height:260}}>
              <ResponsiveContainer>
                <BarChart data={pieData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ):null}
    </section>
  );
}
