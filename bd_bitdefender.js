import fetch from 'node-fetch';

const BASE_URL = process.env.BD_ACCESS_URL || 'https://cloud.gravityzone.bitdefender.com/api';
let requestId = 1;

function getAuthHeader() {
  const apiKey = process.env.BD_API_KEY;
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function rpc(endpoint, method, params = {}) {
  const url = `${BASE_URL}/v1.0/jsonrpc/${endpoint}`;
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

// --- INCIDENTS / THREATS ---
export async function getBlocklistItems({ page = 1, perPage = 30 } = {}) {
  return rpc('incidents', 'getBlocklistItems', { page, perPage });
}

export async function addToBlocklist({ hashType, hashList, sourceInfo }) {
  return rpc('incidents', 'addToBlocklist', { hashType, hashList, sourceInfo });
}

export async function removeFromBlocklist({ hashItemIds }) {
  return rpc('incidents', 'removeFromBlocklist', { hashItemIds });
}

// --- TASKS (scan, isolate, restore) ---
export async function createScanTask({ targetIds, type = 1, name }) {
  // type: 1=Quick, 2=Full, 3=Memory, 4=Custom
  return rpc('network', 'createScanTask', {
    targetIds,
    type,
    ...(name && { name }),
  });
}

export async function createIsolateEndpointTask({ endpointIds }) {
  return rpc('network', 'createIsolateEndpointTask', { endpointIds });
}

export async function createRestoreEndpointFromIsolationTask({ endpointIds }) {
  return rpc('network', 'createRestoreEndpointFromIsolationTask', { endpointIds });
}

export async function getTaskStatus({ taskId }) {
  return rpc('network', 'getTaskStatus', { taskId });
}

// --- POLICIES ---
export async function getPoliciesList({ page = 1, perPage = 30 } = {}) {
  return rpc('policies', 'getPoliciesList', { page, perPage });
}

export async function getPolicyDetails({ policyId }) {
  return rpc('policies', 'getPolicyDetails', { policyId });
}

// --- COMPANIES (MSP) ---
export async function getCompaniesList({ page = 1, perPage = 30 } = {}) {
  return rpc('companies', 'getCompaniesList', { page, perPage });
}

// --- REPORTS ---
export async function getReportsList({ page = 1, perPage = 30 } = {}) {
  return rpc('reports', 'getReportsList', { page, perPage });
}
