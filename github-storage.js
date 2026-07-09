const fs = require('fs');
const path = require('path');

function normalizeDonors(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDonors(localDonors, remoteDonors) {
  const remote = normalizeDonors(remoteDonors);
  if (remote.length > 0) {
    return remote;
  }
  return normalizeDonors(localDonors);
}

function encodeDonorsForUrl(donors) {
  const payload = JSON.stringify(normalizeDonors(donors));
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(payload, 'utf8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(payload)));
}

function decodeDonorsFromUrl(value) {
  if (!value) {
    return [];
  }

  try {
    let payload = value;
    if (typeof Buffer !== 'undefined') {
      payload = Buffer.from(value, 'base64').toString('utf8');
    } else {
      payload = decodeURIComponent(escape(atob(value)));
    }
    return normalizeDonors(JSON.parse(payload));
  } catch (error) {
    return [];
  }
}

function buildFilePayload(donors) {
  return JSON.stringify({ donors: normalizeDonors(donors) }, null, 2);
}

function getStoragePath(customPath) {
  return path.resolve(process.cwd(), customPath || process.env.STORAGE_FILE || process.env.GITHUB_FILE_PATH || 'db.json');
}

function readStorageFile(storagePath = getStoragePath()) {
  if (!fs.existsSync(storagePath)) {
    return { donors: [] };
  }

  const raw = fs.readFileSync(storagePath, 'utf8').trim();
  if (!raw) {
    return { donors: [] };
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return { donors: [] };
  }
}

function writeStorageFile(donors, storagePath = getStoragePath()) {
  const payload = buildFilePayload(donors);
  fs.writeFileSync(storagePath, payload, 'utf8');
  return { storagePath, payload };
}

async function syncToGitHub(donors, options = {}) {
  const repo = options.repo || process.env.GITHUB_REPO;
  const token = options.token || process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    return {
      mode: 'local-file',
      message: 'GitHub sync skipped: missing GITHUB_REPO or GITHUB_TOKEN',
    };
  }

  const filePath = options.filePath || process.env.GITHUB_FILE_PATH || 'db.json';
  const payload = buildFilePayload(donors);
  const content = Buffer.from(payload).toString('base64');
  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let sha = null;
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const current = await response.json();
      sha = current.sha;
    }
  } catch (error) {
    console.warn('Unable to read existing GitHub file:', error.message);
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: options.message || 'Update blood donor data',
      content,
      sha,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub sync failed: ${response.status} ${text}`);
  }

  return { mode: 'github', repo, filePath };
}

module.exports = {
  buildFilePayload,
  decodeDonorsFromUrl,
  encodeDonorsForUrl,
  getStoragePath,
  mergeDonors,
  normalizeDonors,
  readStorageFile,
  syncToGitHub,
  writeStorageFile,
};
