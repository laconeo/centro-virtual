import fs from 'node:fs';
import path from 'node:path';

// 1. Leer credenciales de .env
const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1].trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmed.split('=')[1].trim();
    }
  }
}

// Si el usuario pasa la SERVICE_ROLE_KEY por variable de entorno, se usa con prioridad
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  console.log('🔑 Usando SUPABASE_SERVICE_ROLE_KEY (Acceso administrador completo).');
} else {
  console.log('ℹ️ Usando VITE_SUPABASE_ANON_KEY del archivo .env.');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: No se encontraron las credenciales en .env');
  process.exit(1);
}

// Lista de tablas del proyecto
const tables = [
  'roles',
  'volunteers',
  'sessions',
  'messages',
  'shifts',
  'topics',
  'surveys',
  'volunteer_logins',
  'extension_installs'
];

// Conversor simple de JSON a CSV (sin dependencias externas)
function jsonToCSV(items) {
  if (!items || items.length === 0) return '';
  const headers = Array.from(new Set(items.flatMap(obj => Object.keys(obj))));
  const escapeValue = (val) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeValue).join(',');
  const rows = items.map(item => headers.map(h => escapeValue(item[h])).join(','));
  return [headerRow, ...rows].join('\r\n');
}

async function fetchTableData(table) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${supabaseUrl}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    rows.push(...data);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return rows;
}

async function runBackup() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const folderName = `backup_${dateStr}_${timeStr}`;
  const backupDir = path.resolve('backups', folderName);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`\n==================================================`);
  console.log(`📦 RESPALDO DE BASE DE DATOS SUPABASE (SIN DOCKER)`);
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log(`📁 Carpeta destino: backups/${folderName}/`);
  console.log(`==================================================\n`);

  const fullBackup = {};
  let totalRecords = 0;

  for (const table of tables) {
    try {
      process.stdout.write(`⏳ Descargando [${table}]... `);
      const data = await fetchTableData(table);
      fullBackup[table] = data;
      totalRecords += data.length;

      // Guardar en formato JSON
      fs.writeFileSync(
        path.join(backupDir, `${table}.json`),
        JSON.stringify(data, null, 2),
        'utf8'
      );

      // Guardar en formato CSV (compatible con Excel)
      const csv = jsonToCSV(data);
      fs.writeFileSync(
        path.join(backupDir, `${table}.csv`),
        csv,
        'utf8'
      );

      console.log(`✅ ${data.length} registros guardados.`);
    } catch (err) {
      console.log(`⚠️ Error: ${err.message}`);
      fullBackup[table] = { error: err.message };
    }
  }

  // Guardar archivo consolidado completo
  const masterFile = path.join(backupDir, `_backup_completo.json`);
  fs.writeFileSync(masterFile, JSON.stringify(fullBackup, null, 2), 'utf8');

  console.log(`\n==================================================`);
  console.log(`🎉 Respaldo finalizado con éxito!`);
  console.log(`📊 Total de registros descargados: ${totalRecords}`);
  console.log(`📂 Archivos generados en: backups/${folderName}/`);
  console.log(`   - Cada tabla en formato .json y .csv`);
  console.log(`   - Archivo consolidado: _backup_completo.json`);
  console.log(`==================================================\n`);
}

runBackup();
