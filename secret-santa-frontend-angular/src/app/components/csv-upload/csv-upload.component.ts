import { Component, EventEmitter, Output } from '@angular/core';
import { SantaService, Participant } from '../../services/santa.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'csv-upload',
  templateUrl: './csv-upload.component.html',
  styleUrls: ['./csv-upload.component.css'],
  imports: [CommonModule],
})
export class CsvUploadComponent {
  @Output() participantsLoaded = new EventEmitter<Participant[]>();
  file?: File;
  loading = false;
  error = '';

  constructor(private santa: SantaService) {}

  onFileChange(e: any) {
    this.error = '';
    const f: File = e.target.files[0];
    if (f) this.file = f;
    else this.file = undefined;
  }

  upload() {
    if (!this.file) {
      this.error = 'Please select a CSV or XLSX file.';
      return;
    }

    const fd = new FormData();
    fd.append('file', this.file, this.file.name);

    this.loading = true;

    this.santa.uploadFile(fd).subscribe({
      next: (res) => {
        this.loading = false;
        this.participantsLoaded.emit(res);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'Upload failed';
      }
    });
  }
}
