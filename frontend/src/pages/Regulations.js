import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  BookOpen, Search, Plus, FileText, ExternalLink, Upload,
  Cpu, Loader2, Layers, ChevronDown, ChevronUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const frameworkColors = {
  PCI_DSS: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  GDPR: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  CCPA: 'bg-green-500/20 text-green-400 border-green-500/50',
  LGPD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  AML_KYC: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const priorityStyle = {
  high: 'bg-red-500/10 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const AtomicRequirementRow = ({ req, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-border/50 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="p-1 rounded bg-primary/10 shrink-0">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{req.requirement_id || `REQ-${index + 1}`}</p>
          <p className="text-xs text-muted-foreground truncate">{req.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${priorityStyle[req.priority] || priorityStyle.medium}`}>
            {req.priority || 'medium'}
          </Badge>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-card/50">
              {req.category && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium uppercase tracking-wide">Category</span>
                  <Badge variant="outline" className="text-xs">{req.category}</Badge>
                </div>
              )}
              {req.control_objective && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Control Objective</p>
                  <p className="text-sm">{req.control_objective}</p>
                </div>
              )}
              {req.evidence_required?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Evidence Required</p>
                  <div className="flex flex-wrap gap-1.5">
                    {req.evidence_required.map((e, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {req.test_procedure && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Test Procedure</p>
                  <p className="text-sm text-muted-foreground">{req.test_procedure}</p>
                </div>
              )}
              {req.risk_if_not_met && (
                <div className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{req.risk_if_not_met}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AtomicRequirementsDialog = ({ regulation, api }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);

  const loadCached = async () => {
    setLoading(true);
    try {
      const res = await api().get(`/regulations/${regulation.id}/atomic-requirements`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const runDecompose = async () => {
    setDecomposing(true);
    try {
      const res = await api().post(`/regulations/${regulation.id}/decompose`);
      setData(res.data);
      toast.success('Decomposition complete');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Decomposition failed');
    } finally {
      setDecomposing(false);
    }
  };

  const handleOpen = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && !data) loadCached();
  };

  const requirements = data?.atomic_requirements || [];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2 w-full" data-testid={`decompose-btn-${regulation.id}`}>
          <Cpu className="h-3.5 w-3.5 mr-1.5" />
          Atomic Requirements
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />
            Atomic Requirements — {regulation.name}
          </DialogTitle>
          <DialogDescription>
            LLM-decomposed machine-readable requirements for automated compliance testing
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">{requirements.length} requirements</span>
          <Button size="sm" variant="outline" onClick={runDecompose} disabled={decomposing}>
            {decomposing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5 mr-1.5" />}
            {decomposing ? 'Decomposing…' : 'Re-decompose'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : requirements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Layers className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium mb-1">No Decomposition Yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click <strong>Re-decompose</strong> to let the AI break down this regulation
                  into machine-readable atomic requirements.
                </p>
              </div>
              <Button onClick={runDecompose} disabled={decomposing}>
                {decomposing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cpu className="h-4 w-4 mr-2" />}
                Decompose Now
              </Button>
            </div>
          ) : (
            requirements.map((req, i) => (
              <AtomicRequirementRow key={req.requirement_id || i} req={req} index={i} />
            ))
          )}
        </div>

        {data?.decomposed_at && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
            Last decomposed: {new Date(data.decomposed_at).toLocaleString()}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Regulations = () => {
  const { api } = useAuth();
  const [regulations, setRegulations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFramework, setActiveFramework] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRegulation, setNewRegulation] = useState({
    name: '',
    framework: 'PCI_DSS',
    description: '',
    version: '1.0',
    source_url: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [regsRes, docsRes] = await Promise.all([
        api().get('/regulations'),
        api().get('/documents'),
      ]);
      setRegulations(regsRes.data);
      setDocuments(docsRes.data.documents);
    } catch {
      toast.error('Failed to load regulations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegulation = async () => {
    try {
      await api().post('/regulations', newRegulation);
      toast.success('Regulation added successfully');
      setDialogOpen(false);
      setNewRegulation({ name: '', framework: 'PCI_DSS', description: '', version: '1.0', source_url: '' });
      fetchData();
    } catch {
      toast.error('Failed to create regulation');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('framework', activeFramework === 'all' ? 'PCI_DSS' : activeFramework);
    try {
      await api().post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded successfully');
      fetchData();
    } catch {
      toast.error('Failed to upload document');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await api().post('/regulations/search', { query: searchQuery });
      setRegulations(response.data.results);
    } catch {
      toast.error('Search failed');
    }
  };

  const filteredRegulations = activeFramework === 'all'
    ? regulations
    : regulations.filter(r => r.framework === activeFramework);

  const frameworks = ['all', 'PCI_DSS', 'GDPR', 'CCPA', 'LGPD', 'AML_KYC'];

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
          <h1 className="text-3xl font-bold tracking-tight">Regulatory Library</h1>
          <p className="text-muted-foreground">Browse and manage compliance regulations and documents</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
            <Button variant="outline" asChild>
              <span><Upload className="h-4 w-4 mr-2" />Upload Document</span>
            </Button>
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-regulation-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Regulation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Regulation</DialogTitle>
                <DialogDescription>Add a new regulatory framework or policy to your library</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newRegulation.name}
                    onChange={(e) => setNewRegulation({ ...newRegulation, name: e.target.value })}
                    placeholder="e.g., PCI DSS v4.0.1"
                    data-testid="regulation-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Framework</Label>
                  <Select
                    value={newRegulation.framework}
                    onValueChange={(v) => setNewRegulation({ ...newRegulation, framework: v })}
                  >
                    <SelectTrigger data-testid="regulation-framework-select">
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
                  <Label>Version</Label>
                  <Input
                    value={newRegulation.version}
                    onChange={(e) => setNewRegulation({ ...newRegulation, version: e.target.value })}
                    placeholder="e.g., 4.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newRegulation.description}
                    onChange={(e) => setNewRegulation({ ...newRegulation, description: e.target.value })}
                    placeholder="Brief description of the regulation"
                    data-testid="regulation-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source URL (optional)</Label>
                  <Input
                    value={newRegulation.source_url}
                    onChange={(e) => setNewRegulation({ ...newRegulation, source_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleCreateRegulation} className="w-full" data-testid="save-regulation-btn">
                  Add Regulation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search regulations, requirements, controls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
                data-testid="search-regulations-input"
              />
            </div>
            <Button onClick={handleSearch} data-testid="search-btn">Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Framework Tabs */}
      <Tabs value={activeFramework} onValueChange={setActiveFramework}>
        <TabsList className="bg-muted/50">
          {frameworks.map(fw => (
            <TabsTrigger key={fw} value={fw} className="capitalize" data-testid={`tab-${fw}`}>
              {fw === 'all' ? 'All' : fw.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeFramework} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegulations.map((reg, index) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="bg-card border-border/50 hover:border-primary/30 transition-colors h-full"
                  data-testid={`regulation-card-${reg.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline" className={frameworkColors[reg.framework]}>
                        {reg.framework.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{reg.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{reg.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>Version {reg.version}</span>
                      <span>{reg.sections?.length || 0} sections</span>
                    </div>
                    {reg.source_url && (
                      <Button variant="link" size="sm" className="p-0 mb-2" asChild>
                        <a href={reg.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Source
                        </a>
                      </Button>
                    )}
                    <AtomicRequirementsDialog regulation={reg} api={api} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Documents</CardTitle>
            <CardDescription>Documents processed for RAG analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.size / 1024).toFixed(1)} KB • {doc.framework}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={doc.status === 'processed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Regulations;
