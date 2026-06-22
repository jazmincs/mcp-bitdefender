import fetch from 'node-fetch';

const BASE_URL = process.env.BD_ACCESS_URL || 'https://cloud.gravityzone.bitdefender.com/api';
let requestId = 1;

function getAuthHeader() {
  const apiKey = process.env.BD_API_KEY;
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function rpc(endpoint, method, params = {}, version = 'v1.0') {
  const url = `${BASE_URL}/${version}/jsonrpc/${endpoint}`;
  const body = {
    id: String(requestId++),
    jsonrpc: '2.0',
    method,
    params,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Bitdefender HTTP error ${res.status}: ${text}`);
  const json = JSON.parse(text);
  if (json.error) throw new Error(`Bitdefender RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

// --- NETWORK / ENDPOINTS ---
export async function getEndpointsList({ parentId, page = 1, perPage = 30 } = {}) {
  return rpc('network', 'getEndpointsList', {
    ...(parentId && { parentId }),
    page,
    perPage,
  });
}

export async function getManagedEndpointDetails(endpointId) {
  return rpc('network', 'getManagedEndpointDetails', { endpointId });
}

export async function getNetworkInventoryItems({ parentId, page = 1, perPage = 30 } = {}) {
  return rpc('network', 'getNetworkInventoryItems', {
    ...(parentId && { parentId }),
    page,
    perPage,
  });
}

export async function moveEndpoints({ endpointIds, groupId }) {
  return rpc('network', 'moveEndpoints', { endpointIds, groupId });
}

// --- COMPANIES ---
export async function getCompanyDetails({ companyId }) {
  return rpc('companies', 'getCompanyDetails', { companyId });
}

export async function findCompaniesByName({ name }) {
  return rpc('companies', 'findCompaniesByName', { name });
}

export async function getCompanyDetailsByUser({ userId }) {
  return rpc('companies', 'getCompanyDetailsByUser', { userId });
}

// --- INCIDENTS (v1.2) ---
export async function getIncidentsList({ page = 1, perPage = 30, filters = {} } = {}) {
  return rpc('incidents', 'getIncidentsList', { page, perPage, ...filters }, 'v1.2');
}

export async function getIncident({ incidentId }) {
  return rpc('incidents', 'getIncident', { incidentId }, 'v1.2');
}

export async function getIncidentsByIds({ incidentIds }) {
  return rpc('incidents', 'getIncidentsByIds', { incidentIds }, 'v1.2');
}

export async function changeIncidentStatus({ incidentId, status }) {
  // status: 1=Open, 2=Closed, 3=In Progress
  return rpc('incidents', 'changeIncidentStatus', { incidentId, status });
}

export async function updateIncidentNote({ incidentId, note }) {
  return rpc('incidents', 'updateIncidentNote', { incidentId, note }, 'v1.1');
}

// --- BLOCKLIST (v1.2) ---
export async function getBlocklistItems({ page = 1, perPage = 30 } = {}) {
  return rpc('incidents', 'getBlocklistItems', { page, perPage }, 'v1.2');
}

export async function addToBlocklist({ hashType, hashList, sourceInfo }) {
  return rpc('incidents', 'addToBlocklist', { hashType, hashList, sourceInfo }, 'v1.2');
}

export async function removeFromBlocklist({ hashItemIds }) {
  return rpc('incidents', 'removeFromBlocklist', { hashItemIds }, 'v1.2');
}

// --- TASKS ---
export async function createScanTask({ targetIds, type = 1, name }) {
  return rpc('network', 'createScanTask', {
    targetIds,
    type,
    ...(name && { name }),
  });
}

export async function createIsolateEndpointTask({ endpointIds }) {
  return rpc('incidents', 'createIsolateEndpointTask', { endpointIds }, 'v1.1');
}

export async function createRestoreEndpointFromIsolationTask({ endpointIds }) {
  return rpc('incidents', 'createRestoreEndpointFromIsolationTask', { endpointIds }, 'v1.1');
}

export async function getTaskStatus({ taskId }) {
  return rpc('network', 'getTaskStatus', { taskId });
}

// --- INVESTIGATION ---
export async function collectInvestigationPackage({ endpointId }) {
  return rpc('investigation', 'collectInvestigationPackage', { endpointId });
}

export async function killProcess({ endpointId, processId }) {
  return rpc('investigation', 'killProcess', { endpointId, processId });
}

// --- POLICIES ---
export async function getPoliciesList({ page = 1, perPage = 30 } = {}) {
  return rpc('policies', 'getPoliciesList', { page, perPage });
}

export async function getPolicyDetails({ policyId }) {
  return rpc('policies', 'getPolicyDetails', { policyId });
}

// --- REPORTS ---
export async function getReportsList({ page = 1, perPage = 30 } = {}) {
  return rpc('reports', 'getReportsList', { page, perPage });
}

// --- POLICIES MANAGEMENT ---
export async function createPolicy({ name, description, settings, inheritedPolicy }) {
  return rpc('policies', 'createPolicy', {
    name,
    ...(description && { description }),
    ...(settings && { settings }),
    ...(inheritedPolicy && { inheritedPolicy }),
  });
}

export async function updatePolicy({ policyId, name, description, settings }) {
  return rpc('policies', 'updatePolicy', {
    policyId,
    ...(name && { name }),
    ...(description && { description }),
    ...(settings && { settings }),
  });
}

export async function deletePolicy({ policyId }) {
  return rpc('policies', 'deletePolicy', { policyId });
}

export async function assignPoliciesToEndpoints({ endpointIds, policyId }) {
  return rpc('network', 'assignPoliciesToEndpoints', { endpointIds, policyId });
}

export async function assignPoliciesToGroups({ groupIds, policyId }) {
  return rpc('network', 'assignPoliciesToGroups', { groupIds, policyId });
}

// --- POLICY CLONING ---
export async function clonePolicy({ policyId, name }) {
  // GravityZone clones by creating a new policy inheriting from existing one
  return rpc('policies', 'createPolicy', {
    name,
    inheritedPolicy: policyId,
  });
}

// --- SET POLICY MODULES STATE ---
export async function setPolicyModulesState({ policyId, settings }) {
  return rpc('policies', 'setPolicyModulesState', { policyId, settings });
}
