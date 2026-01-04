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
import { BookOpen, Search, Plus, FileText, ExternalLink, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const frameworkColors = {
  'PCI_DSS': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'GDPR': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'CCPA': 'bg-green-500/20 text-green-400 border-green-500/50',
  'LGPD': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'AML_KYC': 'bg-red-500/20 text-red-400 border-red-500/50'
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
    source_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [regsRes, docsRes] = await Promise.all([
        api().get('/regulations'),
        api().get('/documents')
      ]);
      setRegulations(regsRes.data);
      setDocuments(docsRes.data.documents);
    } catch (error) {
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
    } catch (error) {
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
      await api().post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to upload document');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await api().post('/regulations/search', { query: searchQuery });
      setRegulations(response.data.results);
    } catch (error) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            <Input 
              type="file" 
              className="hidden" 
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
            />
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
                <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors h-full" data-testid={`regulation-card-${reg.id}`}>
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
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Version {reg.version}</span>
                      <span>{reg.sections?.length || 0} sections</span>
                    </div>
                    {reg.source_url && (
                      <Button variant="link" size="sm" className="p-0 mt-2" asChild>
                        <a href={reg.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Source
                        </a>
                      </Button>
                    )}
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
                  <Badge variant="outline" className={doc.status === 'processed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
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
