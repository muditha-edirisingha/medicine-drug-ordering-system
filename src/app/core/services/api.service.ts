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

    const backendMessage = this.extractMessage(error.error);
    if (error.status === 400 && backendMessage) {
      return backendMessage;
    }
    if (error.status === 409 && backendMessage) {
      return backendMessage;
    }
    if (error.status === 404 && backendMessage) {
      return backendMessage;
    }
    if (error.status === 400) {
      return 'The backend could not accept this request. Check the entered values.';
    }
    if (error.status === 404) {
      return 'The requested record was not found.';
    }
    if (error.status >= 500) {
      return 'The backend could not complete this request. Please try again.';
    }
    if (backendMessage) {
      return backendMessage;
    }
    return `Request failed (${error.status}). Please try again.`;
  }

  private static extractMessage(errorBody: unknown): string | null {
    if (typeof errorBody === 'string') {
      const value = errorBody.trim();
      return value && value.length < 200 ? value : null;
    }

    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const body = errorBody as ApiErrorBody & Record<string, unknown>;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message && message.length < 200) {
      return message;
    }

    const plainError = typeof body.error === 'string' ? body.error.trim() : '';
    if (plainError && plainError.toLowerCase() !== 'bad request' && plainError.toLowerCase() !== 'conflict' && plainError.toLowerCase() !== 'not found' && plainError.toLowerCase() !== 'internal server error' && plainError.length < 200) {
      return plainError;
    }

    const nestedMessage = typeof body['message'] === 'string' ? body['message'] : null;
    if (nestedMessage && nestedMessage.length < 200) {
      return nestedMessage;
    }

    return null;
  }
}