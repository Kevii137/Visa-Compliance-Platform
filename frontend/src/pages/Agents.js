import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Bot, Play, CheckCircle, Clock, AlertCircle, Zap, RefreshCw,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, FileText, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const agentTypes = [
  { value: 'regulatory_discovery', label: 'Regulatory Discovery', icon: '🔍', color: '#3b82f6', desc: 'Ingestor — monitors regulatory bodies for updates' },
  { value: 'policy_mapping', label: 'Policy Mapping', icon: '🗺️', color: '#8b5cf6', desc: 'Interpreter — maps regulations to machine-readable controls' },
  { value: 'monitoring_risk', label: 'Monitoring & Risk', icon: '📊', color: '#f59e0b', desc: 'Auditor — scans transactions and data flows in real time' },
  { value: 'evidence_reporting', label: 'Evidence & Reporting', icon: '📋', color: '#10b981', desc: 'Remediation Planner — creates step-by-step resolution plans' },
];

const statusStyles = {
  open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  awaiting_approval: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  denied: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const AgentNode = ({ data }) => (
  <div
    className="px-4 py-3 rounded-lg min-w-[180px] border"
    style={{ backgroundColor: `${data.color}15`, borderColor: `${data.color}40` }}
  >
    <div className="flex items-center gap-2">
      <span className="text-xl">{data.icon}</span>
      <div>
        <p className="font-semibold text-sm">{data.label}</p>
        <p className="text-xs" style={{ color: data.color }}>{data.status}</p>
      </div>
    </div>
  </div>
);

const nodeTypes = { agentNode: AgentNode };

const TaskResultView = ({ result }) => {
  if (!result) return null;
  const findings = result.findings || [];
  const recommendations = result.recommendations || [];
  const gaps = result.gaps || [];
  const riskSignals = result.risk_signals || [];
  const crossCorrelations = result.cross_domain_correlations || [];
  const regulatoryUpdates = result.regulatory_updates || [];
  const remediationPlan = result.remediation_plan || [];

  return (
    <div className="mt-3 space-y-3 text-xs">
      {result.confidence_score !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Confidence:</span>
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${result.confidence_score}%` }} />
          </div>
          <span className="font-mono">{result.confidence_score}%</span>
        </div>
      )}
      {findings.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Findings ({findings.length})</p>
          <div className="space-y-1">
            {findings.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-foreground/80">
                <span className="text-primary mt-0.5 shrink-0">›</span>
                <span>{typeof f === 'string' ? f : f.description || JSON.stringify(f)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {gaps.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Gaps ({gaps.length})</p>
          <div className="space-y-1">
            {gaps.slice(0, 3).map((g, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5 shrink-0">!</span>
                <span className="text-foreground/80">{typeof g === 'string' ? g : `${g.framework || ''}: ${g.gap_description || g.gap || JSON.stringify(g)}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {riskSignals.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Risk Signals</p>
          <div className="space-y-1">
            {riskSignals.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-orange-300">
                <span className="mt-0.5 shrink-0">⚡</span>
                <span>[{s.type}] {s.signal} — {s.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {crossCorrelations.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cross-Domain Correlations</p>
          {crossCorrelations.slice(0, 2).map((c, i) => (
            <div key={i} className="text-yellow-300">⟺ {typeof c === 'string' ? c : c.combined_risk || JSON.stringify(c)}</div>
          ))}
        </div>
      )}
      {regulatoryUpdates.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Regulatory Updates</p>
          {regulatoryUpdates.slice(0, 3).map((u, i) => (
            <div key={i} className="text-blue-300">📋 {u.regulation}: {u.change} ({u.impact} impact)</div>
          ))}
        </div>
      )}
      {remediationPlan.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Remediation Plan</p>
          {remediationPlan.slice(0, 3).map((step, i) => (
            <div key={i} className="text-green-300">Step {step.step}: {step.action}</div>
          ))}
        </div>
      )}
      {recommendations.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recommendations</p>
          <div className="space-y-1">
            {recommendations.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-green-400">
                <span className="mt-0.5 shrink-0">✓</span>
                <span>{typeof r === 'string' ? r : JSON.stringify(r)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TaskCard = ({ task, onHITL, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [hitlLoading, setHitlLoading] = useState(false);
  const { api } = useAuth();
  const agentInfo = agentTypes.find(a => a.value === task.agent_type) || agentTypes[0];

  const handleHITL = async (decision) => {
    setHitlLoading(true);
    try {
      await api().put(`/agents/tasks/${task.id}/hitl`, {
        decision,
        reason: `Manual ${decision} by compliance officer`
      });
      toast.success(`Task ${decision === 'approve' ? 'approved' : 'denied'}`);
      onRefresh();
    } catch {
      toast.error('HITL action failed');
    } finally {
      setHitlLoading(false);
    }
  };

  const isCompleted = task.status === 'completed';
  const needsApproval = task.status === 'awaiting_approval';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`bg-card border-border/50 ${needsApproval ? 'border-purple-500/40 bg-purple-500/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{agentInfo.icon}</span>
              <div>
                <p className="font-medium text-sm">{agentInfo.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusStyles[task.status] || statusStyles.open}>
                {task.status === 'in_progress' ? (
                  <><Clock className="h-3 w-3 mr-1 animate-spin" /> Processing</>
                ) : task.status}
              </Badge>
              {isCompleted && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* HITL Approval Panel */}
          {needsApproval && (
            <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="text-xs font-semibold text-purple-300 mb-2">⚠ Human-in-the-Loop Approval Required</p>
              <p className="text-xs text-muted-foreground mb-3">This high-risk action requires manual approval before execution.</p>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleHITL('approve')} disabled={hitlLoading}>
                  {hitlLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
                  Approve
                </Button>
                <Button size="sm" variant="destructive" className="h-7" onClick={() => handleHITL('deny')} disabled={hitlLoading}>
                  {hitlLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsDown className="h-3 w-3 mr-1" />}
                  Deny
                </Button>
              </div>
            </div>
          )}

          {/* Task Result */}
          <AnimatePresence>
            {expanded && task.result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Separator className="my-3" />
                <ScrollArea className="max-h-64">
                  <TaskResultView result={task.result} />
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Priority {task.priority}</span>
            <span>
              {isCompleted && task.completed_at
                ? `Completed ${new Date(task.completed_at).toLocaleTimeString()}`
                : new Date(task.created_at).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Agents = () => {
  const { api } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ agent_type: 'regulatory_discovery', description: '', priority: 1 });
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, activityRes] = await Promise.all([
        api().get('/agents/tasks'),
        api().get('/agents/activity')
      ]);
      setTasks(tasksRes.data);
      setActivities(activityRes.data.activities);
    } catch {
      toast.error('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const agentNodes = agentTypes.map((agent, i) => ({
      id: agent.value,
      type: 'agentNode',
      position: { x: 80 + (i % 2) * 320, y: 60 + Math.floor(i / 2) * 160 },
      data: {
        label: agent.label,
        icon: agent.icon,
        color: agent.color,
        status: tasks.filter(t => t.agent_type === agent.value && t.status === 'in_progress').length > 0
          ? 'Active'
          : tasks.filter(t => t.agent_type === agent.value && t.status === 'awaiting_approval').length > 0
            ? '⚠ Awaiting Approval'
            : 'Idle',
      },
    }));
    setNodes(agentNodes);
    setEdges([
      { id: 'e1', source: 'regulatory_discovery', target: 'policy_mapping', animated: true, style: { stroke: '#3b82f6' } },
      { id: 'e2', source: 'policy_mapping', target: 'monitoring_risk', animated: true, style: { stroke: '#8b5cf6' } },
      { id: 'e3', source: 'monitoring_risk', target: 'evidence_reporting', animated: true, style: { stroke: '#f59e0b' } },
      { id: 'e4', source: 'regulatory_discovery', target: 'monitoring_risk', animated: false, style: { stroke: '#3b82f650', strokeDasharray: '4' } },
    ]);
  }, [tasks, setNodes, setEdges]);

  const handleCreateTask = async () => {
    if (!newTask.description.trim()) {
      toast.error('Please enter a task description');
      return;
    }
    try {
      await api().post('/agents/tasks', newTask);
      toast.success('Agent task dispatched');
      setDialogOpen(false);
      setNewTask({ agent_type: 'regulatory_discovery', description: '', priority: 1 });
      setTimeout(fetchData, 500);
    } catch {
      toast.error('Failed to create task');
    }
  };

  const activeTasks = tasks.filter(t => !['completed', 'denied'].includes(t.status));
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingApproval = tasks.filter(t => t.status === 'awaiting_approval');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Orchestration</h1>
          <p className="text-muted-foreground">Autonomous compliance agents — Manager-Worker pattern with HITL governance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} data-testid="refresh-agents-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-task-btn">
                <Play className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Dispatch Agent Task</DialogTitle>
                <DialogDescription>Create a new autonomous agent task for compliance analysis</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Agent Type</Label>
                  <Select value={newTask.agent_type} onValueChange={v => setNewTask({ ...newTask, agent_type: v })}>
                    <SelectTrigger data-testid="agent-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agentTypes.map(agent => (
                        <SelectItem key={agent.value} value={agent.value}>
                          <div>
                            <span className="flex items-center gap-2">
                              <span>{agent.icon}</span>
                              <span>{agent.label}</span>
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5 ml-6">{agent.desc}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority (1 = Highest)</Label>
                  <Select value={String(newTask.priority)} onValueChange={v => setNewTask({ ...newTask, priority: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(p => (
                        <SelectItem key={p} value={String(p)}>Priority {p} {p === 1 ? '— Highest' : p === 5 ? '— Lowest' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="e.g., Scan for PCI DSS v4.0 updates and map to current controls"
                    rows={3}
                    data-testid="task-description-input"
                  />
                </div>
                <Button onClick={handleCreateTask} className="w-full" data-testid="submit-task-btn">
                  <Zap className="h-4 w-4 mr-2" />
                  Dispatch Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* HITL Alert Banner */}
      {pendingApproval.length > 0 && (
        <Card className="bg-purple-500/10 border-purple-500/40">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-purple-400 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-purple-300">{pendingApproval.length} task{pendingApproval.length > 1 ? 's' : ''} awaiting Human-in-the-Loop approval.</span>
              {' '}Review and approve or deny below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Agent Network Graph */}
      <Card className="bg-card border-border/50" data-testid="agent-graph-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            Agent Network — Modular Agentic Architecture
          </CardTitle>
          <CardDescription>Real-time orchestration flow: Ingestor → Interpreter → Auditor → Remediation Planner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] rounded-lg overflow-hidden border border-border/50">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#27272a" gap={20} />
              <Controls />
              <MiniMap nodeColor={n => n.data?.color || '#8b5cf6'} maskColor="rgba(0,0,0,0.8)" />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active & Pending Tasks */}
        <Card className="bg-card border-border/50" data-testid="active-tasks-card">
          <CardHeader>
            <CardTitle className="text-lg">Active Tasks</CardTitle>
            <CardDescription>Tasks currently being processed or awaiting approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No active tasks — dispatch one above</p>
            ) : (
              activeTasks.map(task => (
                <TaskCard key={task.id} task={task} onRefresh={fetchData} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border/50" data-testid="agent-activity-card">
          <CardHeader>
            <CardTitle className="text-lg">Agent Activity Log</CardTitle>
            <CardDescription>Audit trail of all agent actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No activity yet</p>
            ) : (
              activities.slice(0, 8).map((activity, index) => {
                const agentInfo = agentTypes.find(a => a.value === activity.agent_type) || agentTypes[0];
                return (
                  <motion.div
                    key={activity.id || index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: `${agentInfo.color}20` }}>
                      <CheckCircle className="h-4 w-4" style={{ color: agentInfo.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1">{activity.action}</p>
                      {activity.result_summary && (
                        <p className="text-xs text-muted-foreground">{activity.result_summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{activity.agent_type?.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground">· {new Date(activity.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completed Tasks with Full Results */}
      {completedTasks.length > 0 && (
        <Card className="bg-card border-border/50" data-testid="completed-tasks-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Completed Tasks — AI Analysis Results
            </CardTitle>
            <CardDescription>Expand each task to view detailed agent findings and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedTasks.slice(0, 8).map(task => (
                <TaskCard key={task.id} task={task} onRefresh={fetchData} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Agents;
