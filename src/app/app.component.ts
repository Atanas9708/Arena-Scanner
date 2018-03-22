import { Component } from '@angular/core';
import { TeamService } from './services/teams.service';
import { NotificationService } from './services/notification.service';

const url = 'https://armory.warmane.com';

const teamRegex = /<td><a href="((?:\/team|\/character).+)"/g;
const timeRegex = /([1-9]|[1-5][0-9]|60) (seconds|second|minutes|minute) ago/g;
const teamNameRegex = /<div class="name">([a-zA-Z ]+)(<span.+)?<\/div>/g;
const soloQRatingRegex = /SoloQ Rating\n\s+?<span .+>(\d+)<\/span>/g;
const soloQGames = /<span class="history-(?:win|loss)">(?:\+?)0<\/span>/g;
const teamRatingRegex = /<td>(\d+)<\/td>/g;
const playerInfoPattern = /\/character\/([a-zA-Z]+)\/([a-z-A-Z]+)\/summary.*?src="(\/images\/icons\/classes\/\d+.gif)"/;
const playerInfoRegex = new RegExp(playerInfoPattern, 'gs');
const lastGamePattern = /(?:<span class="history-(?:win|loss)">(?:\+|-?)\d+<\/span>)(?!.*<span class="history-(?:win|loss)">(?:\+|-?)\d+<\/span>)/;
const lastGame = new RegExp(lastGamePattern, 'gs');
const classRegex = /Level \d+ [a-zA-Z]+(?:\s?[a-zA-Z]+)? ([a-zA-Z]+)/g;

const classes = {
  Warrior: '1',
  Paladin: '2',
  Hunter: '3',
  Rogue: '4',
  Priest: '5',
  DeathKnight: '6',
  Shaman: '7',
  Mage: '8',
  Warlock: '9',
  Druid: '11'
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  public bracket: string;
  public realm: string;
  public playingTeams: object[] = [];
  public fetching: boolean;
  public noTeams: boolean;

  constructor(public teamService: TeamService, public notify: NotificationService) { }

  onChange(): void {

    if (this.realm && this.bracket) {

      this.fetching = true;

      if (this.bracket === 'SoloQ' && this.realm !== 'Blackrock') {
        this.notify.errorAlert('Only Blackrock has a SoloQ bracket!');
        this.fetching = false;
        return;
      }

      if (this.bracket === '5v5' && this.realm === 'Blackrock') {
        this.notify.errorAlert('Blackrock does not have a 5v5 bracket!');
        this.fetching = false;
        return;
      }

      let selectInputs = document.getElementsByTagName('select');
      for (let i = 0; i < selectInputs.length; i++) {
        selectInputs[i].setAttribute('disabled', '');
      }

      let ladder: string[] = [];
      this.playingTeams = [];
      this.noTeams = undefined;

      this.teamService.fetchTeams(this.bracket, this.realm).subscribe(res => {
        let teamMatch;

        while (teamMatch = teamRegex.exec(res)) {
          ladder.push(teamMatch[1].replace('summary', 'match-history'));
        }

        for (let i = 0; i < ladder.length; i++) {

          this.teamService.fetchTeamInfo(ladder[i]).subscribe(teamRes => {

            let name: string;
            let time: string;
            let timeMatch: any = timeRegex.exec(teamRes);
            timeRegex.lastIndex = 0;

            if (i + 1 === ladder.length && this.noTeams === undefined && !timeMatch) {
              this.fetching = false;
              this.noTeams = true;
              setTimeout(() => {
                for (let i = 0; i < selectInputs.length; i++) {
                  selectInputs[i].removeAttribute('disabled');
                }
              }, 2000);
              return;
            }

            let lastGameSoloQMatch: any = lastGame.exec(teamRes);
            let lastGameIsSoloQ: boolean = false;
            if (lastGameSoloQMatch) {
              lastGameIsSoloQ = soloQGames.test(lastGameSoloQMatch[0]);
            }
            soloQGames.lastIndex = 0;
            lastGame.lastIndex = 0;

            if (this.bracket === 'SoloQ' && !lastGameIsSoloQ) {
              return;
            }

            while (timeMatch) {

              name = teamNameRegex.exec(teamRes)[1].trim();
              teamNameRegex.lastIndex = 0;
              this.noTeams = false;

              time = `${timeMatch[1]} ${timeMatch[2]}`;

              this.teamService.fetchTeamInfo(ladder[i].replace('match-history', 'summary'))
                .subscribe(res => {
                  let rating: string;
                  let players: object[] = [];

                  let isExistent: boolean = this.playingTeams.filter(e => e['teamName'] === name).length > 0;

                  if (this.bracket === 'SoloQ' && lastGameIsSoloQ) {
                    if (soloQRatingRegex.test(res)) {
                      soloQRatingRegex.lastIndex = 0;
                      rating = soloQRatingRegex.exec(res)[1];
                    }

                    let classMatch = classRegex.exec(teamRes);
                    classRegex.lastIndex = 0;

                    if (!isExistent) {
                      this.playingTeams.push({
                        teamName: name,
                        classImg: `images/icons/classes/${classes[classMatch[1]]}.gif`,
                        rank: i + 1,
                        rating,
                        time
                      })
                    }

                    soloQRatingRegex.lastIndex = 0;

                  } else {
                    let teamRatingMatch;
                    while (teamRatingMatch = teamRatingRegex.exec(res)) {
                      rating = teamRatingMatch[1];
                    }

                    let playerInfoMatch;

                    while (playerInfoMatch = playerInfoRegex.exec(res)) {
                      players.push({
                        name: playerInfoMatch[1],
                        realm: playerInfoMatch[2],
                        class: playerInfoMatch[3]
                      });
                    }

                    if (!isExistent) {
                      this.playingTeams.push({
                        teamName: name,
                        rank: i + 1,
                        rating,
                        players,
                        time
                      })
                    } else {
                      this.playingTeams.forEach(t => {
                        if (t['teamName'] === name) {
                          t['time'] = time;
                        }
                      })
                    }

                  }

                  this.fetching = false;
                  setTimeout(() => {
                    for (let i = 0; i < selectInputs.length; i++) {
                      selectInputs[i].removeAttribute('disabled');
                    }
                  }, 2000);
                })

              timeMatch = timeRegex.exec(teamRes);
            }
          })
        }
      })
    }
  }

  openPlayerArmory(e, player: object): void {
    e.preventDefault();
    window.open(`${url}/character/${player['name']}/${player['realm']}/summary`);
  }

  openTeamArmory(e, team: object): void {
    e.preventDefault();
    let name = team['teamName'].replace(' ', '+');
    let type: string;
    !team.hasOwnProperty('players') ? type = 'character' : type = 'team';
    window.open(`${url}/${type}/${name}/${this.realm}/summary`);
  }

  refresh(): void {
    this.onChange();
  }
}
