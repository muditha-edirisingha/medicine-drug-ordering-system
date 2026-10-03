import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { ApiErrorBody } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${API_BASE_URL}${path}`);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}${path}`, body);
  }

  postText(path: string, body: unknown): Observable<string> {
    return this.http.post(`${API_BASE_URL}${path}`, body, { responseType: 'text' });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${API_BASE_URL}${path}`, body);
  }

  putText(path: string, body: unknown): Observable<string> {
    return this.http.put(`${API_BASE_URL}${path}`, body, { responseType: 'text' });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${API_BASE_URL}${path}`);
  }

  deleteText(path: string): Observable<string> {
    return this.http.delete(`${API_BASE_URL}${path}`, { responseType: 'text' });
  }

  static messageFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Something went wrong. Please try again.';
    }

    if (error.status === 0) {
      return 'Cannot reach the backend. Check that it is running at localhost:8080.';
    }

    const body = error.error as ApiErrorBody | string | null;
    if (error.status === 400) {
      return 'The backend could not accept this request. Check the entered values.';
    }
    if (error.status === 404) {
      return 'The requested record was not found.';
    }
    if (error.status >= 500) {
      return 'The backend could not complete this request. Please try again.';
    }

    if (typeof body === 'object' && body?.message && body.message.length < 160) {
      return body.message;
    }
    return `Request failed (${error.status}). Please try again.`;
  }
}