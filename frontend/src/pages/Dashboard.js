import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  Shield, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Bell, CheckCircle, Clock, Activity, ArrowRight, Bot,
  Brain, Zap, Eye, Scale
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const frameworkColors = {
  PCI_DSS: '#3b82f6',
  GDPR: '#8b5cf6',
  CCPA: '#10b981',
  LGPD: '#f59e0b',
  AML_KYC: '#ef4444',
};

const riskLevelStyle = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

const Dashboard = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [agentActivity, setAgentActivity] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, trendsRes, activityRes, insightsRes] = await Promise.all([
          api().get('/dashboard/stats'),
          api().get('/risk/trends?days=14'),
          api().get('/agents/activity'),
          api().get('/insights').catch(() => ({ data: null })),
        ]);
        setStats(statsRes.data);
        setTrends(trendsRes.data.trends);
        setAgentActivity(activityRes.data.activities);
        setInsights(insightsRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const predTrend = insights?.risk_prediction?.overall_trend;
  const PredIcon = predTrend === 'improving' ? TrendingUp : predTrend === 'declining' ? TrendingDown : Minus;
  const predColor = predTrend === 'improving' ? 'text-green-400' : predTrend === 'declining' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Real-time compliance posture across all frameworks</p>
        </div>
        <Button data-testid="refresh-dashboard-btn" onClick={() => window.location.reload()}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="col-span-12 md:col-span-8 lg:col-span-9"
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-border/50" data-testid="compliance-score-card">
            <div className="absolute inset-0 opacity-10 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.pexels.com/photos/11167645/pexels-photo-11167645.jpeg)' }} />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">Overall Compliance Score</p>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-6xl font-bold ${getScoreColor(stats?.overall_score)}`}>
                      {stats?.overall_score?.toFixed(1)}%
                    </span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +2.3% this week
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Based on {stats?.scores_by_framework?.length || 0} active compliance frameworks
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="p-6 rounded-full bg-primary/10">
                    <Shield className="h-16 w-16 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-12 md:col-span-4 lg:col-span-3 space-y-4"
        >
          <Card className="bg-card border-border/50" data-testid="incidents-stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.open_incidents || 0}</p>
                  <p className="text-xs text-muted-foreground">Open Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50" data-testid="alerts-stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Bell className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.active_alerts || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50" data-testid="tasks-stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pending_tasks || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Framework Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-6"
        >
          <Card className="bg-card border-border/50 h-full" data-testid="framework-scores-card">
            <CardHeader>
              <CardTitle className="text-lg">Framework Compliance</CardTitle>
              <CardDescription>Score breakdown by regulatory framework</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.scores_by_framework?.map((fw, index) => (
                <motion.div
                  key={fw.framework}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: frameworkColors[fw.framework] }} />
                      <span className="font-medium text-sm">{fw.framework.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(fw.trend)}
                      <span className={`font-mono font-bold text-sm ${getScoreColor(fw.score)}`}>
                        {fw.score.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={fw.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{fw.issues_count} open issues</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="col-span-12 lg:col-span-6"
        >
          <Card className="bg-card border-border/50 h-full" data-testid="trends-chart-card">
            <CardHeader>
              <CardTitle className="text-lg">Compliance Trends</CardTitle>
              <CardDescription>14-day compliance score history</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => v.split('-').slice(1).join('/')} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} domain={[60, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="compliance_score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights Preview */}
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="col-span-12 lg:col-span-6"
          >
            <Card className="bg-gradient-to-br from-accent/5 to-card border-accent/20 h-full" data-testid="ai-insights-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent" />
                    AI Predictive Insights
                  </CardTitle>
                  <CardDescription>30-day risk forecast & behavioral signals</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/insights')} className="text-xs">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Prediction */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <span className="text-sm text-muted-foreground">Predicted Score (30d)</span>
                  <div className="flex items-center gap-2">
                    <PredIcon className={`h-4 w-4 ${predColor}`} />
                    <span className="font-mono font-bold">{insights.risk_prediction?.predicted_score_next_30_days?.toFixed(1)}%</span>
                  </div>
                </div>
                {/* Quick wins */}
                {insights.quick_wins?.slice(0, 2).map((win, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Zap className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{win}</span>
                  </div>
                ))}
                {/* Systemic risk */}
                {insights.systemic_risks?.[0] && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    {insights.systemic_risks[0].risk}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Daily Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className={`col-span-12 ${insights ? 'lg:col-span-6' : 'lg:col-span-6'}`}
        >
          <Card className="bg-card border-border/50" data-testid="alerts-chart-card">
            <CardHeader>
              <CardTitle className="text-lg">Daily Activity</CardTitle>
              <CardDescription>Alerts, incidents, and resolutions (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trends.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => v.split('-').slice(1).join('/')} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="alerts" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Alerts" />
                  <Bar dataKey="incidents" fill="#ef4444" radius={[3, 3, 0, 0]} name="Incidents" />
                  <Bar dataKey="resolved" fill="#10b981" radius={[3, 3, 0, 0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="col-span-12 lg:col-span-6"
        >
          <Card className="bg-card border-border/50" data-testid="agent-activity-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Agent Activity</CardTitle>
                <CardDescription>Recent autonomous agent operations</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/agents')} data-testid="view-agents-btn">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {agentActivity.slice(0, 4).map((activity, index) => (
                <motion.div
                  key={activity.id || index}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{activity.action}</p>
                    {activity.result_summary && (
                      <p className="text-xs text-muted-foreground">{activity.result_summary}</p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {activity.agent_type?.replace('_', ' ')} Agent
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="col-span-12"
        >
          <Card className="bg-card border-border/50" data-testid="recent-activities-card">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
              <CardDescription>Latest compliance events and system updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats?.recent_activities?.map((activity, index) => (
                  <motion.div
                    key={activity.id || index}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground capitalize">{activity.type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
