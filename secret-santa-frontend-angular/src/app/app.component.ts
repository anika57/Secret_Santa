import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { CsvUploadComponent } from './components/csv-upload/csv-upload.component';
import { ParticipantFormComponent } from './components/participant-form/participant-form.component';
import { PreviewPairsComponent } from './components/preview-pairs/preview-pairs.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: [],
  imports: [
    CommonModule,
    CsvUploadComponent,
    ParticipantFormComponent,
    PreviewPairsComponent
  ]
})
export class AppComponent {
  title = 'Secret Santa Generator';

  // 🎄 NEW: State variable to control which view is currently shown (start, csv, manual, preview)
  currentState: 'start' | 'csv' | 'manual' | 'preview' = 'start'; 

  participants: any[] = [];

  // Handles participants loaded from CSV upload
  onParticipants(event: any[]) {
    this.participants = event;
    // Automatically switch to the preview step after a CSV upload
    this.currentState = 'preview'; 
  }

  // Handles participants added manually from the form
  onParticipantsAdded(event: any) {
    this.participants.push(event);
    // Stay in 'manual' state to allow adding more participants
  }
}