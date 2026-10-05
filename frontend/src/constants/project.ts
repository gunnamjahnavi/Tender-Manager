export const PROJECT_STAGES = [
  'Go Decision',
  'Team Allocated',
  'Exec Summary',
  'Site Visit',
  'Pre-Bid Queries',
  'Value Engg.',
  'Bid Preparation',
  'Internal Review',
  'Bid Submitted',
];

export const PREDEFINED_TASKS = [
  'Reading Tender Documents',
  'Circulation of Tender Documents to Stakeholders',
  'Pre-Bid Query Consolidation',
  'Pre-Bid Reply Circulation',
  'Risk Review Slide Preparation',
  'Quantity Estimation',
  'Executive Summary',
  'Competitor Analysis',
  'Technical Summary',
];

export const VALID_PROJECT_STATUSES = ['In Progress', 'Completed', 'Bid Dropped'] as const;

export const UPDATABLE_PROJECT_STATUSES = ['In Progress', 'Completed'] as const;

export type ProjectStatus = (typeof VALID_PROJECT_STATUSES)[number];

export function isBidDroppedProject(project: { status?: string; bidDropped?: boolean }): boolean {
  return !!(project.bidDropped || project.status === 'Bid Dropped' || project.status === 'Dropped');
}

export function getDisplayStatus(project: { status?: string; bidDropped?: boolean }): ProjectStatus {
  if (isBidDroppedProject(project)) return 'Bid Dropped';
  if (project.status === 'Completed') return 'Completed';
  return 'In Progress';
}

export function getStatusPillClass(status: ProjectStatus): string {
  if (status === 'Completed') return 'active';
  if (status === 'Bid Dropped') return 'danger';
  return 'warning';
}

export function getProjectStages(project: { pipelineStages?: any[] }): string[] {
  if (!Array.isArray(project.pipelineStages) || project.pipelineStages.length === 0) {
    return PROJECT_STAGES;
  }

  return project.pipelineStages
    .map((stage) => typeof stage === 'string' ? stage : stage?.name)
    .filter(Boolean);
}

export function getProjectStageDeadlines(project: { pipelineStages?: any[] }): Record<string, string | null> {
  if (!Array.isArray(project.pipelineStages)) return {};

  return project.pipelineStages.reduce((deadlines, stage) => {
    if (typeof stage === 'string') return deadlines;
    if (stage?.name) deadlines[stage.name] = stage.deadline || null;
    return deadlines;
  }, {} as Record<string, string | null>);
}
