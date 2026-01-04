import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Activity, AlertTriangle, TrendingUp, Upload, 
  Database, FileJson, BarChart3, Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ResponsiveContainer, Tooltip, Cell,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis
} from 'recharts';

const riskColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

const Monitoring = () => {
  const { api } = useAuth();
  const [heatmapData, setHeatmapData] = useState([]);
  const [monitoringData, setMonitoringData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [heatmapRes, dataRes] = await Promise.all([
        api().get('/risk/heatmap'),
        api().get('/monitoring/data?limit=50')
      ]);
      setHeatmapData(heatmapRes.data.heatmap);
      setMonitoringData(dataRes.data.data);
    } catch (error) {
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestSample = async () => {
    const sampleData = {
      type: 'transaction',
      records: [
        { transaction_id: `TXN-${Date.now()}`, amount: 1500.00, currency: 'USD', card_last_four: '4242', status: 'completed' },
        { transaction_id: `TXN-${Date.now()+1}`, amount: 3200.50, currency: 'EUR', card_last_four: '1234', status: 'pending' },
        { transaction_id: `TXN-${Date.now()+2}`, amount: 750.00, currency: 'USD', card_last_four: '5678', status: 'completed' },
      ]
    };

    try {
      await api().post('/monitoring/ingest', sampleData);
      toast.success('Sample data ingested successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to ingest data');
    }
  };

  // Transform heatmap data for scatter chart
  const businessUnits = [...new Set(heatmapData.map(d => d.business_unit))];
  const frameworks = [...new Set(heatmapData.map(d => d.framework))];
  
  const scatterData = heatmapData.map(d => ({
    x: businessUnits.indexOf(d.business_unit),
    y: frameworks.indexOf(d.framework),
    z: d.risk_level * 100,
    risk_level: d.risk_level,
    issues: d.issues,
    business_unit: d.business_unit,
    framework: d.framework
  }));

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
          <h1 className="text-3xl font-bold tracking-tight">Monitoring & Risk Analytics</h1>
          <p className="text-muted-foreground">Real-time data monitoring and risk detection</p>
        </div>
        <Button onClick={handleIngestSample} data-testid="ingest-sample-btn">
          <Upload className="h-4 w-4 mr-2" />
          Ingest Sample Data
        </Button>
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="heatmap" data-testid="tab-heatmap">
            <BarChart3 className="h-4 w-4 mr-2" />
            Risk Heatmap
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            <Database className="h-4 w-4 mr-2" />
            Monitoring Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="mt-6 space-y-6">
          {/* Risk Heatmap */}
          <Card className="bg-card border-border/50" data-testid="risk-heatmap-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Risk Heatmap by Business Unit & Framework
              </CardTitle>
              <CardDescription>
                Bubble size indicates risk level (1-4), color indicates severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 100 }}>
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Business Unit"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(val) => businessUnits[val] || ''}
                    domain={[-0.5, businessUnits.length - 0.5]}
                    ticks={businessUnits.map((_, i) => i)}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Framework"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(val) => frameworks[val]?.replace('_', ' ') || ''}
                    domain={[-0.5, frameworks.length - 0.5]}
                    ticks={frameworks.map((_, i) => i)}
                  />
                  <ZAxis type="number" dataKey="z" range={[100, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black/90 border border-white/10 rounded-lg p-3 text-sm">
                          <p className="font-bold">{data.business_unit}</p>
                          <p className="text-muted-foreground">{data.framework?.replace('_', ' ')}</p>
                          <p className="mt-2">Risk Level: <span className="font-mono">{data.risk_level}/4</span></p>
                          <p>Open Issues: <span className="font-mono">{data.issues}</span></p>
                        </div>
                      );
                    }}
                  />
                  <Scatter name="Risk" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={riskColors[entry.risk_level - 1]} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4">
                {['Low', 'Medium', 'High', 'Critical'].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: riskColors[i] }}
                    />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {heatmapData.slice(0, 8).map((item, index) => (
              <motion.div
                key={`${item.business_unit}-${item.framework}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`bg-card border-border/50 border-l-4`} style={{ borderLeftColor: riskColors[item.risk_level - 1] }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.business_unit}</p>
                        <p className="text-xs text-muted-foreground">{item.framework.replace('_', ' ')}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`severity-${['low', 'medium', 'high', 'critical'][item.risk_level - 1]}`}
                      >
                        {['Low', 'Medium', 'High', 'Critical'][item.risk_level - 1]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.issues} open issues</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card className="bg-card border-border/50" data-testid="monitoring-data-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Ingested Monitoring Data
              </CardTitle>
              <CardDescription>Recent transaction and log data ingested for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringData.length === 0 ? (
                <div className="text-center py-12">
                  <FileJson className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No monitoring data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Ingest Sample Data" to add test data
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monitoringData.map((record, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Info className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono text-sm">{record.transaction_id || record.id}</p>
                            <p className="text-xs text-muted-foreground capitalize">{record.data_type}</p>
                          </div>
                        </div>
                        {record.amount && (
                          <span className="font-mono font-bold">
                            {record.currency} {record.amount?.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {record.card_last_four && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Card: ****{record.card_last_four}</span>
                          <Badge variant="outline" className={record.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                            {record.status}
                          </Badge>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Ingested: {new Date(record.ingested_at).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Monitoring;
