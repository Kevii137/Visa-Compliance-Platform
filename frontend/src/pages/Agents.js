import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bot, Play, CheckCircle, Clock, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
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
  { value: 'regulatory_discovery', label: 'Regulatory Discovery', icon: '🔍', color: '#3b82f6' },
  { value: 'policy_mapping', label: 'Policy Mapping', icon: '🗺️', color: '#8b5cf6' },
  { value: 'monitoring_risk', label: 'Monitoring & Risk', icon: '📊', color: '#f59e0b' },
  { value: 'evidence_reporting', label: 'Evidence & Reporting', icon: '📋', color: '#10b981' },
];

const statusStyles = {
  open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const AgentNode = ({ data }) => (
  <div className="agent-node px-4 py-3 rounded-lg min-w-[180px]">
    <div className="flex items-center gap-2">
      <span className="text-xl">{data.icon}</span>
      <div>
        <p className="font-medium text-sm">{data.label}</p>
        <p className="text-xs text-muted-foreground">{data.status}</p>
      </div>
    </div>
  </div>
);

const nodeTypes = { agentNode: AgentNode };

const Agents = () => {
  const { api } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    agent_type: 'regulatory_discovery',
    description: '',
    priority: 1
  });

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
    } catch (error) {
      toast.error('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Build graph from agent types
    const agentNodes = agentTypes.map((agent, i) => ({
      id: agent.value,
      type: 'agentNode',
      position: { x: 100 + (i % 2) * 300, y: 100 + Math.floor(i / 2) * 150 },
      data: { 
        label: agent.label, 
        icon: agent.icon,
        status: tasks.filter(t => t.agent_type === agent.value && t.status !== 'completed').length > 0 
          ? 'Active' 
          : 'Idle'
      }
    }));

    const agentEdges = [
      { id: 'e1', source: 'regulatory_discovery', target: 'policy_mapping', animated: true, type: 'default' },
      { id: 'e2', source: 'policy_mapping', target: 'monitoring_risk', animated: true, type: 'default' },
      { id: 'e3', source: 'monitoring_risk', target: 'evidence_reporting', animated: true, type: 'default' },
      { id: 'e4', source: 'regulatory_discovery', target: 'monitoring_risk', animated: false, type: 'default' },
    ];

    setNodes(agentNodes);
    setEdges(agentEdges);
  }, [tasks, setNodes, setEdges]);

  const handleCreateTask = async () => {
    try {
      await api().post('/agents/tasks', newTask);
      toast.success('Agent task created');
      setDialogOpen(false);
      setNewTask({ agent_type: 'regulatory_discovery', description: '', priority: 1 });
      fetchData();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const getAgentInfo = (type) => agentTypes.find(a => a.value === type) || agentTypes[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Orchestration</h1>
          <p className="text-muted-foreground">Manage and monitor autonomous compliance agents</p>
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Agent Task</DialogTitle>
                <DialogDescription>Dispatch a new task to an autonomous agent</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Agent Type</Label>
                  <Select 
                    value={newTask.agent_type}
                    onValueChange={(v) => setNewTask({ ...newTask, agent_type: v })}
                  >
                    <SelectTrigger data-testid="agent-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agentTypes.map(agent => (
                        <SelectItem key={agent.value} value={agent.value}>
                          <span className="flex items-center gap-2">
                            <span>{agent.icon}</span>
                            {agent.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority (1-5)</Label>
                  <Select 
                    value={String(newTask.priority)}
                    onValueChange={(v) => setNewTask({ ...newTask, priority: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(p => (
                        <SelectItem key={p} value={String(p)}>
                          Priority {p} {p === 1 ? '(Highest)' : p === 5 ? '(Lowest)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Description</Label>
                  <Textarea 
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="e.g., Scan for PCI DSS v4.0 updates"
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

      {/* Agent Graph */}
      <Card className="bg-card border-border/50" data-testid="agent-graph-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            Agent Network
          </CardTitle>
          <CardDescription>Real-time visualization of agent orchestration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] rounded-lg overflow-hidden border border-border/50">
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
              <MiniMap 
                nodeColor={() => '#8b5cf6'} 
                maskColor="rgba(0,0,0,0.8)"
              />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <Card className="bg-card border-border/50" data-testid="active-tasks-card">
          <CardHeader>
            <CardTitle className="text-lg">Active Tasks</CardTitle>
            <CardDescription>Tasks currently being processed by agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.filter(t => t.status !== 'completed').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active tasks</p>
            ) : (
              tasks.filter(t => t.status !== 'completed').map((task, index) => {
                const agentInfo = getAgentInfo(task.agent_type);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{agentInfo.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{agentInfo.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusStyles[task.status]}>
                        {task.status === 'in_progress' ? (
                          <><Clock className="h-3 w-3 mr-1 animate-spin" /> Processing</>
                        ) : (
                          task.status
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Priority: {task.priority}</span>
                      <span>{new Date(task.created_at).toLocaleString()}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border/50" data-testid="agent-activity-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest actions performed by agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            ) : (
              activities.slice(0, 6).map((activity, index) => {
                const agentInfo = getAgentInfo(activity.agent_type);
                return (
                  <motion.div
                    key={activity.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="p-2 rounded-lg glow-accent" style={{ backgroundColor: `${agentInfo.color}20` }}>
                      <CheckCircle className="h-4 w-4" style={{ color: agentInfo.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">
                          {activity.agent_type?.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completed Tasks */}
      <Card className="bg-card border-border/50" data-testid="completed-tasks-card">
        <CardHeader>
          <CardTitle className="text-lg">Completed Tasks</CardTitle>
          <CardDescription>Recently completed agent tasks with results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.filter(t => t.status === 'completed').slice(0, 6).map((task, index) => {
              const agentInfo = getAgentInfo(task.agent_type);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{agentInfo.icon}</span>
                    <span className="font-medium text-sm">{agentInfo.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                  {task.result && (
                    <div className="text-xs">
                      <p className="text-green-400">
                        ✓ {task.result.findings?.length || 0} findings
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Completed: {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'N/A'}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Agents;
