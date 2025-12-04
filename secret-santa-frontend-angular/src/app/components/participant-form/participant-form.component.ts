import { Component, EventEmitter, Output } from '@angular/core'; // <-- Import EventEmitter and Output
import { FormsModule } from '@angular/forms';
import { Participant } from '../../services/santa.service'; // Assuming Participant interface is imported

@Component({
  selector: 'app-participant-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './participant-form.component.html',
  styleUrls: ['./participant-form.component.css'],
})
export class ParticipantFormComponent {

  @Output() participantAdded = new EventEmitter<Participant>(); // <-- ADD THIS @Output

  name: string = '';
  email: string = '';
  notes: string = '';

  add() {
    // Cast to Participant type if necessary, or just use the structure
    const participant: Participant = { 
      name: this.name,
      email: this.email || undefined, // Use undefined if email is empty string
      notes: this.notes || undefined  // Use undefined if notes is empty string
    };

    console.log("Participant added:", participant);

    // FIX: Emit the event so the parent component knows
    this.participantAdded.emit(participant); // <-- EMIT THE EVENT

    // Clear inputs after adding
    this.name = '';
    this.email = '';
    this.notes = '';
  }
}