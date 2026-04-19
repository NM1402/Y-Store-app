/**
 * O18: Analytics Service - API calls for analytics
 */

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

class AnalyticsService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
    };
  }

  async getOpsKPI(range = 30) {
    const res = await fetch(`${API_BASE}/api/v2/admin/analytics/ops-kpi?range=${range}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch KPI');
    return res.json();
  }

  async getCohorts(months = 12) {
    const res = await fetch(`${API_BASE}/api/v2/admin/analytics/cohorts?months=${months}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch cohorts');
    return res.json();
  }

  async getRevenueTrend(days = 30) {
    const res = await fetch(`${API_BASE}/api/v2/admin/analytics/revenue-trend?days=${days}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch revenue trend');
    return res.json();
  }

  async getRiskDistribution() {
    const res = await fetch(`${API_BASE}/api/v2/admin/analytics/risk-distribution`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch risk distribution');
    return res.json();
  }

  async rebuildDaily(days = 30) {
    const res = await fetch(`${API_BASE}/api/v2/admin/analytics/daily/rebuild`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ days })
    });
    if (!res.ok) throw new Error('Failed to rebuild analytics');
    return res.json();
  }

  // Guard API
  async getIncidents() {
    const res = await fetch(`${API_BASE}/api/v2/admin/guard/incidents`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  }

  async muteIncident(key, hours = 1) {
    const res = await fetch(`${API_BASE}/api/v2/admin/guard/incident/${key}/mute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ hours })
    });
    if (!res.ok) throw new Error('Failed to mute incident');
    return res.json();
  }

  async resolveIncident(key) {
    const res = await fetch(`${API_BASE}/api/v2/admin/guard/incident/${key}/resolve`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to resolve incident');
    return res.json();
  }

  // Timeline API
  async getTimeline(userId, limit = 100) {
    const res = await fetch(`${API_BASE}/api/v2/admin/timeline/${userId}?limit=${limit}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch timeline');
    return res.json();
  }

  // Risk API
  async recalcRisk(userId) {
    const res = await fetch(`${API_BASE}/api/v2/admin/risk/recalc/${userId}`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to recalculate risk');
    return res.json();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
