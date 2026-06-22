import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import * as BD from './bitdefender.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mcp-bitdefender', timestamp: new Date().toISOString() });
});

app.all('/mcp', async (req, res) => {
  const server = new McpServer({
    name: 'bitdefender-mcp',
    version: '1.0.0',
  });

  // --- TOOL: list_endpoints ---
  server.tool(
    'list_endpoints',
    'Lista los endpoints/dispositivos administrados en Bitdefender GravityZone.',
    {
      parentId: z.string().optional().describe('ID del grupo padre para filtrar. Omitir para listar todos.'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (params) => {
      const result = await BD.getEndpointsList(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: get_endpoint_details ---
  server.tool(
    'get_endpoint_details',
    'Obtiene detalles completos de un endpoint: estado de protección, módulos, última actividad.',
    {
      endpointId: z.string().describe('ID del endpoint en GravityZone'),
    },
    async ({ endpointId }) => {
      const result = await BD.getManagedEndpointDetails(endpointId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: list_network_inventory ---
  server.tool(
    'list_network_inventory',
    'Lista el inventario de red: grupos, endpoints, máquinas virtuales.',
    {
      parentId: z.string().optional().describe('ID del grupo padre'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (params) => {
      const result = await BD.getNetworkInventoryItems(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: create_scan_task ---
  server.tool(
    'create_scan_task',
    'Lanza un escaneo en uno o varios endpoints.',
    {
      targetIds: z.array(z.string()).describe('Lista de IDs de endpoints a escanear'),
      type: z.number().optional().default(1).describe('Tipo: 1=Quick, 2=Full, 3=Memory, 4=Custom'),
      name: z.string().optional().describe('Nombre de la tarea'),
    },
    async (params) => {
      const result = await BD.createScanTask(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: isolate_endpoint ---
  server.tool(
    'isolate_endpoint',
    'Aísla uno o más endpoints de la red. Acción crítica de respuesta a incidentes.',
    {
      endpointIds: z.array(z.string()).describe('Lista de IDs de endpoints a aislar'),
    },
    async ({ endpointIds }) => {
      const result = await BD.createIsolateEndpointTask({ endpointIds });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: restore_endpoint ---
  server.tool(
    'restore_endpoint',
    'Restaura un endpoint del aislamiento de red.',
    {
      endpointIds: z.array(z.string()).describe('Lista de IDs de endpoints a restaurar'),
    },
    async ({ endpointIds }) => {
      const result = await BD.createRestoreEndpointFromIsolationTask({ endpointIds });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: get_task_status ---
  server.tool(
    'get_task_status',
    'Consulta el estado de una tarea (escaneo, aislamiento, restauración).',
    {
      taskId: z.string().describe('ID de la tarea a consultar'),
    },
    async ({ taskId }) => {
      const result = await BD.getTaskStatus({ taskId });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: list_policies ---
  server.tool(
    'list_policies',
    'Lista las políticas de seguridad configuradas en GravityZone.',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (params) => {
      const result = await BD.getPoliciesList(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: get_policy_details ---
  server.tool(
    'get_policy_details',
    'Obtiene la configuración detallada de una política de seguridad.',
    {
      policyId: z.string().describe('ID de la política'),
    },
    async ({ policyId }) => {
      const result = await BD.getPolicyDetails({ policyId });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: list_companies ---
  server.tool(
    'list_companies',
    'Lista las empresas/clientes MSP en GravityZone (vista partner).',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (params) => {
      const result = await BD.getCompaniesList(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: list_blocklist ---
  server.tool(
    'list_blocklist',
    'Lista los hashes en la blocklist de GravityZone.',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (params) => {
      const result = await BD.getBlocklistItems(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: add_to_blocklist ---
  server.tool(
    'add_to_blocklist',
    'Agrega hashes maliciosos a la blocklist de GravityZone.',
    {
      hashType: z.number().describe('Tipo de hash: 1=MD5, 2=SHA256'),
      hashList: z.array(z.string()).describe('Lista de hashes a bloquear'),
      sourceInfo: z.string().optional().describe('Fuente o descripción del hash'),
    },
    async (params) => {
      const result = await BD.addToBlocklist(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- TOOL: list_reports ---
  server.tool(
    'list_reports',
    'Lista los reportes disponibles en GravityZone.',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (params) => {
      const result = await BD.getReportsList(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bitdefender MCP server listening on http://0.0.0.0:${PORT}/mcp`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});
