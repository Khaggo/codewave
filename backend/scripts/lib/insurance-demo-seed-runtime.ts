export function parseEnvFileContents(contents: string) {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      values[key] = value;
    }
  }

  return values;
}

export function applyEnvLayer(
  targetEnv: NodeJS.ProcessEnv,
  values: Record<string, string>,
  options: {
    overwriteKeys?: ReadonlySet<string>;
  } = {},
) {
  const loadedKeys = new Set<string>();

  for (const [key, value] of Object.entries(values)) {
    const shouldOverwrite = options.overwriteKeys?.has(key) ?? false;
    const hasExistingValue = targetEnv[key] !== undefined;

    if (!hasExistingValue || shouldOverwrite) {
      targetEnv[key] = value;
      loadedKeys.add(key);
    }
  }

  return loadedKeys;
}

export function isSeedOwnedText(value: string | null | undefined, tag: string) {
  return typeof value === 'string' && value.includes(tag);
}

export function canReuseSeedVehicle(existingNotes: string | null | undefined, tag: string) {
  return isSeedOwnedText(existingNotes, tag);
}

export function isReservedInsuranceDemoEmail(email: string) {
  return /^demo\.insurance\..+@example\.com$/i.test(email.trim());
}

export function findStaleDemoEmails(
  existingEmails: string[],
  activeDemoEmails: ReadonlySet<string>,
) {
  return existingEmails.filter((email) => {
    const normalizedEmail = email.trim().toLowerCase();
    return isReservedInsuranceDemoEmail(normalizedEmail) && !activeDemoEmails.has(normalizedEmail);
  });
}
