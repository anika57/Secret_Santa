import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SantaService, Participant } from '../../services/santa.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'preview-pairs',
  templateUrl: './preview-pairs.component.html',
  imports: [CommonModule],
  styleUrls: ['./preview-pairs.component.css'],
})
export class PreviewPairsComponent implements OnChanges {
  @Input() participants: Participant[] = [];
  
  // keep pairs internally but never show in UI
  pairs: { giver: Participant; receiver: Participant }[] = [];

  loading = false;
  error = '';
  pairsGenerated = false; // NEW FLAG

  constructor(private santa: SantaService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['participants']) {
      this.pairs = [];
      this.pairsGenerated = false;
    }
  }

  generate() {
    if (!this.participants || this.participants.length < 2) {
      this.error = 'Need at least 2 participants';
      return;
    }

    this.error = '';
    this.loading = true;

    this.santa.generatePairs(this.participants).subscribe({
      next: (res) => {
        this.pairs = res;
        this.loading = false;
        this.pairsGenerated = true; // set success flag
      },
      error: (err) => {
        this.error = err?.message || 'Failed to generate';
        this.loading = false;
      }
    });
  }

  sendEmails() {
    if (!this.pairsGenerated || !this.pairs.length) return;

    this.santa.sendEmails(this.pairs).subscribe({
      next: () => alert('Emails dispatched (server-side).'),
      error: (e) => alert('Email sending failed: ' + (e?.message || e))
    });
  }
}
