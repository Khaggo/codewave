export const expectedPublicSchemaFromSnapshot = (snapshot) => {
  const schema = new Map();

  for (const table of Object.values(snapshot.tables ?? {})) {
    if ((table.schema || 'public') !== 'public') continue;
    schema.set(table.name, new Set(Object.keys(table.columns ?? {})));
  }

  return schema;
};

export const actualPublicSchemaFromRows = (rows) => {
  const schema = new Map();

  for (const row of rows) {
    if (!schema.has(row.table_name)) {
      schema.set(row.table_name, new Set());
    }
    schema.get(row.table_name).add(row.column_name);
  }

  return schema;
};

export const comparePublicSchemas = (expected, actual) => {
  const missingTables = [...expected.keys()]
    .filter((table) => !actual.has(table))
    .sort();
  const extraTables = [...actual.keys()]
    .filter((table) => !expected.has(table))
    .sort();
  const missingColumns = [];
  const extraColumns = [];

  for (const [table, expectedColumns] of expected) {
    const actualColumns = actual.get(table);
    if (!actualColumns) continue;

    for (const column of expectedColumns) {
      if (!actualColumns.has(column)) {
        missingColumns.push(`${table}.${column}`);
      }
    }
    for (const column of actualColumns) {
      if (!expectedColumns.has(column)) {
        extraColumns.push(`${table}.${column}`);
      }
    }
  }

  return {
    missingTables,
    extraTables,
    missingColumns: missingColumns.sort(),
    extraColumns: extraColumns.sort(),
  };
};

export const hasSchemaDrift = (drift) =>
  Object.values(drift).some((entries) => entries.length > 0);

export const formatSchemaDrift = (drift) =>
  Object.entries(drift)
    .filter(([, entries]) => entries.length > 0)
    .map(([kind, entries]) => `${kind}: ${entries.join(', ')}`)
    .join('; ');
