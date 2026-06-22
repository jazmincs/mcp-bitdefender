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
  const server = new McpServer({ name: 'bitdefender-mcp', version: '2.0.0' });

  // --- ENDPOINTS ---
  server.tool('list_endpoints',
    'Lista endpoints/dispositivos en GravityZone. Filtra por grupo con parentId.',
    {
      parentId: z.string().optional().describe('ID del grupo para filtrar. Omitir para listar todos.'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (p) => {
      const r = await BD.getEndpointsList(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('get_endpoint_details',
    'Detalles completos de un endpoint: estado protección, módulos, última actividad, IP, OS.',
    { endpointId: z.string().describe('ID del endpoint en GravityZone') },
    async ({ endpointId }) => {
      const r = await BD.getManagedEndpointDetails(endpointId);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('list_network_inventory',
    'Lista el inventario de red: grupos, carpetas y endpoints. Úsalo para ver la estructura por empresa/cliente.',
    {
      parentId: z.string().optional().describe('ID del grupo padre. Omitir para ver raíz.'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (p) => {
      const r = await BD.getNetworkInventoryItems(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('move_endpoints',
    'Mueve endpoints a un grupo diferente.',
    {
      endpointIds: z.array(z.string()).describe('Lista de IDs de endpoints a mover'),
      groupId: z.string().describe('ID del grupo destino'),
    },
    async (p) => {
      const r = await BD.moveEndpoints(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- COMPANIES ---
  server.tool('find_companies_by_name',
    'Busca empresas/clientes en GravityZone por nombre.',
    { name: z.string().describe('Nombre o parte del nombre a buscar') },
    async ({ name }) => {
      const r = await BD.findCompaniesByName({ name });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('get_company_details',
    'Obtiene detalles de una empresa por su ID.',
    { companyId: z.string().describe('ID de la empresa') },
    async ({ companyId }) => {
      const r = await BD.getCompanyDetails({ companyId });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- INCIDENTS ---
  server.tool('list_incidents',
    'Lista incidentes EDR detectados por Bitdefender. Filtra por fecha, severidad, estado.',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
      filters: z.object({
        severity: z.number().optional().describe('1=Info, 2=Low, 3=Medium, 4=High, 5=Critical'),
        status: z.number().optional().describe('1=Open, 2=Closed, 3=In Progress'),
      }).optional().default({}),
    },
    async (p) => {
      const r = await BD.getIncidentsList(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('get_incident',
    'Obtiene detalles completos de un incidente específico.',
    { incidentId: z.string().describe('ID del incidente') },
    async ({ incidentId }) => {
      const r = await BD.getIncident({ incidentId });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('change_incident_status',
    'Cambia el estado de un incidente: abrir, cerrar, marcar en progreso.',
    {
      incidentId: z.string().describe('ID del incidente'),
      status: z.number().describe('1=Open, 2=Closed, 3=In Progress'),
    },
    async (p) => {
      const r = await BD.changeIncidentStatus(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('update_incident_note',
    'Agrega o actualiza la nota de un incidente.',
    {
      incidentId: z.string().describe('ID del incidente'),
      note: z.string().describe('Texto de la nota'),
    },
    async (p) => {
      const r = await BD.updateIncidentNote(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- SCAN & ISOLATION ---
  server.tool('create_scan_task',
    'Lanza un escaneo en uno o varios endpoints.',
    {
      targetIds: z.array(z.string()).describe('IDs de endpoints a escanear'),
      type: z.number().optional().default(1).describe('1=Quick, 2=Full, 3=Memory, 4=Custom'),
      name: z.string().optional().describe('Nombre de la tarea'),
    },
    async (p) => {
      const r = await BD.createScanTask(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('isolate_endpoint',
    'Aísla endpoints de la red. Acción crítica de respuesta a incidentes.',
    { endpointIds: z.array(z.string()).describe('IDs de endpoints a aislar') },
    async ({ endpointIds }) => {
      const r = await BD.createIsolateEndpointTask({ endpointIds });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('restore_endpoint',
    'Restaura endpoints del aislamiento de red.',
    { endpointIds: z.array(z.string()).describe('IDs de endpoints a restaurar') },
    async ({ endpointIds }) => {
      const r = await BD.createRestoreEndpointFromIsolationTask({ endpointIds });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('get_task_status',
    'Consulta el estado de una tarea (scan, aislamiento, restauración).',
    { taskId: z.string().describe('ID de la tarea') },
    async ({ taskId }) => {
      const r = await BD.getTaskStatus({ taskId });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- INVESTIGATION ---
  server.tool('collect_investigation_package',
    'Recopila paquete forense de un endpoint para investigación.',
    { endpointId: z.string().describe('ID del endpoint') },
    async ({ endpointId }) => {
      const r = await BD.collectInvestigationPackage({ endpointId });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('kill_process',
    'Termina un proceso en ejecución en un endpoint. Requiere licencia EDR.',
    {
      endpointId: z.string().describe('ID del endpoint'),
      processId: z.string().describe('ID del proceso a terminar'),
    },
    async (p) => {
      const r = await BD.killProcess(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- BLOCKLIST ---
  server.tool('list_blocklist',
    'Lista los hashes en la blocklist de GravityZone.',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (p) => {
      const r = await BD.getBlocklistItems(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('add_to_blocklist',
    'Agrega hashes maliciosos a la blocklist.',
    {
      hashType: z.number().describe('1=MD5, 2=SHA256'),
      hashList: z.array(z.string()).describe('Lista de hashes'),
      sourceInfo: z.string().optional().describe('Descripción o fuente del hash'),
    },
    async (p) => {
      const r = await BD.addToBlocklist(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('remove_from_blocklist',
    'Elimina hashes de la blocklist.',
    { hashItemIds: z.array(z.string()).describe('IDs de los items a eliminar') },
    async ({ hashItemIds }) => {
      const r = await BD.removeFromBlocklist({ hashItemIds });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- POLICIES ---
  server.tool('list_policies',
    'Lista las políticas de seguridad en GravityZone.',
    {
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(30),
    },
    async (p) => {
      const r = await BD.getPoliciesList(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('get_policy_details',
    'Configuración detallada de una política de seguridad.',
    { policyId: z.string().describe('ID de la política') },
    async ({ policyId }) => {
      const r = await BD.getPolicyDetails({ policyId });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  // --- POLICY MANAGEMENT ---
  server.tool('create_policy',
    'Crea una nueva política de seguridad en GravityZone.',
    {
      name: z.string().describe('Nombre de la política'),
      description: z.string().optional().describe('Descripción de la política'),
      inheritedPolicy: z.string().optional().describe('ID de política padre para heredar configuración'),
    },
    async (p) => {
      const r = await BD.createPolicy(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('update_policy',
    'Actualiza el nombre, descripción o configuración de una política existente.',
    {
      policyId: z.string().describe('ID de la política a actualizar'),
      name: z.string().optional().describe('Nuevo nombre'),
      description: z.string().optional().describe('Nueva descripción'),
    },
    async (p) => {
      const r = await BD.updatePolicy(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('set_policy_modules_state',
    'Habilita o deshabilita módulos específicos de una política. Permite configurar antimalware, firewall, network protection, EDR, encryption, blocklist y más.',
    {
      policyId: z.string().describe('ID de la política a modificar'),
      settings: z.object({
        // Antimalware
        'antimalware.onAccess.onAccessScanning': z.enum(['enabled','disabled']).optional(),
        'antimalware.onExecute.cloudBasedThreatDetection': z.enum(['enabled','disabled']).optional(),
        'antimalware.onExecute.advancedThreatControl': z.enum(['enabled','disabled']).optional(),
        'antimalware.onExecute.filelessAttackProtection': z.enum(['enabled','disabled']).optional(),
        'antimalware.onExecute.ransomwareMitigation': z.enum(['enabled','disabled']).optional(),
        'antimalware.antiTampering': z.enum(['enabled','disabled']).optional(),
        'antimalware.hyperDetect': z.enum(['enabled','disabled']).optional(),
        'antimalware.advancedAntiExploit': z.enum(['enabled','disabled']).optional(),
        // Firewall
        'firewall.general.firewall': z.enum(['enabled','disabled']).optional(),
        'firewall.general.ids': z.enum(['enabled','disabled']).optional(),
        // Network Protection
        'networkProtection.general.networkProtection': z.enum(['enabled','disabled']).optional(),
        'networkProtection.general.interceptEncryptedTraffic': z.enum(['enabled','disabled']).optional(),
        'networkProtection.general.scanHttps': z.enum(['enabled','disabled']).optional(),
        'networkProtection.webProtection.antiphishing': z.enum(['enabled','disabled']).optional(),
        'networkProtection.webProtection.webTrafficScan': z.enum(['enabled','disabled']).optional(),
        'networkProtection.webProtection.emailTrafficScan': z.enum(['enabled','disabled']).optional(),
        'networkProtection.networkAttacks.networkAttackDefense': z.enum(['enabled','disabled']).optional(),
        'networkProtection.contentControl.webAccessControl': z.enum(['enabled','disabled']).optional(),
        'networkProtection.contentControl.applicationBlacklist': z.enum(['enabled','disabled']).optional(),
        'networkProtection.contentControl.dataProtection': z.enum(['enabled','disabled']).optional(),
        // Sandbox
        'sandboxAnalyzer.endpointSensor.automaticSampleSubmissionFromManagedEndpoints': z.enum(['enabled','disabled']).optional(),
        // Encryption
        'encryption.general.encryption': z.enum(['enabled','disabled']).optional(),
        // Incidents / EDR
        'incidentsSensor.general.incidentsSensor': z.enum(['enabled','disabled']).optional(),
        // Risk Management
        'riskManagement.phasr': z.enum(['enabled','disabled']).optional(),
        // Blocklist
        'blocklist.blocklist': z.enum(['enabled','disabled']).optional(),
        'blocklist.applicationHash': z.enum(['enabled','disabled']).optional(),
        'blocklist.dllFiles': z.enum(['enabled','disabled']).optional(),
        'blocklist.scriptFiles': z.enum(['enabled','disabled']).optional(),
        'blocklist.applicationPath': z.enum(['enabled','disabled']).optional(),
        'blocklist.networkConnection': z.enum(['enabled','disabled']).optional(),
        // General
        'general.agent.notifications': z.enum(['enabled','disabled']).optional(),
        'general.agent.update.productUpdate': z.enum(['enabled','disabled']).optional(),
        'general.agent.update.securityContentUpdate': z.enum(['enabled','disabled']).optional(),
        'general.policy.details.allowOtherUsersToChangeThisPolicy': z.enum(['enabled','disabled']).optional(),
      }).describe('Módulos a habilitar o deshabilitar. Solo incluye los que quieres cambiar.'),
    },
    async ({ policyId, settings }) => {
      const r = await BD.setPolicyModulesState({ policyId, settings });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('clone_policy',
    'Clona una política existente con toda su configuración. Útil para crear políticas por cliente basadas en una plantilla.',
    {
      policyId: z.string().describe('ID de la política a clonar'),
      name: z.string().describe('Nombre para la nueva política clonada'),
    },
    async (p) => {
      const r = await BD.clonePolicy(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('delete_policy',
    'Elimina una política de seguridad. Asegúrate de que no esté asignada a endpoints.',
    { policyId: z.string().describe('ID de la política a eliminar') },
    async ({ policyId }) => {
      const r = await BD.deletePolicy({ policyId });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('assign_policy_to_endpoints',
    'Asigna una política de seguridad a uno o varios endpoints.',
    {
      endpointIds: z.array(z.string()).describe('IDs de endpoints'),
      policyId: z.string().describe('ID de la política a asignar'),
    },
    async (p) => {
      const r = await BD.assignPoliciesToEndpoints(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  server.tool('assign_policy_to_groups',
    'Asigna una política de seguridad a uno o varios grupos/carpetas.',
    {
      groupIds: z.array(z.string()).describe('IDs de grupos'),
      policyId: z.string().describe('ID de la política a asignar'),
    },
    async (p) => {
      const r = await BD.assignPoliciesToGroups(p);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }
  );

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bitdefender MCP server v2 listening on http://0.0.0.0:${PORT}/mcp`);
  console.log(`Health: http://0.0.0.0:${PORT}/health`);
});
