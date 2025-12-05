import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { CsvUploadComponent } from './components/csv-upload/csv-upload.component';
import { ParticipantFormComponent } from './components/participant-form/participant-form.component';
import { PreviewPairsComponent } from './components/preview-pairs/preview-pairs.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  imports: [
    CommonModule,
    CsvUploadComponent,
    ParticipantFormComponent,
    PreviewPairsComponent
  ]
})
export class AppComponent {

  title = 'Secret Santa Generator';

  currentState: 'start' | 'csv' | 'manual' | 'preview' = 'start';

  participants: any[] = [];

  onParticipants(event: any[]) {
    this.participants = event;
    this.currentState = 'preview';
  }

  onParticipantsAdded(event: any) {
    this.participants.push(event);
    // keep user in manual mode to add more
  }
}
