import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  TrendingUp, TrendingDown, Minus, Zap, RefreshCw,
  Brain, AlertTriangle, Activity, Shield, Eye,
  DollarSign, Users, Server, Loader2, ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';

const riskLevelStyle = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const riskLevelColor = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

const impactEffortColor = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const SpecialistCard = ({ title, icon: Icon, iconColor, data }) => {
  const level = data?.risk_level || 'low';
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${iconColor}20` }}>
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
            </div>
            <span className="font-semibold">{title}</span>
          </div>
          <Badge variant="outline" className={riskLevelStyle[level]}>
            {level}
          </Badge>
        </div>
        {data?.top_finding && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{data.top_finding}</p>
        )}
        {data?.signals?.length > 0 && (
          <div className="space-y-1.5">
            {data.signals.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-primary">›</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Risk Level</span>
            <span className="capitalize">{level}</span>
          </div>
          <Progress
            value={{ critical: 90, high: 70, medium: 45, low: 15 }[level] || 15}
            className="h-1.5"
          />
        </div>
      </CardContent>
    </Card>
  );
};

const Insights = () => {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (force = false) => {
    try {
      const res = await api().get(`/insights${force ? '?refresh=true' : ''}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInsights(true);
    toast.success('Insights refreshed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const prediction = data?.risk_prediction || {};
  const behavioralInsights = data?.behavioral_insights || [];
  const systemicRisks = data?.systemic_risks || [];
  const quickWins = data?.quick_wins || [];
  const priorityActions = data?.priority_actions || [];
  const specialists = data?.three_specialist_signals || {};

  const TrendIcon = prediction.overall_trend === 'improving' ? TrendingUp
    : prediction.overall_trend === 'declining' ? TrendingDown : Minus;
  const trendColor = prediction.overall_trend === 'improving' ? 'text-green-400'
    : prediction.overall_trend === 'declining' ? 'text-red-400' : 'text-yellow-400';

  const radarData = [
    { subject: 'PCI DSS', A: 82 },
    { subject: 'GDPR', A: 78 },
    { subject: 'CCPA', A: 85 },
    { subject: 'LGPD', A: 71 },
    { subject: 'AML/KYC', A: 88 },
  ];

  const actionBarData = priorityActions.slice(0, 5).map(a => ({
    name: a.framework || 'General',
    impact: a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1,
    action: a.action,
    color: impactEffortColor[a.impact] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Predictive Insights</h1>
          <p className="text-muted-foreground">AI-generated compliance risk predictions and behavioral intelligence</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Risk Prediction Hero */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8"
        >
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                30-Day Risk Prediction
              </CardTitle>
              <CardDescription>AI model confidence: {prediction.confidence || 0}%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-5xl font-bold">
                  {prediction.predicted_score_next_30_days?.toFixed(1) || '—'}%
                </span>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-5 w-5" />
                  <span className="capitalize font-medium">{prediction.overall_trend || '—'}</span>
                </div>
              </div>
              <div className="mb-4">
                <Progress value={prediction.predicted_score_next_30_days || 0} className="h-2" />
              </div>
              {prediction.key_drivers?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Drivers</p>
                  <div className="flex flex-wrap gap-2">
                    {prediction.key_drivers.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4"
        >
          <Card className="bg-card border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Framework Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Radar dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Three Specialists */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Eye className="h-5 w-5 text-accent" />
          Agentic Surveillance — Three Specialists
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SpecialistCard
            title="Financial"
            icon={DollarSign}
            iconColor="#3b82f6"
            data={specialists.financial}
          />
          <SpecialistCard
            title="Behavioral"
            icon={Users}
            iconColor="#8b5cf6"
            data={specialists.behavioral}
          />
          <SpecialistCard
            title="Operational"
            icon={Server}
            iconColor="#f59e0b"
            data={specialists.operational}
          />
        </div>
      </div>

      {/* Behavioral Insights */}
      {behavioralInsights.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              Predictive Behavioral Insights
            </CardTitle>
            <CardDescription>Pre-crime detection and anomaly signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {behavioralInsights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/50"
              >
                <div className="p-1.5 rounded-md shrink-0 mt-0.5" style={{ backgroundColor: `${riskLevelColor[insight.risk_level]}20` }}>
                  <AlertTriangle className="h-4 w-4" style={{ color: riskLevelColor[insight.risk_level] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={riskLevelStyle[insight.risk_level]}>
                      {insight.risk_level}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">{insight.type?.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm mb-1.5">{insight.description}</p>
                  {insight.recommended_action && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {insight.recommended_action}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Systemic Risks */}
        {systemicRisks.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-400" />
                Systemic Risks
              </CardTitle>
              <CardDescription>Cross-domain risks requiring strategic attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemicRisks.map((risk, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm mb-2">{risk.risk}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Probability: <span className="capitalize font-medium">{risk.probability}</span></span>
                    <span className="text-muted-foreground">Impact: <span className="capitalize font-medium">{risk.impact}</span></span>
                  </div>
                  {risk.affected_frameworks?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {risk.affected_frameworks.map(f => (
                        <Badge key={f} variant="outline" className="text-xs">{f.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Wins */}
        {quickWins.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Quick Wins
              </CardTitle>
              <CardDescription>High-impact, low-effort compliance improvements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickWins.map((win, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                >
                  <Shield className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm">{win}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Priority Actions */}
      {priorityActions.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Priority Action Plan
            </CardTitle>
            <CardDescription>Ordered by impact and effort — start here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priorityActions.map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border border-border/50"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{action.action}</p>
                    {action.framework && (
                      <p className="text-xs text-muted-foreground mt-0.5">{action.framework.replace('_', ' ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs" style={{
                      backgroundColor: `${impactEffortColor[action.impact]}20`,
                      color: impactEffortColor[action.impact],
                      borderColor: `${impactEffortColor[action.impact]}40`
                    }}>
                      {action.impact} impact
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {action.effort} effort
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Insights;
