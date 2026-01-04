import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Bell, BellOff, CheckCircle, AlertTriangle, Info, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const severityStyles = {
  critical: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-orange-500 bg-orange-500/5',
  medium: 'border-l-yellow-500 bg-yellow-500/5',
  low: 'border-l-green-500 bg-green-500/5'
};

const severityBadge = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const Alerts = () => {
  const { api } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api().get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api().put(`/alerts/${alertId}/acknowledge`);
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      const unacknowledged = alerts.filter(a => !a.acknowledged);
      await Promise.all(unacknowledged.map(a => api().put(`/alerts/${a.id}/acknowledge`)));
      toast.success(`${unacknowledged.length} alerts acknowledged`);
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to acknowledge alerts');
    }
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : filter === 'active' 
      ? alerts.filter(a => !a.acknowledged)
      : alerts.filter(a => a.acknowledged);

  const activeCount = alerts.filter(a => !a.acknowledged).length;

  const getSeverityIcon = (severity) => {
    if (severity === 'critical' || severity === 'high') return <AlertTriangle className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
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
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            {activeCount} active alerts requiring attention
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setFilter(filter === 'all' ? 'active' : filter === 'active' ? 'acknowledged' : 'all')}
            data-testid="filter-alerts-btn"
          >
            <Filter className="h-4 w-4 mr-2" />
            {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Acknowledged'}
          </Button>
          {activeCount > 0 && (
            <Button onClick={handleAcknowledgeAll} data-testid="acknowledge-all-btn">
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge All ({activeCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const count = alerts.filter(a => a.severity === sev && !a.acknowledged).length;
          return (
            <Card key={sev} className="bg-card border-border/50" data-testid={`${sev}-alerts-stat`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{sev}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${severityBadge[sev].split(' ')[0]}`}>
                    {getSeverityIcon(sev)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No alerts to display</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card 
                className={`bg-card border-border/50 border-l-4 ${severityStyles[alert.severity]} ${
                  alert.acknowledged ? 'opacity-60' : ''
                }`}
                data-testid={`alert-card-${alert.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${severityBadge[alert.severity].split(' ')[0]}`}>
                      {alert.acknowledged ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        getSeverityIcon(alert.severity)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.description}
                          </p>
                        </div>
                        <Badge variant="outline" className={severityBadge[alert.severity]}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Source: {alert.source}</span>
                          {alert.framework && (
                            <>
                              <span>•</span>
                              <span>{alert.framework.replace('_', ' ')}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                        {!alert.acknowledged && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(alert.id);
                            }}
                            data-testid={`acknowledge-btn-${alert.id}`}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
