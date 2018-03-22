import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class TeamService {

  constructor(public http: HttpClient) { }

  fetchTeams(bracket: string, realm: string): Observable<any> {
    return this.http.get(`${bracket}/${realm}`, {
      responseType: 'text'
    });
  }

  fetchTeamInfo(team: string): Observable<any> {
    return this.http.get(`${team}`, {
      responseType: 'text'
    });
  }
}