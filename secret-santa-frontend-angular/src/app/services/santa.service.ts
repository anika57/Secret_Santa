import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Participant {
  name: string;
  email?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SantaService {
  private base = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Unified upload endpoint for CSV/XLSX
  uploadFile(formData: FormData): Observable<Participant[]> {
    return this.http.post<Participant[]>(`${this.base}/upload`, formData);
  }

  generatePairs(participants: Participant[]): Observable<{giver: Participant, receiver: Participant}[]> {
    return this.http.post<{giver: Participant, receiver: Participant}[]>(`${this.base}/pair`, { participants });
  }

  sendEmails(pairs: {giver: Participant, receiver: Participant}[]): Observable<any> {
    return this.http.post(`${this.base}/send-emails`, { pairs });
  }
}
