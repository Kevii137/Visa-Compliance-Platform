import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { 
  FileText, Download, Plus, Clock, CheckCircle, 
  AlertTriangle, Loader2, Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const Evidence = () => {
  const { api } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [newPackage, setNewPackage] = useState({
    framework: 'PCI_DSS',
    period: 'Q4 2024'
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api().get('/evidence/packages');
      setPackages(response.data.packages);
    } catch (error) {
      toast.error('Failed to load evidence packages');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePackage = async () => {
    setGenerating(true);
    try {
      const response = await api().post('/evidence/generate', newPackage);
      toast.success('Evidence package generation started');
      setDialogOpen(false);
      
      // Poll for completion
      const packageId = response.data.package_id;
      const pollInterval = setInterval(async () => {
        const pkg = await api().get(`/evidence/packages/${packageId}`);
        if (pkg.data.status === 'completed') {
          clearInterval(pollInterval);
          toast.success('Evidence package ready');
          fetchPackages();
        }
      }, 2000);
      
      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);
    } catch (error) {
      toast.error('Failed to generate package');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (pkg) => {
    // Create a JSON download
    const dataStr = JSON.stringify(pkg, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${pkg.framework}-${pkg.period.replace(' ', '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Evidence package downloaded');
  };

  const frameworks = ['PCI_DSS', 'GDPR', 'CCPA', 'LGPD', 'AML_KYC'];
  const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'FY 2024'];

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
          <h1 className="text-3xl font-bold tracking-tight">Evidence & Reports</h1>
          <p className="text-muted-foreground">Generate audit-ready evidence packages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="generate-evidence-btn">
              <Plus className="h-4 w-4 mr-2" />
              Generate Package
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Evidence Package</DialogTitle>
              <DialogDescription>
                Create an audit-ready evidence package for a specific framework and period
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Framework</Label>
                <Select 
                  value={newPackage.framework}
                  onValueChange={(v) => setNewPackage({ ...newPackage, framework: v })}
                >
                  <SelectTrigger data-testid="evidence-framework-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map(f => (
                      <SelectItem key={f} value={f}>{f.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select 
                  value={newPackage.period}
                  onValueChange={(v) => setNewPackage({ ...newPackage, period: v })}
                >
                  <SelectTrigger data-testid="evidence-period-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleGeneratePackage} 
                className="w-full" 
                disabled={generating}
                data-testid="submit-generate-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Generate Package
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No evidence packages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate your first audit-ready evidence package
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedPackage(pkg)}
                data-testid={`evidence-card-${pkg.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <Badge 
                      variant="outline" 
                      className={pkg.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                      }
                    >
                      {pkg.status === 'completed' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Ready</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-1 animate-spin" /> Generating</>
                      )}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{pkg.framework.replace('_', ' ')}</CardTitle>
                  <CardDescription>{pkg.period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Controls</span>
                      <span className="font-mono">{pkg.controls?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evidence Items</span>
                      <span className="font-mono">{pkg.evidence?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Findings</span>
                      <span className="font-mono">{pkg.findings?.length || 0}</span>
                    </div>
                  </div>
                  {pkg.status === 'completed' && (
                    <Button 
                      size="sm" 
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(pkg);
                      }}
                      data-testid={`download-btn-${pkg.id}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Package Detail Dialog */}
      <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedPackage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedPackage.framework.replace('_', ' ')} Evidence Package
                </DialogTitle>
                <DialogDescription>
                  {selectedPackage.period} • Created {new Date(selectedPackage.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Controls Summary */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Controls ({selectedPackage.controls?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPackage.controls?.slice(0, 10).map((control, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{control.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {control.effectiveness?.toFixed(0)}% effective
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Items */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Evidence Items ({selectedPackage.evidence?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPackage.evidence?.slice(0, 10).map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center justify-between">
                          <span>{item.control_name}</span>
                          <span className="text-xs text-muted-foreground">{item.evidence_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Findings */}
                {selectedPackage.findings?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      Findings ({selectedPackage.findings?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {selectedPackage.findings?.map((finding, i) => (
                        <div key={i} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                          <div className="flex items-start justify-between">
                            <span>{finding.description}</span>
                            <Badge variant="outline" className={`severity-${finding.severity}`}>
                              {finding.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full"
                  onClick={() => handleDownload(selectedPackage)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Package
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Evidence;
