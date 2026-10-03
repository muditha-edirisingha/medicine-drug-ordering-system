import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiRecord } from '../models/api.models';
import { RESOURCE_BY_KEY, ResourceDefinition, SearchRoute } from '../models/resource.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ResourceDataService {
  constructor(private readonly api: ApiService) {}

  definition(key: string): ResourceDefinition | undefined {
    return RESOURCE_BY_KEY.get(key);
  }

  list(key: string): Observable<ApiRecord[]> {
    const definition = this.requireDefinition(key);
    return this.api.get<ApiRecord[]>(definition.listPath).pipe(
      map(records => (Array.isArray(records) ? records : [])),
    );
  }

  search(definition: ResourceDefinition, route: SearchRoute, value: string): Observable<ApiRecord[]> {
    const path = `${route.path}/${encodeURIComponent(value.trim())}`;
    return this.api.get<unknown>(path).pipe(
      map(result => this.normalizeSearchResult(definition, result)),
    );
  }

  create(definition: ResourceDefinition, payload: ApiRecord): Observable<unknown> {
    return definition.stringResponses
      ? this.api.postText(definition.createPath, payload)
      : this.api.post<unknown>(definition.createPath, payload);
  }

  update(definition: ResourceDefinition, payload: ApiRecord): Observable<unknown> {
    return definition.stringResponses
      ? this.api.putText(definition.updatePath, payload)
      : this.api.put<unknown>(definition.updatePath, payload);
  }

  delete(definition: ResourceDefinition, id: string | number): Observable<unknown> {
    const path = definition.deletePath(id);
    return definition.stringResponses ? this.api.deleteText(path) : this.api.delete<unknown>(path);
  }

  lowStock(definition: ResourceDefinition): Observable<ApiRecord[]> {
    if (!definition.lowStockPath) {
      return this.list(definition.key);
    }
    return this.api.get<ApiRecord[]>(definition.lowStockPath).pipe(
      map(records => (Array.isArray(records) ? records : [])),
    );
  }

  private requireDefinition(key: string): ResourceDefinition {
    const definition = this.definition(key);
    if (!definition) {
      throw new Error(`Unknown resource: ${key}`);
    }
    return definition;
  }

  private normalizeSearchResult(definition: ResourceDefinition, result: unknown): ApiRecord[] {
    const values = Array.isArray(result) ? result : result && typeof result === 'object' ? [result] : [];
    return values
      .filter((value): value is ApiRecord => typeof value === 'object' && value !== null)
      .map(value => {
        if (definition.key === 'orders' && value['customer'] && typeof value['customer'] === 'object') {
          const customer = value['customer'] as ApiRecord;
          return { ...value, customerId: customer['customerId'] };
        }
        return value;
      });
  }
}