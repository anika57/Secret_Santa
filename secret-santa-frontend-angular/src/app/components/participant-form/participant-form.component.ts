import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Participant } from '../../services/santa.service';

@Component({
  selector: 'app-participant-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './participant-form.component.html',
  styleUrls: ['./participant-form.component.css'],
})
export class ParticipantFormComponent {

  @Output() participantAdded = new EventEmitter<Participant>();

  name: string = '';
  email: string = '';
  notes: string = '';

  add() {
    if (!this.name.trim()) return;

    const participant: Participant = { 
      name: this.name,
      email: this.email || undefined,
      notes: this.notes || undefined
    };

    this.participantAdded.emit(participant);

    this.name = '';
    this.email = '';
    this.notes = '';
  }
}
