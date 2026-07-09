const http = require('http');
const { normalizeDonors, readStorageFile, syncToGitHub, writeStorageFile, getStoragePath } = require('./github-storage');

const port = Number(process.env.PORT || 3000);
const storagePath = getStoragePath();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function readDonors() {
  const data = readStorageFile(storagePath);
  return normalizeDonors(data.donors);
}

async function saveDonors(donors) {
  const writeResult = writeStorageFile(donors, storagePath);
  try {
    const syncResult = await syncToGitHub(donors);
    return { donors, storagePath: writeResult.storagePath, syncResult };
  } catch (error) {
    return { donors, storagePath: writeResult.storagePath, syncError: error.message };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, storagePath }));
    return;
  }

  if (url.pathname !== '/donors') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    if (req.method === 'GET') {
      const donors = await readDonors();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(donors));
      return;
    }

    if (req.method === 'DELETE') {
      const result = await saveDonors([]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.donors));
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const existingDonors = await readDonors();
      const nextDonors = Array.isArray(body) ? body : [...existingDonors, body];
      const result = await saveDonors(nextDonors);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.donors));
      return;
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

server.listen(port, () => {
  console.log(`Blood donor server listening on http://localhost:${port}`);
  console.log(`Storage file: ${storagePath}`);
});
