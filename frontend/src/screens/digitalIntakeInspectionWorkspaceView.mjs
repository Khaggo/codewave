export const getIntakeWorkspaceHeroCopy = (isTechnician) =>
  isTechnician
    ? {
        title: 'Capture Vehicle Condition And Workshop Findings',
        description: 'Review history and save vehicle findings before and after service.',
      }
    : {
        title: 'Capture Vehicle Condition Before Release Decisions',
        description: 'Record intake, pre-repair, completion, and return findings per vehicle.',
      }
