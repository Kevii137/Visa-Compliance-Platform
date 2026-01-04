import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  AlertTriangle, Plus, Clock, CheckCircle, 
  AlertCircle, ArrowRight, Shield, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const severityStyles = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const statusStyles = {
  open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  verified: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  closed: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const Incidents = () => {
  const { api } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
    framework: 'PCI_DSS',
    affected_systems: ''
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await api().get('/incidents');
      setIncidents(response.data);
    } catch (error) {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    try {
      const payload = {
        ...newIncident,
        affected_systems: newIncident.affected_systems.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api().post('/incidents', payload);
      toast.success('Incident created successfully');
      setDialogOpen(false);
      setNewIncident({ title: '', description: '', severity: 'medium', framework: 'PCI_DSS', affected_systems: '' });
      fetchIncidents();
    } catch (error) {
      toast.error('Failed to create incident');
    }
  };

  const handleUpdateStatus = async (incidentId, newStatus) => {
    try {
      await api().put(`/incidents/${incidentId}/status`, { status: newStatus });
      toast.success('Status updated');
      fetchIncidents();
      setSelectedIncident(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const statusFlow = ['open', 'in_progress', 'verified', 'closed'];

  const getNextStatus = (current) => {
    const idx = statusFlow.indexOf(current);
    return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <AlertCircle className="h-5 w-5 text-red-400" />;
    if (severity === 'high') return <AlertTriangle className="h-5 w-5 text-orange-400" />;
    return <Shield className="h-5 w-5 text-yellow-400" />;
  };

  // Stats
  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    critical: incidents.filter(i => i.severity === 'critical').length
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
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">Manage compliance incidents and remediation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-incident-btn">
              <Plus className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>Document a compliance incident for tracking and remediation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="Brief incident title"
                  data-testid="incident-title-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select 
                    value={newIncident.severity}
                    onValueChange={(v) => setNewIncident({ ...newIncident, severity: v })}
                  >
                    <SelectTrigger data-testid="incident-severity-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Framework</Label>
                  <Select 
                    value={newIncident.framework}
                    onValueChange={(v) => setNewIncident({ ...newIncident, framework: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['PCI_DSS', 'GDPR', 'CCPA', 'LGPD', 'AML_KYC'].map(f => (
                        <SelectItem key={f} value={f}>{f.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Affected Systems (comma-separated)</Label>
                <Input 
                  value={newIncident.affected_systems}
                  onChange={(e) => setNewIncident({ ...newIncident, affected_systems: e.target.value })}
                  placeholder="e.g., Payment Gateway, Customer DB"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Detailed description of the incident"
                  rows={4}
                  data-testid="incident-description-input"
                />
              </div>
              <Button onClick={handleCreateIncident} className="w-full" data-testid="save-incident-btn">
                Create Incident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50" data-testid="total-incidents-stat">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50" data-testid="open-incidents-stat">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Open Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50" data-testid="critical-incidents-stat">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">Critical Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((incident, index) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setSelectedIncident(incident)}
              data-testid={`incident-card-${incident.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {getSeverityIcon(incident.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {incident.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={severityStyles[incident.severity]}>
                          {incident.severity}
                        </Badge>
                        <Badge variant="outline" className={statusStyles[incident.status]}>
                          {incident.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span className="font-mono">{incident.framework.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{incident.affected_systems?.length || 0} systems affected</span>
                      <span>•</span>
                      <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl">
          {selectedIncident && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getSeverityIcon(selectedIncident.severity)}
                  <div>
                    <DialogTitle>{selectedIncident.title}</DialogTitle>
                    <DialogDescription>
                      {selectedIncident.framework.replace('_', ' ')} • {new Date(selectedIncident.created_at).toLocaleString()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={severityStyles[selectedIncident.severity]}>
                    {selectedIncident.severity}
                  </Badge>
                  <Badge variant="outline" className={statusStyles[selectedIncident.status]}>
                    {selectedIncident.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedIncident.description}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Affected Systems</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncident.affected_systems?.map((sys, i) => (
                      <Badge key={i} variant="secondary">{sys}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Suggested Remediation</h4>
                  <p className="text-muted-foreground">{selectedIncident.suggested_remediation}</p>
                </div>

                {/* Status Flow */}
                <div>
                  <h4 className="font-medium mb-3">Status Workflow</h4>
                  <div className="flex items-center gap-2">
                    {statusFlow.map((status, i) => (
                      <React.Fragment key={status}>
                        <div 
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedIncident.status === status 
                              ? statusStyles[status]
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </div>
                        {i < statusFlow.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {getNextStatus(selectedIncident.status) && (
                  <Button 
                    className="w-full"
                    onClick={() => handleUpdateStatus(selectedIncident.id, getNextStatus(selectedIncident.status))}
                    data-testid="advance-status-btn"
                  >
                    Move to {getNextStatus(selectedIncident.status).replace('_', ' ')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Incidents;
