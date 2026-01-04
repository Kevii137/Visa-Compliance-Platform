import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Shield, Plus, CheckCircle, AlertCircle, Clock, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const frameworkColors = {
  'PCI_DSS': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'GDPR': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'CCPA': 'bg-green-500/20 text-green-400 border-green-500/50',
  'LGPD': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'AML_KYC': 'bg-red-500/20 text-red-400 border-red-500/50'
};

const Controls = () => {
  const { api } = useAuth();
  const [controls, setControls] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [activeFramework, setActiveFramework] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newControl, setNewControl] = useState({
    name: '',
    description: '',
    framework: 'PCI_DSS',
    regulation_id: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [controlsRes, regsRes] = await Promise.all([
        api().get('/controls'),
        api().get('/regulations')
      ]);
      setControls(controlsRes.data);
      setRegulations(regsRes.data);
    } catch (error) {
      toast.error('Failed to load controls');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateControl = async () => {
    try {
      await api().post('/controls', newControl);
      toast.success('Control added successfully');
      setDialogOpen(false);
      setNewControl({ name: '', description: '', framework: 'PCI_DSS', regulation_id: '', status: 'active' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create control');
    }
  };

  const filteredControls = activeFramework === 'all'
    ? controls
    : controls.filter(c => c.framework === activeFramework);

  const frameworks = ['all', 'PCI_DSS', 'GDPR', 'CCPA', 'LGPD', 'AML_KYC'];

  const getStatusIcon = (status) => {
    if (status === 'active') return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-400" />;
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  };

  const getEffectivenessColor = (eff) => {
    if (eff >= 80) return 'text-green-400';
    if (eff >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Calculate stats
  const stats = {
    total: controls.length,
    active: controls.filter(c => c.status === 'active').length,
    avgEffectiveness: controls.length > 0 
      ? (controls.reduce((sum, c) => sum + (c.effectiveness || 0), 0) / controls.length).toFixed(1)
      : 0
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Security Controls</h1>
          <p className="text-muted-foreground">Manage and monitor compliance controls across frameworks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-control-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Control
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Control</DialogTitle>
              <DialogDescription>Create a new security control mapping</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Control Name</Label>
                <Input 
                  value={newControl.name}
                  onChange={(e) => setNewControl({ ...newControl, name: e.target.value })}
                  placeholder="e.g., Data Encryption at Rest"
                  data-testid="control-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Framework</Label>
                <Select 
                  value={newControl.framework}
                  onValueChange={(v) => setNewControl({ ...newControl, framework: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.filter(f => f !== 'all').map(f => (
                      <SelectItem key={f} value={f}>{f.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Regulation</Label>
                <Select 
                  value={newControl.regulation_id}
                  onValueChange={(v) => setNewControl({ ...newControl, regulation_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select regulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {regulations.map(reg => (
                      <SelectItem key={reg.id} value={reg.id}>{reg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={newControl.description}
                  onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                  placeholder="Control description and implementation details"
                  data-testid="control-description-input"
                />
              </div>
              <Button onClick={handleCreateControl} className="w-full" data-testid="save-control-btn">
                Add Control
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50" data-testid="total-controls-stat">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Controls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50" data-testid="active-controls-stat">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Controls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50" data-testid="effectiveness-stat">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Filter className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.avgEffectiveness}%</p>
                <p className="text-sm text-muted-foreground">Avg Effectiveness</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Framework Tabs */}
      <Tabs value={activeFramework} onValueChange={setActiveFramework}>
        <TabsList className="bg-muted/50">
          {frameworks.map(fw => (
            <TabsTrigger key={fw} value={fw} className="capitalize" data-testid={`controls-tab-${fw}`}>
              {fw === 'all' ? 'All' : fw.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeFramework} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredControls.map((control, index) => (
              <motion.div
                key={control.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors" data-testid={`control-card-${control.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(control.status)}
                        <CardTitle className="text-base">{control.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className={frameworkColors[control.framework]}>
                        {control.framework.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 mt-2">{control.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Effectiveness</span>
                        <span className={`font-mono font-bold ${getEffectivenessColor(control.effectiveness)}`}>
                          {control.effectiveness?.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={control.effectiveness} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize">Status: {control.status}</span>
                        <span>{new Date(control.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Controls;
