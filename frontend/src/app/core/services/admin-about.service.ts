import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface About {
  _id: string;
  bio: string;
  title: string;
  photoUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAboutService {
  private baseUrl = 'http://localhost:3000/api/v1/about';

  constructor(private http: HttpClient) {}

  getAbout(): Observable<{ about: About[] }> {
    return this.http.get<{ about: About[] }>(this.baseUrl);
  }

  createAbout(data: FormData): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  updateAbout(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

  deleteAbout(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
