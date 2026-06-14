/* ============================================================
   Axios-compatible mock client for the static demo build.
   Routes api() calls to in-memory demo data (mockData.js) so the
   whole app works on GitHub Pages with no backend.
   Supports .get / .post / .put / .delete returning { data }.
   ============================================================ */
import * as D from './mockData';

// Mutable in-memory copies so create/acknowledge/etc. feel live.
const store = {
  regulations: [...D.REGULATIONS],
  controls: [...D.CONTROLS],
  alerts: [...D.ALERTS],
  incidents: [...D.INCIDENTS],
  agentTasks: [...D.AGENT_TASKS],
  monitoring: [...D.MONITORING_DATA],
  evidence: [...D.EVIDENCE_PACKAGES],
  documents: [...D.DOCUMENTS],
};

const ok = (data) => Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config: {} });
const stripQuery = (url) => url.split('?')[0].replace(/\/+$/, '') || '/';

function dashboardStats() {
  const scores = D.COMPLIANCE_SCORES;
  const overall = Math.round((scores.reduce((s, x) => s + x.score, 0) / scores.length) * 10) / 10;
  return {
    overall_score: overall,
    scores_by_framework: scores,
    open_incidents: store.incidents.filter((i) => i.status !== 'closed').length,
    active_alerts: store.alerts.filter((a) => !a.acknowledged).length,
    pending_tasks: store.agentTasks.filter((t) => ['open', 'in_progress', 'pending'].includes(t.status)).length,
    recent_activities: D.ACTIVITIES,
  };
}

function handleGet(path, config) {
  const q = config?.params || {};
  switch (true) {
    case path === '/auth/me': return ok(D.DEMO_USER);
    case path === '/tenants/current': return ok(D.DEMO_TENANT);
    case path === '/dashboard/stats': return ok(dashboardStats());
    case path === '/regulations': {
      const fw = q.framework;
      return ok(fw ? store.regulations.filter((r) => r.framework === fw) : store.regulations);
    }
    case path === '/regulations/conflicts': return ok(D.CONFLICTS_RESULT);
    case /^\/regulations\/[^/]+\/atomic-requirements$/.test(path): return ok(D.ATOMIC_REQUIREMENTS);
    case /^\/regulations\/[^/]+$/.test(path): {
      const id = path.split('/')[2];
      return ok(store.regulations.find((r) => r.id === id) || store.regulations[0]);
    }
    case path === '/controls': return ok(store.controls);
    case path === '/policies': return ok([]);
    case path === '/incidents': return ok(store.incidents);
    case path === '/alerts': return ok(store.alerts);
    case path === '/agents/tasks': return ok(store.agentTasks);
    case path === '/agents/activity': return ok({ activities: D.AGENT_ACTIVITIES });
    case path === '/monitoring/data': return ok({ data: store.monitoring, count: store.monitoring.length });
    case path === '/risk/heatmap': return ok({ heatmap: D.RISK_HEATMAP });
    case path === '/risk/trends': return ok({ trends: D.RISK_TRENDS });
    case path === '/insights': return ok(D.INSIGHTS);
    case path === '/evidence/packages': return ok({ packages: store.evidence });
    case /^\/evidence\/packages\/[^/]+$/.test(path): {
      const id = path.split('/')[3];
      return ok(store.evidence.find((p) => p.id === id) || store.evidence[0]);
    }
    case path === '/documents': return ok({ documents: store.documents });
    default:
      console.warn('[mockClient] Unhandled GET', path);
      return ok({});
  }
}

function handlePost(path, body) {
  switch (true) {
    case path === '/auth/login': return ok({ token: 'demo-token', user: D.DEMO_USER });
    case path === '/auth/register': return ok({ token: 'demo-token', user: { ...D.DEMO_USER, ...body } });
    case path === '/regulations': {
      const reg = { id: D.uid('reg'), tenant_id: D.DEMO_TENANT.id, sections: [], version: '1.0', source_url: null, created_at: new Date().toISOString(), ...body };
      store.regulations.unshift(reg);
      return ok(reg);
    }
    case path === '/regulations/search':
      return ok({ results: store.regulations, count: store.regulations.length });
    case path === '/regulations/analyze-conflicts': return ok(D.CONFLICTS_RESULT);
    case /^\/regulations\/[^/]+\/decompose$/.test(path): return ok(D.ATOMIC_REQUIREMENTS);
    case path === '/controls': {
      const c = { id: D.uid('ctrl'), tenant_id: D.DEMO_TENANT.id, effectiveness: 80, status: 'active', risk_level: 'medium', created_at: new Date().toISOString(), ...body };
      store.controls.unshift(c);
      return ok(c);
    }
    case path === '/incidents': {
      const i = { id: D.uid('inc'), tenant_id: D.DEMO_TENANT.id, status: 'open', affected_systems: [], related_regulations: [], suggested_remediation: 'Investigate and assign an owner.', created_at: new Date().toISOString(), ...body };
      store.incidents.unshift(i);
      return ok(i);
    }
    case path === '/alerts': {
      const a = { id: D.uid('alert'), tenant_id: D.DEMO_TENANT.id, acknowledged: false, status: 'open', created_at: new Date().toISOString(), ...body };
      store.alerts.unshift(a);
      return ok(a);
    }
    case path === '/agents/tasks': {
      const t = { id: D.uid('task'), tenant_id: D.DEMO_TENANT.id, status: 'pending', result: null, created_at: new Date().toISOString(), completed_at: null, ...body };
      store.agentTasks.unshift(t);
      return ok(t);
    }
    case path === '/monitoring/ingest': {
      const records = (body?.records || []).map((r) => ({ id: D.uid('rec'), data_type: body.type, ingested_at: new Date().toISOString(), ...r }));
      store.monitoring = [...records, ...store.monitoring];
      return ok({ message: `Ingested ${records.length} records`, type: body?.type });
    }
    case path === '/chat': return ok(D.chatReply(body?.message));
    case path === '/evidence/generate': {
      const pkg = { id: D.uid('pkg'), tenant_id: D.DEMO_TENANT.id, name: body?.name || 'New Evidence Package', framework: body?.framework || 'PCI_DSS', status: 'generating', evidence_count: 0, created_at: new Date().toISOString(), generated_by: 'Evidence & Reporting Agent' };
      store.evidence.unshift(pkg);
      return ok({ message: 'Evidence package generation started', package_id: pkg.id });
    }
    case path === '/documents/upload':
      return ok({ message: 'Document uploaded', document_id: D.uid('doc'), filename: 'uploaded.pdf' });
    default:
      console.warn('[mockClient] Unhandled POST', path);
      return ok({});
  }
}

function handlePut(path, body) {
  switch (true) {
    case path === '/tenants/current': return ok({ ...D.DEMO_TENANT, ...body });
    case /^\/incidents\/[^/]+\/status$/.test(path): {
      const id = path.split('/')[2];
      const inc = store.incidents.find((i) => i.id === id);
      if (inc) inc.status = body?.status || inc.status;
      return ok({ message: 'Status updated', status: body?.status });
    }
    case /^\/alerts\/[^/]+\/acknowledge$/.test(path): {
      const id = path.split('/')[2];
      const a = store.alerts.find((x) => x.id === id);
      if (a) { a.acknowledged = true; a.status = 'acknowledged'; }
      return ok({ message: 'Alert acknowledged' });
    }
    case /^\/agents\/tasks\/[^/]+\/hitl$/.test(path): {
      const id = path.split('/')[3];
      const t = store.agentTasks.find((x) => x.id === id);
      const newStatus = body?.decision === 'approve' ? 'completed' : 'rejected';
      if (t) t.status = newStatus;
      return ok({ message: `Task ${newStatus}`, task_id: id });
    }
    default:
      console.warn('[mockClient] Unhandled PUT', path);
      return ok({});
  }
}

const mockClient = {
  get: (url, config) => handleGet(stripQuery(url), config),
  post: (url, body) => handlePost(stripQuery(url), body),
  put: (url, body) => handlePut(stripQuery(url), body),
  delete: () => ok({ message: 'deleted' }),
};

export default mockClient;
