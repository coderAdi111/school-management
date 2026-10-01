
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableEntry, TimetableService } from '../../services/timetable.service';
import { firstValueFrom, timeout, finalize } from 'rxjs';

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.css'
})
export class TimetableComponent implements OnInit {

  readonly days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  section: 'I1' | 'I2' = 'I1';

  entries: TimetableEntry[] = [];

  loading = false;
  saving = false;
  error = '';

  editingId: number | null = null;

  form: TimetableEntry = this.blank();

  importPreview: TimetableEntry[] = [];
  importFileName = '';
  importing = false;
  importMessage = '';

  ocrText = '';
  ocrBusy = false;

 constructor(
  private service: TimetableService,
  private cdr: ChangeDetectorRef
) {}

  ngOnInit(): void {
    this.load();
  }

  blank(): TimetableEntry {
    return {
      branch: 'IT',
      semester: 5,
      section: this.section,
      dayOfWeek: 'Monday',
      subject: '',
      faculty: '',
      room: '',
      startTime: '09:00',
      endTime: '10:00',
      practical: false
    };
  }

  // LOAD TIMETABLE
 load(): void {
  this.loading = true;
  this.error = '';

  this.cdr.detectChanges();

  this.service.get(this.section)
    .pipe(
      timeout({ first: 20000 }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (data) => {
  this.entries = Array.isArray(data) ? data : [];

  console.log('Timetable loaded:', this.entries);

  this.loading = false;
  this.cdr.detectChanges();
},

      error: (err) => {
        console.error('Timetable load error:', err);

        this.entries = [];
        this.loading = false;

        if (err?.name === 'TimeoutError') {
          this.error =
            'Server se 20 seconds mein response nahi aaya. Please Refresh karein.';
        } else {
          this.error =
            'Timetable load nahi ho paayi. Backend/API check karein.';
        }

        this.cdr.detectChanges();
      }
    });
}

  // CHANGE SECTION
  changeSection(): void {
    this.cancelEdit();
    this.load();
  }

  // ADD / UPDATE TIMETABLE ENTRY
  save(): void {

    if (
      !this.form.subject.trim() ||
      !this.form.startTime ||
      !this.form.endTime ||
      this.form.startTime >= this.form.endTime
    ) {
      this.error =
        'Subject aur valid start/end time enter karein.';
      return;
    }

    if (this.saving) {
      return;
    }

    this.saving = true;
    this.error = '';

    const payload: TimetableEntry = {
      ...this.form,
      branch: 'IT',
      semester: 5,
      section: this.section,
      subject: this.form.subject.trim()
    };

    const request = this.editingId
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);

    request.pipe(
      timeout({ first: 20000 })
    ).subscribe({

      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.load();
      },

      error: err => {
        console.error('Timetable save error:', err);

        this.saving = false;

        if (err.name === 'TimeoutError') {
          this.error =
            'Server se 20 seconds mein response nahi aaya. Internet aur backend API check karein.';
        } else {
          this.error =
            'Save nahi hua. Browser console aur backend logs check karein.';
        }
      }

    });
  }

  // EDIT ENTRY
  edit(entry: TimetableEntry): void {
    this.editingId = entry.id ?? null;
    this.form = { ...entry };
  }

  // CANCEL EDIT
  cancelEdit(): void {
    this.editingId = null;
    this.form = this.blank();
    this.error = '';
  }

  // DELETE ENTRY
  remove(entry: TimetableEntry): void {

    if (
      !entry.id ||
      !confirm(`Delete ${entry.subject} from ${this.section} timetable?`)
    ) {
      return;
    }

    this.service.delete(entry.id).subscribe({

      next: () => {
        this.load();
      },

      error: err => {
        console.error('Timetable delete error:', err);
        this.error = 'Entry delete nahi hui.';
      }

    });
  }

  // CSV LINE PARSER
  private parseCsvLine(line: string): string[] {

    const values: string[] = [];

    let value = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {

      const char = line[i];

      if (char === '"') {

        if (quoted && line[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = !quoted;
        }

      } else if (char === ',' && !quoted) {

        values.push(value.trim());
        value = '';

      } else {

        value += char;

      }
    }

    values.push(value.trim());

    return values;
  }

  // DOWNLOAD CSV TEMPLATE
  downloadTemplate(): void {

    const csv =
      'section,dayOfWeek,subject,startTime,endTime,faculty,room,practical\n' +
      'I1,Monday,IDS,09:00,10:00,AB,G-15,false\n' +
      'I2,Monday,IDS,09:00,10:00,AB,G-15,false';

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'it-5th-timetable-template.csv';
    anchor.click();

    URL.revokeObjectURL(url);
  }

  // IMPORT CSV FILE
  async onImportFile(event: Event): Promise<void> {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.importPreview = [];
    this.importMessage = '';
    this.error = '';

    if (!file) {
      return;
    }

    this.importFileName = file.name;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error =
        'Please CSV file upload karein. PDF/photo ke liye pehle CSV me timetable convert karna hoga.';

      input.value = '';
      return;
    }

    try {

      const text = await file.text();

      const lines = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error(
          'CSV me header ke saath kam se kam ek class honi chahiye.'
        );
      }

      const headers = this.parseCsvLine(lines[0])
        .map(h => h.toLowerCase());

      const required = [
        'section',
        'dayofweek',
        'subject',
        'starttime',
        'endtime'
      ];

      const missing = required.filter(
        h => !headers.includes(h)
      );

      if (missing.length) {
        throw new Error(
          'Missing columns: ' + missing.join(', ')
        );
      }

      const idx = (name: string) => headers.indexOf(name);

      const rows: TimetableEntry[] = lines
        .slice(1)
        .map((line, rowIndex) => {

          const cells = this.parseCsvLine(line);

          const val = (name: string) =>
            cells[idx(name)] || '';

          const section = val('section').toUpperCase();
          const day = val('dayofweek');

          const startTime = val('starttime');
          const endTime = val('endtime');

          if (!['I1', 'I2'].includes(section)) {
            throw new Error(
              `Row ${rowIndex + 2}: section I1 ya I2 hona chahiye.`
            );
          }

          if (
            !this.days.some(
              d => d.toLowerCase() === day.toLowerCase()
            )
          ) {
            throw new Error(
              `Row ${rowIndex + 2}: invalid day "${day}".`
            );
          }

          if (
            !val('subject') ||
            !/^\d{2}:\d{2}$/.test(startTime) ||
            !/^\d{2}:\d{2}$/.test(endTime) ||
            startTime >= endTime
          ) {
            throw new Error(
              `Row ${rowIndex + 2}: subject/time check karein.`
            );
          }

          return {
            branch: 'IT',
            semester: 5,
            section: section as 'I1' | 'I2',

            dayOfWeek: this.days.find(
              d => d.toLowerCase() === day.toLowerCase()
            )!,

            subject: val('subject'),
            startTime,
            endTime,
            faculty: val('faculty'),
            room: val('room'),

            practical: [
              'true',
              'yes',
              '1',
              'lab'
            ].includes(val('practical').toLowerCase())
          };
        });

      this.importPreview = rows;

      this.importMessage =
        `${rows.length} classes ready. ` +
        `I1: ${rows.filter(r => r.section === 'I1').length}, ` +
        `I2: ${rows.filter(r => r.section === 'I2').length}.`;

    } catch (err: any) {

      this.error =
        err?.message || 'CSV read nahi ho paayi.';

    } finally {

      input.value = '';

    }
  }

  // SAVE BULK IMPORT
  async saveImport(): Promise<void> {

    if (!this.importPreview.length || this.importing) {
      return;
    }

    if (
      !confirm(
        `${this.importPreview.length} timetable entries database me add karein? Existing entries delete nahi hongi.`
      )
    ) {
      return;
    }

    this.importing = true;
    this.error = '';
    this.importMessage = 'Importing…';

    let saved = 0;

    try {

      for (const entry of this.importPreview) {

        await firstValueFrom(
          this.service.create(entry)
        );

        saved++;
      }

      this.importMessage =
        `Successfully imported ${saved} classes.`;

      this.importPreview = [];

      this.load();

    } catch (err) {

      console.error('Bulk import error:', err);

      this.error =
        `${saved} entries save hui; baaki import fail hua. Backend/API check karein.`;

    } finally {

      this.importing = false;

    }
  }

  // IMAGE / PDF OCR
  async onImageOrPdf(event: Event): Promise<void> {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.importFileName = file.name;
    this.importPreview = [];
    this.error = '';

    this.importMessage =
      'Image/PDF se text read ho raha hai. Please wait…';

    this.ocrBusy = true;

    let objectUrl: string | null = null;

    try {

      objectUrl = URL.createObjectURL(file);

      let source: string | HTMLCanvasElement = objectUrl;

      if (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      ) {

        const pdfjs = await import('pdfjs-dist');

        const worker = await import(
          'pdfjs-dist/build/pdf.worker.mjs'
        );

        (pdfjs as any).GlobalWorkerOptions.workerSrc =
          (worker as any).default;

        const pdf = await (pdfjs as any).getDocument({
          data: await file.arrayBuffer()
        }).promise;

        const page = await pdf.getPage(1);

        const viewport = page.getViewport({
          scale: 2
        });

        const canvas = document.createElement('canvas');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: canvas.getContext('2d')!,
          viewport
        }).promise;

        source = canvas;

        if (pdf.numPages > 1) {
          this.importMessage =
            'PDF ka first page read kiya gaya hai. Multiple pages ke liye har page ko alag image ke roop me upload karein.';
        }
      }

      const tesseract = await import('tesseract.js');

      const result = await tesseract.recognize(
        source,
        'eng'
      );

      this.ocrText = result.data.text || '';

      this.importMessage =
        'Text read ho gaya. Neeche OCR text verify karein, phir CSV template me rows bhar kar import karein. OCR output ko automatically timetable entries me convert nahi kiya gaya hai, kyunki table layout me galti ho sakti hai.';

    } catch (e) {

      console.error('OCR error:', e);

      this.error =
        'Image/PDF read nahi ho paayi. Clear image ya CSV upload karke try karein.';

    } finally {

      this.ocrBusy = false;
      input.value = '';

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  // COPY OCR TEXT
  copyOcrText(): void {

    if (!this.ocrText) {
      return;
    }

    navigator.clipboard
      ?.writeText(this.ocrText)
      .then(() => {
        this.importMessage =
          'OCR text copied. Isse CSV template me organize karke upload karein.';
      })
      .catch(err => {
        console.error('Clipboard error:', err);
        this.error = 'Text copy nahi ho paaya.';
      });
  }

  // CLEAR IMPORT
  clearImport(): void {
    this.importPreview = [];
    this.importMessage = '';
    this.importFileName = '';
  }

  // GET CLASSES FOR A DAY
  forDay(day: string): TimetableEntry[] {

    return this.entries
      .filter(e => e.dayOfWeek === day)
      .sort(
        (a, b) => a.startTime.localeCompare(b.startTime)
      );
  }

}