import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AlertTriangle, Zap, RefreshCw, Scale, Shield,
  ArrowRight, CheckCircle, XCircle, Info, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const frameworkColors = {
  PCI_DSS: '#3b82f6',
  GDPR: '#8b5cf6',
  CCPA: '#10b981',
  LGPD: '#f59e0b',
  AML_KYC: '#ef4444',
};

const conflictTypeMeta = {
  direct_contradiction: { label: 'Direct Contradiction', icon: XCircle, color: 'text-red-400' },
  overlap: { label: 'Overlapping Obligation', icon: Info, color: 'text-yellow-400' },
  ambiguity: { label: 'Ambiguity', icon: AlertTriangle, color: 'text-orange-400' },
};

const severityStyle = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const FrameworkPill = ({ framework }) => (
  <span
    className="px-2 py-0.5 rounded text-xs font-mono font-semibold"
    style={{ backgroundColor: `${frameworkColors[framework] || '#6b7280'}20`, color: frameworkColors[framework] || '#9ca3af', border: `1px solid ${frameworkColors[framework] || '#6b7280'}40` }}
  >
    {framework?.replace('_', ' ')}
  </span>
);

const ConflictCard = ({ conflict, index }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = conflictTypeMeta[conflict.conflict_type] || conflictTypeMeta.ambiguity;
  const TypeIcon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card
        className="bg-card border-border/50 cursor-pointer hover:border-primary/30 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-500/10 shrink-0 mt-0.5">
              <TypeIcon className={`h-5 w-5 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Regulation pair */}
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <FrameworkPill framework={conflict.framework_1} />
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <FrameworkPill framework={conflict.framework_2} />
                <Badge variant="outline" className={`ml-auto ${severityStyle[conflict.severity] || severityStyle.medium}`}>
                  {conflict.severity}
                </Badge>
              </div>
              <p className="text-sm font-medium mb-1">{conflict.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{meta.label}</span>
                {conflict.regulation_1 && <span>· {conflict.regulation_1}</span>}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border/50 grid gap-4 md:grid-cols-2">
                  {conflict.example && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Example</p>
                      <p className="text-sm">{conflict.example}</p>
                    </div>
                  )}
                  {conflict.resolution && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Scale className="h-3 w-3" /> Recommended Resolution
                      </p>
                      <p className="text-sm">{conflict.resolution}</p>
                    </div>
                  )}
                  {conflict.jurisdiction_winner && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Jurisdiction Winner</p>
                      <p className="text-sm">{conflict.jurisdiction_winner}</p>
                    </div>
                  )}
                  {conflict.action_required && (
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Action Required
                      </p>
                      <p className="text-sm">{conflict.action_required}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground mt-3 text-right">
            {expanded ? 'Click to collapse ↑' : 'Click to expand ↓'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Conflicts = () => {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadCached = async () => {
    try {
      const res = await api().get('/regulations/conflicts');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCached(); }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api().post('/regulations/analyze-conflicts');
      setData(res.data);
      toast.success('Conflict analysis complete');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const conflicts = data?.conflicts || [];
  const filtered = filter === 'all' ? conflicts : conflicts.filter(c => c.severity === filter || c.conflict_type === filter);

  const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
  const highCount = conflicts.filter(c => c.severity === 'high').length;
  const contradictions = conflicts.filter(c => c.conflict_type === 'direct_contradiction').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regulatory Conflicts</h1>
          <p className="text-muted-foreground">AI-detected conflicting obligations across your regulatory frameworks</p>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing} data-testid="analyze-conflicts-btn">
          {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
          {analyzing ? 'Analyzing…' : 'Run Analysis'}
        </Button>
      </div>

      {/* Stats */}
      {conflicts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Conflicts', value: conflicts.length, color: 'text-foreground' },
            { label: 'Critical', value: criticalCount, color: 'text-red-400' },
            { label: 'High Severity', value: highCount, color: 'text-orange-400' },
            { label: 'Direct Contradictions', value: contradictions, color: 'text-yellow-400' },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border/50">
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analysis Summary */}
      {data?.analysis_summary && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm">{data.analysis_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      {conflicts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {['all', 'critical', 'high', 'medium', 'low', 'direct_contradiction', 'overlap'].map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f.replace('_', ' ')}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 && !data?.analysis_summary ? (
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Scale className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg mb-1">No Analysis Yet</p>
              <p className="text-muted-foreground text-sm max-w-md">
                Click <strong>Run Analysis</strong> to let the AI detect conflicting obligations
                across your regulatory frameworks (e.g., GDPR data deletion vs AML 5-year retention).
              </p>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Run Conflict Analysis
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            No conflicts match the selected filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((conflict, i) => (
            <ConflictCard key={conflict.id || i} conflict={conflict} index={i} />
          ))}
        </div>
      )}

      {/* Refresh info */}
      {data && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {conflicts.length} conflicts</span>
          <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={analyzing} className="text-xs h-7">
            <RefreshCw className="h-3 w-3 mr-1" /> Re-analyze
          </Button>
        </div>
      )}
    </div>
  );
};

export default Conflicts;
