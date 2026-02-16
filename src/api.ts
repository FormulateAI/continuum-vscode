import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import {
  Project,
  MemoryItem,
  MemorySearchResult,
  ProjectBriefing,
  MemoryCategory,
  Importance,
} from './types';

export function formatApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNREFUSED') {
      return 'Cannot connect to Continuum server. Is it running?';
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      return 'Continuum server request timed out.';
    }
    if (err.response) {
      const status = err.response.status;
      const detail = err.response.data?.detail;
      if (detail) {
        return `Continuum server error (${status}): ${detail}`;
      }
      return `Continuum server error (${status}).`;
    }
    if (err.message) {
      return `Continuum request failed: ${err.message}`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred.';
}

export class ContinuumClient {
  private http: AxiosInstance;

  constructor(serverUrl: string) {
    this.http = axios.create({
      baseURL: serverUrl,
      timeout: 10000,
    });
  }

  static fromSettings(): ContinuumClient {
    const config = vscode.workspace.getConfiguration('continuum');
    const serverUrl = config.get<string>('serverUrl', 'http://localhost:8000');
    return new ContinuumClient(serverUrl);
  }

  async healthCheck(): Promise<{ status: string; version: string }> {
    const resp = await this.http.get('/');
    return resp.data;
  }

  async findOrCreateProject(
    name: string,
    path?: string,
    gitRemote?: string,
  ): Promise<Project> {
    const resp = await this.http.post('/v2/projects', {
      name,
      path: path ?? null,
      git_remote: gitRemote ?? null,
    });
    return resp.data;
  }

  async listProjects(): Promise<Project[]> {
    const resp = await this.http.get('/v2/projects');
    return resp.data;
  }

  async storeMemory(
    projectId: string,
    content: string,
    category: MemoryCategory = 'general',
    importance: Importance = 'medium',
    source?: string,
    tags: string[] = [],
  ): Promise<MemoryItem> {
    const resp = await this.http.post('/v2/memories', {
      project_id: projectId,
      content,
      category,
      importance,
      source: source ?? null,
      tags,
    });
    return resp.data;
  }

  async searchMemories(
    query: string,
    projectId?: string,
    categories?: MemoryCategory[],
    limit: number = 10,
  ): Promise<MemorySearchResult[]> {
    const body: Record<string, unknown> = { query, limit };
    if (projectId) { body.project_id = projectId; }
    if (categories) { body.categories = categories; }
    const resp = await this.http.post('/v2/memories/search', body);
    return resp.data;
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.http.delete(`/v2/memories/${memoryId}`);
  }

  async getProjectContext(projectId: string): Promise<ProjectBriefing> {
    const resp = await this.http.get(`/v2/projects/${projectId}/context`);
    return resp.data;
  }

  async getWorkspaceProject(): Promise<Project | undefined> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }
    const folder = folders[0];
    const name = folder.name;
    const path = folder.uri.fsPath;
    return this.findOrCreateProject(name, path);
  }
}
