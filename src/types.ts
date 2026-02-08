export type MemoryCategory =
  | 'architecture'
  | 'conventions'
  | 'patterns'
  | 'debugging'
  | 'decisions'
  | 'preferences'
  | 'general';

export type Importance =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'ephemeral';

export interface Project {
  id: string;
  name: string;
  path: string | null;
  git_remote: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface MemoryItem {
  id: string;
  project_id: string;
  content: string;
  category: MemoryCategory;
  importance: Importance;
  source: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  access_count: number;
  last_accessed: string | null;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface ProjectBriefing {
  project: Project;
  memory_count: number;
  categories: Record<string, MemoryItem[]>;
}

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'architecture',
  'conventions',
  'patterns',
  'debugging',
  'decisions',
  'preferences',
  'general',
];

export const IMPORTANCE_LEVELS: Importance[] = [
  'critical',
  'high',
  'medium',
  'low',
  'ephemeral',
];
