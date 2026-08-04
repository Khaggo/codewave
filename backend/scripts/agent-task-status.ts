export const taskStatuses = [
  'planned',
  'ready',
  'in_progress',
  'blocked',
  'done',
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export type TaskStatusInspection = {
  status: TaskStatus | null;
  errors: string[];
};

const statusSectionPattern = /^## Status\s*\r?\n+\s*`([^`]+)`/gmu;

export const inspectTaskStatus = (
  relativePath: string,
  contents: string,
): TaskStatusInspection => {
  const matches = [...contents.matchAll(statusSectionPattern)];

  if (matches.length === 0) {
    return {
      status: null,
      errors: [
        `${relativePath}: missing canonical "## Status" section with a backticked value.`,
      ],
    };
  }

  if (matches.length > 1) {
    return {
      status: null,
      errors: [`${relativePath}: contains more than one "## Status" section.`],
    };
  }

  const value = matches[0][1].trim();
  if (!taskStatuses.includes(value as TaskStatus)) {
    return {
      status: null,
      errors: [
        `${relativePath}: unsupported task status "${value}"; expected one of ${taskStatuses.join(
          ', ',
        )}.`,
      ],
    };
  }

  return {
    status: value as TaskStatus,
    errors: [],
  };
};
