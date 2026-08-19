'use client';

import { Activity, BarChart3, Clock, Film, Globe, TrendingUp, Users } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { StatCard } from '../../components/ui/stat-card';

export default function AnalyticsPage() {
  const topGenres = [
    { name: 'Psychological Thriller', percent: 28.4, count: '138.9k viewings' },
    { name: 'Sci-Fi / Cyberpunk', percent: 22.1, count: '108.2k viewings' },
    { name: 'A24 / Contemporary Indie', percent: 18.6, count: '91.0k viewings' },
    { name: 'Neo-Noir / Crime', percent: 15.2, count: '74.4k viewings' },
    { name: 'International Arthouse', percent: 15.7, count: '76.8k viewings' },
  ];

  const peakHours = [
    { hour: '8:00 PM', percentage: 92 },
    { hour: '9:00 PM', percentage: 98 },
    { hour: '10:00 PM', percentage: 84 },
    { hour: '11:00 PM', percentage: 65 },
    { hour: '12:00 AM', percentage: 48 },
    { hour: '1:00 AM', percentage: 26 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-red-500" />
          Application Analytics & Viewing Patterns
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Deep telemetry on cinephile engagement, circadian rhythm viewing distributions, and retention cohorts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Daily Active Users"
          value="15,840"
          description="48.9k monthly active"
          trend={{ value: '18.4%', isPositive: true }}
          icon={Users}
          colorVariant="red"
        />
        <StatCard
          title="Total Screenings Logged"
          value="489,200"
          description="3.8 films / user avg"
          trend={{ value: '24.1%', isPositive: true }}
          icon={Film}
          colorVariant="purple"
        />
        <StatCard
          title="Avg Screen Time"
          value="142 min"
          description="Peak screening length"
          trend={{ value: '6.2%', isPositive: true }}
          icon={Clock}
          colorVariant="blue"
        />
        <StatCard
          title="30-Day Retention"
          value="68.4%"
          description="Industry benchmark: 42%"
          trend={{ value: '8.5%', isPositive: true }}
          icon={TrendingUp}
          colorVariant="emerald"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Genre Distribution */}
        <Card className="p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle>Top CineWrapped Genres</CardTitle>
            <CardDescription>Most watched and rated categories across all active users</CardDescription>
          </CardHeader>

          <div className="space-y-3 pt-2">
            {topGenres.map((g) => (
              <div key={g.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">{g.name}</span>
                  <span className="text-zinc-400">{g.percent}% ({g.count})</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full"
                    style={{ width: `${g.percent * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Circadian Peak Screening Heatmap */}
        <Card className="p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle>Circadian Screening Heatmap</CardTitle>
            <CardDescription>Hourly distribution of user viewing starts across local timezones</CardDescription>
          </CardHeader>

          <div className="space-y-3 pt-2">
            {peakHours.map((h) => (
              <div key={h.hour} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">{h.hour}</span>
                  <span className="text-zinc-400">{h.percentage}% peak volume</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                    style={{ width: `${h.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
