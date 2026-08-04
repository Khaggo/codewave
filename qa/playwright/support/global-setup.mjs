import fs from 'node:fs';
import path from 'node:path';

import { startStaticServer } from './serve-static.mjs';

const staticMobileExportDir = path.resolve('mobile/.runtime/qa-mobile-web-export');
const staticMobileExportIndex = path.join(staticMobileExportDir, 'index.html');
const staticMobilePort = 8095;
const staticMobileUrl = `http://127.0.0.1:${staticMobilePort}`;

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  if (
    process.env.QA_MOBILE_BASE_URL ||
    process.env.QA_USE_STATIC_MOBILE_EXPORT !== 'true' ||
    !fs.existsSync(staticMobileExportIndex)
  ) {
    return undefined;
  }

  if (await isReachable(staticMobileUrl)) {
    return undefined;
  }

  const server = await startStaticServer(staticMobileExportDir, staticMobilePort);

  return async () => {
    await new Promise((resolve) => server.close(resolve));
  };
}
