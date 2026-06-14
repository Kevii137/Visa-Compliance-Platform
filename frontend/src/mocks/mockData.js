/* ============================================================
   Demo data for the static (no-backend) GitHub Pages build.
   Mirrors the FastAPI response shapes in backend/server.py +
   the seed data in backend/seed.py so every page renders with
   realistic content when REACT_APP_DEMO_MODE === 'true'.
   ============================================================ */

const TENANT = 'tenant_visa_demo';
let _seq = 0;
export const uid = (p = 'demo') => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

const now = () => new Date();
const ndays = (n) => new Date(Date.now() - n * 86400000).toISOString();
const ndaysDate = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export const DEMO_USER = {
  id: 'user_demo_admin',
  email: 'admin@compliancepulse.demo',
  name: 'Demo Admin',
  role: 'admin',
  tenant_id: TENANT,
  created_at: ndays(30),
};

export const DEMO_TENANT = {
  id: TENANT,
  name: 'VISA Compliance Demo',
  industry: 'Financial Services',
  compliance_score: 82.6,
  created_at: ndays(120),
};

export const REGULATIONS = [
  { id: 'reg_pci', tenant_id: TENANT, name: 'PCI DSS v4.0.1', framework: 'PCI_DSS', version: '4.0.1',
    description: 'Payment Card Industry Data Security Standard — protects cardholder data across all payment card transactions.',
    source_url: 'https://www.pcisecuritystandards.org', sections: ['1', '2', '3', '4', '6', '7', '8', '10', '11', '12'], created_at: ndays(120) },
  { id: 'reg_gdpr', tenant_id: TENANT, name: 'GDPR 2016/679', framework: 'GDPR', version: '2016/679',
    description: 'General Data Protection Regulation — EU regulation on data protection and privacy for all individuals within the EU.',
    source_url: 'https://gdpr.eu', sections: ['Art.5', 'Art.6', 'Art.17', 'Art.25', 'Art.32', 'Art.33', 'Art.34'], created_at: ndays(110) },
  { id: 'reg_ccpa', tenant_id: TENANT, name: 'CCPA 2018', framework: 'CCPA', version: '2018',
    description: 'California Consumer Privacy Act — gives California consumers rights over their personal information.',
    source_url: 'https://oag.ca.gov/privacy/ccpa', sections: ['1798.100', '1798.105', '1798.110', '1798.115', '1798.120'], created_at: ndays(100) },
  { id: 'reg_aml', tenant_id: TENANT, name: 'AML/KYC FATF Guidelines', framework: 'AML_KYC', version: '2023',
    description: 'Anti-Money Laundering and Know-Your-Customer FATF Recommendations for financial institutions.',
    source_url: 'https://www.fatf-gafi.org', sections: ['Rec.1', 'Rec.10', 'Rec.11', 'Rec.20', 'Rec.21'], created_at: ndays(90) },
  { id: 'reg_lgpd', tenant_id: TENANT, name: 'LGPD Lei 13.709/2018', framework: 'LGPD', version: '2018',
    description: 'Lei Geral de Proteção de Dados — Brazilian data protection law modeled on GDPR.',
    source_url: 'https://www.planalto.gov.br', sections: ['Art.6', 'Art.7', 'Art.11', 'Art.18', 'Art.46', 'Art.48'], created_at: ndays(85) },
];

const ctrlDefs = [
  ['Encryption at Rest', 'All sensitive data must be encrypted at rest using AES-256.', 'compliant', 'low', 96.0],
  ['Access Control', 'Role-based access control enforced for all production systems.', 'compliant', 'medium', 88.5],
  ['Audit Logging', 'All privileged operations must generate immutable audit logs.', 'partial', 'high', 64.0],
  ['Data Retention', 'Data retention schedules enforced per regulatory requirement.', 'non_compliant', 'critical', 38.0],
];
export const CONTROLS = REGULATIONS.flatMap((reg, ri) =>
  ctrlDefs.map(([n, d, status, risk, eff], ci) => ({
    id: `ctrl_${ri}_${ci}`, tenant_id: TENANT, regulation_id: reg.id, framework: reg.framework,
    name: `${reg.framework} Control — ${n}`, description: d, status, risk_level: risk,
    effectiveness: eff, last_assessed: ndays(ci + 1), created_at: ndays(60 - ri),
  }))
);

export const ALERTS = [
  { id: uid('alert'), tenant_id: TENANT, title: 'Unencrypted PII detected in transaction log', description: 'Credit card BIN numbers found in plaintext in transaction_logs.2026-06-08 without masking.', severity: 'critical', framework: 'PCI_DSS', source: 'Monitoring Agent', status: 'open', acknowledged: false, created_at: ndays(0) },
  { id: uid('alert'), tenant_id: TENANT, title: 'GDPR data deletion request overdue', description: 'Subject access removal for user EU-4821 is 14 days overdue. GDPR Art. 17 requires action within 30 days.', severity: 'high', framework: 'GDPR', source: 'Policy Agent', status: 'open', acknowledged: false, created_at: ndays(1) },
  { id: uid('alert'), tenant_id: TENANT, title: 'AML transaction threshold breach', description: '3 transactions above $9,800 flagged as potential structuring. CTR filing required within 15 days.', severity: 'high', framework: 'AML_KYC', source: 'Monitoring Agent', status: 'open', acknowledged: false, created_at: ndays(2) },
  { id: uid('alert'), tenant_id: TENANT, title: 'Privileged access review overdue', description: 'Quarterly privileged access review for 12 admin accounts is 7 days overdue.', severity: 'medium', framework: 'PCI_DSS', source: 'Policy Agent', status: 'acknowledged', acknowledged: true, created_at: ndays(4) },
  { id: uid('alert'), tenant_id: TENANT, title: 'CCPA opt-out signal not honored', description: 'GPC signal from 847 California users not propagated to data broker API within 15 days.', severity: 'medium', framework: 'CCPA', source: 'Monitoring Agent', status: 'open', acknowledged: false, created_at: ndays(5) },
  { id: uid('alert'), tenant_id: TENANT, title: 'TLS 1.0 detected on payment endpoint', description: 'API gateway /v1/payments still negotiates TLS 1.0 with legacy POS devices. PCI DSS Req 4.2.1 violation.', severity: 'high', framework: 'PCI_DSS', source: 'Monitoring Agent', status: 'resolved', acknowledged: true, created_at: ndays(7) },
];

export const INCIDENTS = [
  { id: uid('inc'), tenant_id: TENANT, title: 'Potential insider data exfiltration', description: 'Employee DA-2291 downloaded 4.2 GB of customer PII records outside business hours. Behavioral analysis flagged anomalous access pattern.', severity: 'critical', framework: 'GDPR', status: 'open', assigned_to: 'security-team', affected_systems: ['CRM', 'Data Warehouse'], related_regulations: ['GDPR Art.32', 'GDPR Art.33'], suggested_remediation: 'Revoke access, preserve forensic logs, and assess 72-hour breach notification obligation.', created_at: ndays(1), updated_at: ndays(0) },
  { id: uid('inc'), tenant_id: TENANT, title: 'Third-party vendor data breach notification', description: 'Payment processor PartnerPay notified of breach affecting 12,000 shared cardholders. PCI DSS breach notification procedures activated.', severity: 'critical', framework: 'PCI_DSS', status: 'in_progress', assigned_to: 'compliance-team', affected_systems: ['Payment Gateway'], related_regulations: ['PCI DSS Req 12.10'], suggested_remediation: 'Activate incident response plan, notify acquirer and card brands within required windows.', created_at: ndays(3), updated_at: ndays(1) },
  { id: uid('inc'), tenant_id: TENANT, title: 'Cross-border data transfer without adequacy decision', description: 'Customer data transferred to new analytics vendor in India without DPA or Standard Contractual Clauses in place.', severity: 'high', framework: 'GDPR', status: 'open', assigned_to: 'legal-team', affected_systems: ['Analytics Pipeline'], related_regulations: ['GDPR Art.46'], suggested_remediation: 'Pause transfer, execute SCCs, and complete a transfer impact assessment.', created_at: ndays(6), updated_at: ndays(5) },
  { id: uid('inc'), tenant_id: TENANT, title: 'AML alert — wire transfer structuring pattern', description: 'Account cluster AML-7721 shows 18 sub-threshold wire transfers over 3 days consistent with layering behavior.', severity: 'high', framework: 'AML_KYC', status: 'in_progress', assigned_to: 'aml-team', affected_systems: ['Wire Transfer System'], related_regulations: ['FATF Rec.20'], suggested_remediation: 'File SAR, freeze suspicious accounts pending review, escalate to MLRO.', created_at: ndays(10), updated_at: ndays(8) },
  { id: uid('inc'), tenant_id: TENANT, title: 'CCPA consumer opt-out workflow failure', description: 'Technical failure in consent management platform caused 1,200 opt-out signals to be silently dropped over 48 hours.', severity: 'medium', framework: 'CCPA', status: 'resolved', assigned_to: 'engineering', affected_systems: ['Consent Platform'], related_regulations: ['CCPA 1798.120'], suggested_remediation: 'Reprocess dropped signals, add monitoring + alerting on the opt-out queue.', created_at: ndays(15), updated_at: ndays(12) },
];

export const AGENT_TASKS = [
  { id: uid('task'), tenant_id: TENANT, agent_type: 'regulatory_discovery', title: 'Scan FATF 2024 Guidance Updates', description: 'Monitor FATF plenary for new guidance on virtual asset service providers (VASPs) and crypto-asset reporting.', status: 'completed', priority: 'high', result: { findings: ['New VASP travel rule applies to transfers ≥ $1000', 'Crypto mixers now classified as high-risk entities'], recommendations: ['Update AML screening lists', 'Add VASP onboarding questionnaire'], confidence_score: 0.88 }, created_at: ndays(5), updated_at: ndays(4), completed_at: ndays(4) },
  { id: uid('task'), tenant_id: TENANT, agent_type: 'policy_mapping', title: 'Map GDPR Art.17 to Data Deletion Controls', description: 'Decompose GDPR right-to-erasure obligations into testable control requirements for automated deletion pipelines.', status: 'completed', priority: 'high', result: { gaps: ['No automated propagation to backup systems', 'Third-party API deletion not confirmed'], recommendations: ['Add deletion webhook to vendor APIs', 'Schedule backup purge jobs'], confidence_score: 0.72 }, created_at: ndays(7), updated_at: ndays(6), completed_at: ndays(6) },
  { id: uid('task'), tenant_id: TENANT, agent_type: 'monitoring_risk', title: 'Continuous PCI DSS Req 10 Log Monitoring', description: 'Real-time analysis of audit log completeness and integrity across all in-scope payment systems.', status: 'in_progress', priority: 'critical', result: null, created_at: ndays(1), updated_at: ndays(0), completed_at: null },
  { id: uid('task'), tenant_id: TENANT, agent_type: 'evidence_reporting', title: 'Generate Q2 PCI DSS Audit Package', description: 'Compile evidence package for upcoming QSA assessment: logs, screenshots, policy docs, and test results.', status: 'awaiting_approval', priority: 'high', result: { findings: ['Network segmentation validated', 'All 12 cardholder data flows documented'], recommendations: ['Attach quarterly ASV scan report'], remediation_plan: ['Collect outstanding screenshots', 'QSA dry-run review'], confidence_score: 0.91 }, created_at: ndays(2), updated_at: ndays(1), completed_at: null },
  { id: uid('task'), tenant_id: TENANT, agent_type: 'regulatory_discovery', title: 'DORA Compliance Gap Assessment', description: 'Assess gaps against EU Digital Operational Resilience Act (DORA) requirements effective Jan 2025.', status: 'pending', priority: 'high', result: null, created_at: ndays(0), updated_at: ndays(0), completed_at: null },
];

export const AGENT_ACTIVITIES = [
  { id: uid('act'), tenant_id: TENANT, agent_type: 'regulatory_discovery', action: 'Processed task: Scan FATF 2024 Guidance Updates', status: 'completed', result_summary: '2 findings, 2 recommendations', timestamp: ndays(4) },
  { id: uid('act'), tenant_id: TENANT, agent_type: 'policy_mapping', action: 'Processed task: Map GDPR Art.17 to Data Deletion Controls', status: 'completed', result_summary: '72% coverage, 2 gaps', timestamp: ndays(6) },
  { id: uid('act'), tenant_id: TENANT, agent_type: 'monitoring_risk', action: 'Processed task: Continuous PCI DSS Req 10 Log Monitoring', status: 'in_progress', result_summary: 'Monitoring active', timestamp: ndays(0) },
  { id: uid('act'), tenant_id: TENANT, agent_type: 'evidence_reporting', action: 'Processed task: Generate Q2 PCI DSS Audit Package', status: 'awaiting_approval', result_summary: '47 evidence items compiled', timestamp: ndays(1) },
];

export const COMPLIANCE_SCORES = [
  { framework: 'PCI_DSS', score: 84.2, trend: 'up', issues_count: 3 },
  { framework: 'GDPR', score: 76.8, trend: 'down', issues_count: 5 },
  { framework: 'CCPA', score: 88.1, trend: 'up', issues_count: 1 },
  { framework: 'AML_KYC', score: 91.4, trend: 'stable', issues_count: 2 },
  { framework: 'LGPD', score: 72.3, trend: 'down', issues_count: 4 },
];

export const ACTIVITIES = [
  { id: uid('a'), tenant_id: TENANT, type: 'alert_resolved', description: 'TLS 1.0 vulnerability on payment endpoint resolved', created_at: ndays(0) },
  { id: uid('a'), tenant_id: TENANT, type: 'control_assessed', description: 'PCI DSS network segmentation controls re-assessed', created_at: ndays(1) },
  { id: uid('a'), tenant_id: TENANT, type: 'incident_opened', description: 'New GDPR data exfiltration incident escalated to security team', created_at: ndays(1) },
  { id: uid('a'), tenant_id: TENANT, type: 'regulation_updated', description: 'AML/KYC FATF 2024 guidance ingested by Regulatory Discovery Agent', created_at: ndays(2) },
  { id: uid('a'), tenant_id: TENANT, type: 'evidence_generated', description: 'Q2 PCI DSS audit package (47 items) ready for QSA review', created_at: ndays(2) },
  { id: uid('a'), tenant_id: TENANT, type: 'alert_raised', description: 'Critical: Unencrypted PII in transaction log — auto-remediation initiated', created_at: ndays(3) },
];

export const RISK_TRENDS = (() => {
  const trends = [];
  let base = 78;
  for (let i = 14; i > 0; i--) {
    base = Math.max(70, Math.min(95, base + (Math.sin(i) * 1.6)));
    trends.push({
      date: ndaysDate(i),
      compliance_score: Math.round(base * 10) / 10,
      alerts: 2 + (i % 6),
      incidents: i % 3,
      resolved: 1 + (i % 4),
    });
  }
  return trends;
})();

export const RISK_HEATMAP = [
  { business_unit: 'Card Processing', framework: 'PCI_DSS', risk_level: 3, issues: 5 },
  { business_unit: 'Card Processing', framework: 'GDPR', risk_level: 2, issues: 2 },
  { business_unit: 'Customer Data', framework: 'GDPR', risk_level: 4, issues: 8 },
  { business_unit: 'Customer Data', framework: 'CCPA', risk_level: 3, issues: 4 },
  { business_unit: 'Marketing', framework: 'GDPR', risk_level: 2, issues: 3 },
  { business_unit: 'Marketing', framework: 'CCPA', risk_level: 1, issues: 1 },
  { business_unit: 'AML Operations', framework: 'AML_KYC', risk_level: 2, issues: 3 },
  { business_unit: 'Payments', framework: 'PCI_DSS', risk_level: 3, issues: 4 },
  { business_unit: 'Payments', framework: 'LGPD', risk_level: 4, issues: 6 },
];

export const MONITORING_DATA = [
  { id: uid('txn'), transaction_id: 'TXN-88213', data_type: 'transaction', amount: 1500.0, currency: 'USD', card_last_four: '4242', status: 'completed', ingested_at: ndays(0) },
  { id: uid('txn'), transaction_id: 'TXN-88214', data_type: 'transaction', amount: 3200.5, currency: 'EUR', card_last_four: '1234', status: 'pending', ingested_at: ndays(0) },
  { id: uid('txn'), transaction_id: 'TXN-88215', data_type: 'transaction', amount: 9800.0, currency: 'USD', card_last_four: '5678', status: 'completed', ingested_at: ndays(1) },
  { id: uid('log'), transaction_id: 'LOG-50021', data_type: 'access_log', status: 'completed', ingested_at: ndays(1) },
];

export const EVIDENCE_PACKAGES = [
  { id: uid('pkg'), tenant_id: TENANT, name: 'Q2 PCI DSS Audit Package', framework: 'PCI_DSS', status: 'ready', evidence_count: 47, created_at: ndays(2), generated_by: 'Evidence & Reporting Agent' },
  { id: uid('pkg'), tenant_id: TENANT, name: 'GDPR Annual Records of Processing', framework: 'GDPR', status: 'ready', evidence_count: 31, created_at: ndays(20), generated_by: 'Evidence & Reporting Agent' },
  { id: uid('pkg'), tenant_id: TENANT, name: 'AML/KYC SAR Filing Bundle', framework: 'AML_KYC', status: 'generating', evidence_count: 0, created_at: ndays(0), generated_by: 'Evidence & Reporting Agent' },
];

export const DOCUMENTS = [
  { id: uid('doc'), filename: 'PCI-DSS-v4.0.1.pdf', framework: 'PCI_DSS', content_type: 'application/pdf', size: 2480112, status: 'processed', tenant_id: TENANT, uploaded_at: ndays(40) },
  { id: uid('doc'), filename: 'GDPR-Full-Text.pdf', framework: 'GDPR', content_type: 'application/pdf', size: 1980233, status: 'processed', tenant_id: TENANT, uploaded_at: ndays(38) },
];

export const CONFLICTS_RESULT = {
  total_conflicts: 3,
  analysis_summary: 'Detected 3 cross-framework conflicts. The most material is a data-retention contradiction between PCI DSS (retain transaction logs ≥ 1 year) and GDPR storage-limitation (delete personal data when no longer needed). Resolve via pseudonymization + tiered retention.',
  conflicts: [
    { id: uid('cf'), conflict_type: 'direct_contradiction', severity: 'critical', framework_1: 'PCI_DSS', framework_2: 'GDPR', description: 'PCI DSS requires retaining cardholder transaction logs for at least 12 months, while GDPR storage-limitation requires deleting personal data once its purpose is fulfilled.', regulation_1: 'PCI DSS Req 10.5.1', regulation_2: 'GDPR Art.5(1)(e)', example: 'A cardholder requests erasure 3 months after a transaction, but PCI DSS mandates 12-month log retention.', resolution: 'Pseudonymize the PAN in logs and apply tiered retention: keep security-relevant fields for PCI, purge directly identifying data for GDPR.', jurisdiction_winner: 'Context-dependent', action_required: 'Implement field-level pseudonymization in the logging pipeline.' },
    { id: uid('cf'), conflict_type: 'overlapping_obligation', severity: 'high', framework_1: 'GDPR', framework_2: 'CCPA', description: 'Both GDPR and CCPA grant deletion rights but with different scopes, timelines, and exemptions, creating ambiguous handling for dual-jurisdiction users.', regulation_1: 'GDPR Art.17', regulation_2: 'CCPA 1798.105', example: 'An EU resident in California submits a deletion request — which timeline and exemptions apply?', resolution: 'Apply the stricter standard (GDPR 30-day window) and the union of both laws’ scope to satisfy both.', jurisdiction_winner: 'GDPR (stricter)', action_required: 'Unify deletion workflow to the strictest applicable standard.' },
    { id: uid('cf'), conflict_type: 'ambiguous_scope', severity: 'medium', framework_1: 'AML_KYC', framework_2: 'GDPR', description: 'AML/KYC requires retaining customer due-diligence records for 5 years, which can conflict with GDPR data-minimization for inactive customers.', regulation_1: 'FATF Rec.11', regulation_2: 'GDPR Art.5(1)(c)', example: 'A customer closes their account but AML rules require 5-year CDD retention.', resolution: 'Document the AML legal-obligation basis under GDPR Art.6(1)(c) and restrict access to retained records.', jurisdiction_winner: 'AML_KYC (legal obligation)', action_required: 'Record lawful-basis justification and access controls for retained CDD data.' },
  ],
};

export const ATOMIC_REQUIREMENTS = {
  total_requirements: 6,
  atomic_requirements: [
    { id: uid('ar'), requirement: 'Encrypt cardholder data at rest using strong cryptography (AES-256).', section: 'Req 3.5', testable: true, control_type: 'technical' },
    { id: uid('ar'), requirement: 'Restrict access to cardholder data by business need-to-know.', section: 'Req 7.1', testable: true, control_type: 'administrative' },
    { id: uid('ar'), requirement: 'Assign a unique ID to each person with computer access.', section: 'Req 8.1', testable: true, control_type: 'technical' },
    { id: uid('ar'), requirement: 'Track and monitor all access to network resources and cardholder data.', section: 'Req 10.1', testable: true, control_type: 'technical' },
    { id: uid('ar'), requirement: 'Regularly test security systems and processes.', section: 'Req 11.1', testable: true, control_type: 'operational' },
    { id: uid('ar'), requirement: 'Maintain a policy that addresses information security for all personnel.', section: 'Req 12.1', testable: true, control_type: 'administrative' },
  ],
};

export const INSIGHTS = {
  risk_prediction: { overall_trend: 'improving', predicted_score_next_30_days: 84.5, confidence: 72, key_drivers: ['PCI DSS controls improving', 'GDPR incidents declining', 'New AML monitoring active'] },
  behavioral_insights: [
    { type: 'pattern', description: 'Spike in GDPR data export requests detected this week', risk_level: 'medium', recommended_action: 'Review data portability workflow and response timelines' },
    { type: 'anomaly', description: 'Access control effectiveness dropped 8% below threshold', risk_level: 'high', recommended_action: 'Audit access permissions immediately across Card Processing team' },
  ],
  systemic_risks: [{ risk: 'Outdated PCI DSS controls may not satisfy v4.0 requirements effective March 2025', affected_frameworks: ['PCI_DSS'], probability: 'medium', impact: 'high' }],
  quick_wins: ['Enable MFA for all admin accounts', 'Complete pending GDPR data mapping', 'Update privacy notices for CCPA compliance'],
  priority_actions: [
    { action: 'Complete PCI DSS v4.0 gap assessment', impact: 'high', effort: 'medium', framework: 'PCI_DSS' },
    { action: 'Resolve 3 open GDPR access requests past SLA', impact: 'high', effort: 'low', framework: 'GDPR' },
    { action: 'Update AML transaction monitoring thresholds', impact: 'medium', effort: 'medium', framework: 'AML_KYC' },
  ],
  three_specialist_signals: {
    financial: { risk_level: 'medium', signals: ['High-value transactions > $10K pending review', '2 flagged wash-pattern sequences'], top_finding: 'Multiple suspicious transaction patterns detected requiring AML review' },
    behavioral: { risk_level: 'low', signals: ['No insider trading signals detected', 'Normal communication patterns'], top_finding: 'Behavioral risk within acceptable parameters' },
    operational: { risk_level: 'high', signals: ['Failed login spike from 3 IPs', 'Data export volume 40% above baseline'], top_finding: 'Unusual data access patterns require immediate investigation' },
  },
};

export function chatReply(message = '') {
  const m = message.toLowerCase();
  let response;
  let sources = [{ framework: 'PCI_DSS', section: 'Req 3.5', relevance: 0.92 }];
  let suggested_actions = ['Review compliance dashboard', 'Check recent alerts'];

  if (m.includes('pci') || m.includes('card')) {
    response = 'PCI DSS v4.0.1 requires cardholder data to be encrypted at rest (Req 3.5) and in transit (Req 4.2). Your current posture shows 1 partial and 1 non-compliant control in this framework — audit logging and data retention. I recommend prioritizing the audit-logging gap, which currently sits at 64% effectiveness.';
    suggested_actions = ['Open Controls → PCI DSS', 'Generate Q2 PCI evidence package'];
  } else if (m.includes('gdpr') || m.includes('delete') || m.includes('erasure')) {
    response = 'Under GDPR Art.17 (right to erasure) you must respond to deletion requests within 30 days. There is currently 1 overdue request (user EU-4821, 14 days over) and an open conflict between GDPR storage-limitation and PCI DSS retention. The recommended resolution is field-level pseudonymization with tiered retention.';
    sources = [{ framework: 'GDPR', section: 'Art.17', relevance: 0.95 }];
    suggested_actions = ['View overdue GDPR alert', 'Open Conflicts analysis'];
  } else if (m.includes('aml') || m.includes('transaction') || m.includes('kyc')) {
    response = 'Your AML/KYC framework is your strongest at 91.4%. However, 3 transactions above $9,800 were flagged as potential structuring and require a CTR filing within 15 days, and account cluster AML-7721 shows a layering pattern under active investigation.';
    sources = [{ framework: 'AML_KYC', section: 'FATF Rec.20', relevance: 0.9 }];
    suggested_actions = ['Review AML incident', 'File SAR'];
  } else {
    response = 'Your overall compliance score is 82.6%. The most urgent items are 1 critical alert (unencrypted PII in a transaction log) and 2 critical incidents. AML/KYC (91.4%) is your strongest framework; LGPD (72.3%) and GDPR (76.8%) need the most attention. Ask me about a specific framework — PCI, GDPR, CCPA, AML/KYC or LGPD.';
  }
  return { response, sources, suggested_actions };
}
