// src/components/Homepage/GoalCard.js
import React from 'react';
import { Target } from 'lucide-react';
import { computeGoalProgress } from '../../utils/goalUtils';

const PERIOD_LABEL = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const GoalCard = ({ activities, goal }) => {
  if (!goal || goal.enabled === false || !goal.target) return null;

  const { metric, period, target } = goal;
  const r = computeGoalProgress(activities || [], goal, new Date());
  const unit = metric === 'time' ? 'h' : 'km';
  const fmt = (v) => `${Math.round(v).toLocaleString()}${unit}`;
  const pct = Math.min(r.percent, 100);
  const onTrack = (proj) => proj >= target;

  return (
    <div className="athletic-card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Target className="w-6 h-6 text-orange-400" />
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {PERIOD_LABEL[period] || 'Yearly'} {metric === 'time' ? 'Time' : 'Distance'} Goal
        </h2>
      </div>

      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-white">{fmt(r.periodTotal)}</span>
        <span className="text-sm text-slate-400">of {fmt(target)} — {Math.round(r.percent)}%</span>
      </div>

      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-gradient-to-r from-orange-500 to-red-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-slate-400 mb-4">{fmt(r.remaining)} to go</div>

      <div className="grid grid-cols-2 gap-4">
        <div className="athletic-card-gradient p-3 rounded-lg">
          <div className="text-xs text-slate-400">Projected (pace to date)</div>
          <div className="text-lg font-bold text-white">{fmt(r.projections.paceToDate)}</div>
          <div className={`text-xs ${onTrack(r.projections.paceToDate) ? 'text-green-400' : 'text-red-400'}`}>
            {onTrack(r.projections.paceToDate) ? 'On track' : 'Behind'}
          </div>
        </div>
        <div className="athletic-card-gradient p-3 rounded-lg">
          <div className="text-xs text-slate-400">Projected (recent trend)</div>
          <div className="text-lg font-bold text-white">{fmt(r.projections.recentTrend)}</div>
          <div className={`text-xs ${onTrack(r.projections.recentTrend) ? 'text-green-400' : 'text-red-400'}`}>
            {onTrack(r.projections.recentTrend) ? 'On track' : 'Behind'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
