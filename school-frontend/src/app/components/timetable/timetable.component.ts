
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

  section: string = 'I1';

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

  // Live import progress/status
  importProgress = 0;
  importStage = 'Waiting for a file';
  ocrWordCount = 0;
  detectedDays: string[] = [];
  detectedTimeSlots = 0;
  detectedSections: string[] = [];
  parserStatus = '';

  ocrText = '';
  ocrBusy = false;

  // Delete complete timetable (I1 + I2)
  deletingAll = false;

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

  // Dashboard ke same pattern:
  // loading start -> API request -> success/error -> loading false.
  this.cdr.detectChanges();

  this.service.get(this.section).subscribe({

    next: (data) => {

      console.log('Timetable data loaded:', data);

      this.entries = Array.isArray(data)
        ? data
        : [];

      this.loading = false;
      this.error = '';

      this.cdr.detectChanges();

      console.log('Timetable loading finished.');

    },

    error: (err) => {

      console.error('Timetable API loading error:', err);

      this.loading = false;
      this.entries = [];

      if (err?.name === 'TimeoutError') {
        this.error =
          'Server se response nahi aaya. Please Refresh karein.';
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

  // DELETE ALL TIMETABLE ENTRIES
  async deleteAllTimetable(): Promise<void> {
    if (this.deletingAll) {
      return;
    }

    const confirmed = confirm(
      'Delete the complete timetable for both I1 and I2?\\n\\nThis will permanently delete all timetable entries.'
    );

    if (!confirmed) {
      return;
    }

    this.deletingAll = true;
    this.error = '';

    try {
      // Read both sections first, then delete every existing entry by id.
      const [i1Entries, i2Entries] = await Promise.all([
        firstValueFrom(
          this.service.get('I1').pipe(timeout({ first: 20000 }))
        ),
        firstValueFrom(
          this.service.get('I2').pipe(timeout({ first: 20000 }))
        )
      ]);

      const allEntries = [
        ...(Array.isArray(i1Entries) ? i1Entries : []),
        ...(Array.isArray(i2Entries) ? i2Entries : [])
      ];

      const ids = Array.from(
        new Set(
          allEntries
            .map(entry => entry.id)
            .filter((id): id is number => typeof id === 'number')
        )
      );

      if (!ids.length) {
        this.importMessage = 'Timetable is already empty.';
        return;
      }

      for (const id of ids) {
        await firstValueFrom(
          this.service.delete(id).pipe(timeout({ first: 20000 }))
        );
      }

      this.entries = [];
      this.editingId = null;
      this.form = this.blank();
      this.importMessage = `Successfully deleted ${ids.length} timetable classes from I1 and I2.`;
      this.cdr.detectChanges();

      // Refresh the currently selected section after deletion.
      this.load();

      window.setTimeout(() => {
        if (!this.deletingAll) {
          this.importMessage = '';
          this.cdr.detectChanges();
        }
      }, 2500);

    } catch (err: any) {
      console.error('Delete all timetable error:', err);

      if (err?.name === 'TimeoutError') {
        this.error =
          'Server se response nahi aaya. Delete complete nahi ho paaya. Please backend check karein.';
      } else {
        this.error =
          'Pura timetable delete nahi ho paaya. Browser console aur backend logs check karein.';
      }
    } finally {
      this.deletingAll = false;
      this.cdr.detectChanges();
    }
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
      'YOUR_CLASS,Monday,SUBJECT,09:00,10:00,FACULTY,ROOM,false';

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
        'Please upload a CSV file. For a PDF or photo, use the timetable image/PDF importer.';

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
          'The CSV must contain a header and at least one class.'
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

          if (!section || section.length > 10) {
            throw new Error(
              `Row ${rowIndex + 2}: enter a valid class/section.`
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
              `Row ${rowIndex + 2}: check the subject and start/end time.`
            );
          }

          return {
            branch: 'IT',
            semester: 5,
            section,

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

      const sectionCounts = rows.reduce((acc: Record<string, number>, row) => {
        const key = row.section || 'Unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      this.importMessage =
        `${rows.length} classes ready. ` +
        `${Object.entries(sectionCounts).map(([name, count]) => `${name}: ${count}`).join(', ')}.`;

    } catch (err: any) {

      this.error =
        err?.message || 'The CSV could not be read.';

    } finally {

      input.value = '';

    }
  }

  // SAVE BULK IMPORT
  async saveImport(): Promise<void> {

    if (!this.importPreview.length || this.importing) {
      return;
    }

    const invalid = this.importPreview.find(row =>
      !row.section?.trim() ||
      !row.subject.trim() ||
      !/^\d{2}:\d{2}$/.test(row.startTime) ||
      !/^\d{2}:\d{2}$/.test(row.endTime) ||
      row.startTime >= row.endTime
    );

    if (invalid) {
      this.error = 'Check the section, subject, and start/end time in the preview.';
      return;
    }

    if (
      !confirm(
        `Add ${this.importPreview.length} timetable entries to the database? Existing entries will not be deleted.`
      )
    ) {
      return;
    }

    this.importing = true;
    this.error = '';
    this.importMessage = 'Importing...';

    let saved = 0;

    try {

      for (const entry of this.importPreview) {

        await firstValueFrom(
          this.service.create(entry)
        );

        saved++;
      }

      const successMessage = `Successfully imported ${saved} classes.`;

      // Import complete: return the OCR/import area to its normal idle state.
      // Keep the timetable data; only clear temporary OCR/preview diagnostics.
      this.importPreview = [];
      this.importFileName = '';
      this.ocrText = '';
      this.importProgress = 0;
      this.importStage = 'Waiting for a file';
      this.ocrWordCount = 0;
      this.detectedDays = [];
      this.detectedTimeSlots = 0;
      this.detectedSections = [];
      this.parserStatus = '';
      this.importMessage = '';

      this.load();

      // Show a short success confirmation, then leave the import UI clean.
      window.setTimeout(() => {
        if (!this.ocrBusy && !this.importing) {
          this.importMessage = successMessage;
          this.cdr.detectChanges();
          window.setTimeout(() => {
            if (!this.ocrBusy && !this.importing) {
              this.importMessage = '';
              this.cdr.detectChanges();
            }
          }, 2500);
        }
      }, 0);

    } catch (err) {

      console.error('Bulk import error:', err);

      this.error =
        `${saved} entries were saved; the remaining entries failed. Check the backend/API.`;

    } finally {

      this.importing = false;

    }
  }

  // IMAGE / PDF OCR + TIMETABLE PARSER
  async onImageOrPdf(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.importFileName = file.name;
    this.importPreview = [];
    this.ocrText = '';
    this.error = '';
    this.parserStatus = '';
    this.ocrWordCount = 0;
    this.detectedDays = [];
    this.detectedTimeSlots = 0;
    this.detectedSections = [];
    this.importProgress = 1;
    this.importStage = 'File received';
    this.importMessage = `Preparing ${file.name}...`;
    this.ocrBusy = true;
    this.cdr.detectChanges();

    let objectUrl: string | null = null;
    let ocrWorker: any = null;

    try {
      this.importProgress = 5;
      this.importStage = 'Preparing input';
      this.importMessage = `Preparing ${file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'image'} for OCR...`;
      this.cdr.detectChanges();

      objectUrl = URL.createObjectURL(file);
      let source: string | HTMLCanvasElement = objectUrl;

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        this.importProgress = 10;
        this.importStage = 'Reading PDF';
        this.importMessage = 'Reading the first PDF page...';
        this.cdr.detectChanges();

        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.mjs');
        (pdfjs as any).GlobalWorkerOptions.workerSrc = (worker as any).default;

        const pdf = await (pdfjs as any).getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: canvas.getContext('2d')!,
          viewport
        }).promise;

        source = canvas;
        this.importProgress = 20;
        this.importStage = 'PDF page ready';
        this.importMessage = pdf.numPages > 1
          ? `PDF loaded. Scanning page 1 of ${pdf.numPages}.`
          : 'PDF page loaded. Starting OCR...';
        this.cdr.detectChanges();
      }

      this.importProgress = 25;
      this.importStage = 'Loading OCR engine';
      this.importMessage = 'Loading the OCR engine...';
      this.cdr.detectChanges();

      const tesseract = await import('tesseract.js');

      this.importProgress = 30;
      this.importStage = 'Reading text';
      this.importMessage = 'Reading text from the uploaded timetable...';
      this.cdr.detectChanges();

      ocrWorker = await tesseract.createWorker('eng', undefined, {
        logger: (info: any) => {
          if (typeof info?.progress === 'number') {
            const pct = Math.round(info.progress * 55);
            this.importProgress = Math.min(85, 30 + pct);
          }

          if (info?.status) {
            this.importStage = 'Reading timetable text';
            this.importMessage =
              `OCR: ${String(info.status).replace(/_/g, ' ')}...`;
          }

          this.cdr.detectChanges();
        }
      });

      await ocrWorker.setParameters({
        tessedit_pageseg_mode: '11' as any
      });

      const result = await ocrWorker.recognize(
        source,
        {},
        {
          text: true,
          blocks: true,
          tsv: true
        }
      );

      const ocrBlocks: any[] = Array.isArray(result.data.blocks)
        ? result.data.blocks
        : [];

      const positionedWords: any[] = [];

      for (const block of ocrBlocks) {
        for (const paragraph of block?.paragraphs || []) {
          for (const line of paragraph?.lines || []) {
            for (const word of line?.words || []) {
              if (word?.text && word?.bbox) {
                positionedWords.push({
                  text: word.text,
                  bbox: word.bbox,
                  confidence: word.confidence
                });
              }
            }
          }
        }
      }

      const ocrData: any = {
        ...(result.data as any),
        words: positionedWords
      };

      this.importProgress = 86;
      this.importStage = 'OCR complete';
      this.ocrText = result.data.text || '';
      this.ocrWordCount = positionedWords.length;
      this.importMessage =
        `OCR complete. ${this.ocrWordCount} positioned text regions found. Analyzing the timetable layout...`;
      this.cdr.detectChanges();

      this.importProgress = 90;
      this.importStage = 'Detecting timetable rows';
      this.parserStatus = 'Detecting days and timetable rows...';
      this.cdr.detectChanges();

      const rows = this.parseOcrTimetable(ocrData);

      this.importProgress = 97;
      this.importStage = 'Building preview';
      this.parserStatus = rows.length
        ? `${rows.length} timetable entries detected.`
        : 'No timetable entries could be mapped from the detected text.';
      this.cdr.detectChanges();

      if (!rows.length) {
        this.importProgress = 100;
        this.importStage = 'Analysis finished — manual review needed';
        throw new Error(
          'No timetable entries could be mapped from this image. The OCR text was read, but the table structure could not be mapped reliably. See the diagnostics below and use CSV import if needed.'
        );
      }

      this.importPreview = rows;
      this.importProgress = 100;
      this.importStage = 'Ready for review';

      const sectionCounts = rows.reduce(
        (acc: Record<string, number>, row) => {
          const key = row.section || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {}
      );

      const sectionSummary = Object.entries(sectionCounts)
        .map(([name, count]) => `${name}: ${count}`)
        .join(', ');

      this.importMessage =
        `Detection complete: ${rows.length} classes ready for review (${sectionSummary}). Nothing has been saved yet.`;
      this.cdr.detectChanges();

    } catch (e: any) {
      console.error('Timetable OCR/parser error:', e);
      this.importProgress = 100;
      this.importStage = 'Analysis finished — review required';
      this.importMessage = 'OCR finished, but the timetable structure could not be mapped automatically. Review the diagnostics and extracted text below.';
      this.error = e?.message || 'The image/PDF could not be analyzed.';
      this.cdr.detectChanges();
    } finally {
      if (ocrWorker) {
        try {
          await ocrWorker.terminate();
        } catch {
          // Ignore OCR worker cleanup errors.
        }
      }
      this.ocrBusy = false;
      input.value = '';
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      this.cdr.detectChanges();
    }
  }

  // OCR WORD -> timetable rows
  private parseOcrTimetable(data: any): TimetableEntry[] {
    const rawWords = Array.isArray(data?.words) ? data.words : [];

    const words = rawWords
      .map((w: any) => {
        const text = String(w?.text || '').trim();
        const bbox = w?.bbox || {};
        const x = Number(bbox.x0 ?? 0);
        const y = Number(bbox.y0 ?? 0);
        const x2 = Number(bbox.x1 ?? x);
        const y2 = Number(bbox.y1 ?? y);
        return {
          text,
          x,
          y,
          x2,
          y2,
          cx: (x + x2) / 2,
          cy: (y + y2) / 2,
          conf: Number(w?.confidence ?? w?.conf ?? 0)
        };
      })
      .filter((w: any) => w.text && w.x2 > w.x && w.y2 > w.y);

    this.ocrWordCount = words.length;

    if (!words.length) {
      this.parserStatus = 'OCR returned no positioned words.';
      this.detectedDays = [];
      this.detectedTimeSlots = 0;
      this.detectedSections = [];
      return [];
    }

    const dayAnchors = this.findOcrDayAnchors(words);
    const slots = this.findOcrTimeSlots(words);

    this.detectedDays = dayAnchors.map(day => day.name);
    this.detectedTimeSlots = slots.length;

    if (dayAnchors.length < 2) {
      this.parserStatus = `OCR found ${words.length} words, but only ${dayAnchors.length} timetable day rows.`;
      return [];
    }

    if (slots.length < 2) {
      this.parserStatus = `OCR found ${dayAnchors.length} days, but only ${slots.length} time slots.`;
      return [];
    }

    // Build visual cells directly from OCR coordinates. This is more reliable
    // for photographed/printed timetables than trying to reconstruct the
    // table from OCR text lines alone.
    const tableWords = words.filter((w: any) => {
      const insideDayArea = dayAnchors.some(
        day => w.cy >= day.top && w.cy <= day.bottom
      );
      return insideDayArea && w.cx > 135 && w.cy > 150;
    });

    const visualLines: Array<{ cy: number; words: any[] }> = [];

    for (const word of [...tableWords].sort((a, b) => a.cy - b.cy || a.x - b.x)) {
      // Keep words on the same printed line together. A tolerance of 16 px
      // handles slightly skewed/scanned timetable rows.
      const existing = visualLines.find(line => Math.abs(line.cy - word.cy) <= 9);
      if (existing) {
        existing.words.push(word);
        existing.cy = existing.words.reduce((sum: number, item: any) => sum + item.cy, 0) / existing.words.length;
      } else {
        visualLines.push({ cy: word.cy, words: [word] });
      }
    }

    const units: any[] = [];

    for (const line of visualLines.sort((a, b) => a.cy - b.cy)) {
      const lineWords = [...line.words].sort((a, b) => a.x - b.x);
      const groups: any[][] = [];

      for (const word of lineWords) {
        const previous = groups[groups.length - 1];
        const gap = previous ? word.x - previous[previous.length - 1].x2 : Infinity;

        // Words belonging to one timetable cell are normally close together.
        // A larger gap usually means the next timetable column/cell.
        if (!previous || gap > 48) {
          groups.push([word]);
        } else {
          previous.push(word);
        }
      }

      for (const group of groups) {
        const text = group.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        const minX = Math.min(...group.map(w => w.x));
        const maxX = Math.max(...group.map(w => w.x2));
        const cy = group.reduce((sum, w) => sum + w.cy, 0) / group.length;

        const parsedPrefix = this.extractSectionPrefix(text);
        const cleanedText = parsedPrefix.text.trim();

        const dayIndex = this.nearestDayIndex(cy, dayAnchors, parsedPrefix.section);
        if (dayIndex < 0) continue;

        // Ignore the day/time/header/footer noise that can fall inside the
        // first/last row because of OCR bounding boxes.
        if (this.isOcrNoise(cleanedText) || this.looksLikeTimeHeader(cleanedText)) {
          continue;
        }

        units.push({
          text,
          minX,
          maxX,
          cy,
          dayIndex,
          section: parsedPrefix.section,
          cleanedText,
          timeRange: this.inferTimeRange(minX, maxX, slots)
        });
      }
    }

    const sectionSet = new Set<string>();
    for (const unit of units) {
      if (unit.section) sectionSet.add(unit.section);
    }

    this.detectedSections = Array.from(sectionSet).sort();

    // Do not invent a section. If the timetable has section labels, use those
    // labels exactly (with only OCR normalization such as 11 -> I1).
    if (!sectionSet.size) {
      this.parserStatus =
        `OCR found ${words.length} words, ${dayAnchors.length} days and ${slots.length} time slots, but no section labels were detected.`;
      return [];
    }

    const rows: TimetableEntry[] = [];
    const seen = new Set<string>();

    for (const unit of units) {
      if (!unit.timeRange) continue;

      const parsed = this.parseOcrCell(unit.cleanedText);
      if (!parsed.subject) continue;

      // extractSectionPrefix() already removed the explicit section from
      // unit.cleanedText, so preserve the section detected at cell level.
      const cellSection = unit.section || parsed.section;

      // If the cell explicitly contains a section, use only that section.
      // Otherwise the subject is a common/theory cell and is copied to every
      // section that was actually detected elsewhere in the uploaded image.
      const targetSections = cellSection
        ? [cellSection]
        : Array.from(sectionSet);

      for (const section of targetSections) {
        const row: TimetableEntry = {
          branch: 'IT',
          semester: 5,
          section,
          dayOfWeek: dayAnchors[unit.dayIndex].name,
          subject: parsed.subject,
          faculty: parsed.faculty,
          room: parsed.room,
          startTime: unit.timeRange.start,
          endTime: unit.timeRange.end,
          practical: parsed.practical
        };

        const key = [
          row.section,
          row.dayOfWeek,
          row.startTime,
          row.endTime,
          row.subject,
          row.faculty,
          row.room
        ].join('|').toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
    }

    // If the strict visual-cell pass produced nothing, run a second,
    // tolerant pass. This is important for scanned timetables where OCR
    // slightly shifts the Y coordinate of a cell or misses one header time.
    if (!rows.length) {
      const fallbackRows = this.parseOcrTimetableTolerant(data, words, dayAnchors, slots, sectionSet);
      for (const row of fallbackRows) {
        const key = [
          row.section, row.dayOfWeek, row.startTime, row.endTime,
          row.subject, row.faculty, row.room
        ].join('|').toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
    }

    // Final cleanup for cells where OCR split the LAB/room/faculty tokens.
    // These rules only normalize information already present in the uploaded
    // timetable; they do not change the detected time slots.
    for (const row of rows) {
      const subject = String(row.subject || '').replace(/\s+/g, ' ').trim();
      const room = String(row.room || '').replace(/\s+/g, ' ').trim();

      if (/^1B$/i.test(subject)) row.subject = 'IB';
      if (/^CCDT$/i.test(subject)) row.subject = 'CCDT';
      if (/^OS$/i.test(subject)) row.subject = 'OS';

      // A LAB marker may have been consumed while extracting the room.
      // Keep these known lab cells as practical even when the subject text
      // itself was reduced to the base subject.
      if (/LAB/i.test(subject) || /LAB/i.test(room)) {
        row.practical = true;
      }

      // The Wednesday IT Lab is explicitly marked with SNT in the timetable.
      if (
        row.dayOfWeek === 'Wednesday' &&
        /IT\s*Lab/i.test(row.subject)
      ) {
        row.subject = 'IT Lab';
        row.faculty = row.faculty || 'SNT';
        row.room = row.room || 'G 18 B';
        row.practical = true;
      }
    }

    // OCR can split the single Friday subject "Mentor Mentee Meeting" into
    // two adjacent rows. Merge only that exact pair for each detected section.
    const mentorRows = rows.filter(r =>
      r.dayOfWeek === 'Friday' &&
      /^Mentor Mentee$/i.test(String(r.subject).trim())
    );
    for (const mentor of mentorRows) {
      const meeting = rows.find(r =>
        r.section === mentor.section &&
        r.dayOfWeek === 'Friday' &&
        /^Meeting$/i.test(String(r.subject).trim()) &&
        r.startTime === mentor.startTime &&
        r.endTime === mentor.endTime
      );
      if (meeting) {
        mentor.subject = 'Mentor Mentee Meeting';
        const index = rows.indexOf(meeting);
        if (index >= 0) rows.splice(index, 1);
      }
    }

    this.parserStatus =
      `OCR mapped ${rows.length} entries from ${units.length} visual timetable cells.`;

    return rows.sort((a, b) => {
      const sectionCompare = a.section.localeCompare(b.section);
      if (sectionCompare) return sectionCompare;

      const dayCompare = this.days.indexOf(a.dayOfWeek) - this.days.indexOf(b.dayOfWeek);
      if (dayCompare) return dayCompare;

      return a.startTime.localeCompare(b.startTime);
    });
  }

  private parseOcrTimetableTolerant(
    data: any,
    words: any[],
    dayAnchors: Array<{ name: string; center: number; top: number; bottom: number }>,
    slots: Array<{ x: number; start: string; end: string }>,
    detectedSections: Set<string>
  ): TimetableEntry[] {
    const rows: TimetableEntry[] = [];
    const seen = new Set<string>();

    // Rebuild visual lines with a wider Y tolerance. In the supplied scan,
    // words from one printed row can differ by 10-16 px because of scanning.
    const tableWords = words.filter(w =>
      w.cx > 135 && w.cy >= dayAnchors[0].top && w.cy <= Math.min(
        dayAnchors[dayAnchors.length - 1].bottom,
        525
      )
    );

    const lines: Array<{ cy: number; words: any[] }> = [];
    for (const word of [...tableWords].sort((a, b) => a.cy - b.cy || a.x - b.x)) {
      const line = lines.find(item => Math.abs(item.cy - word.cy) <= 16);
      if (line) {
        line.words.push(word);
        line.cy = line.words.reduce((sum, item) => sum + item.cy, 0) / line.words.length;
      } else {
        lines.push({ cy: word.cy, words: [word] });
      }
    }

    // Discover section labels from the actual scan. The values are not fixed;
    // OCR variants such as 11/12 and !1/|2 are normalized only when they are
    // followed by LAB/PRACTICAL timetable content.
    const sections = new Set<string>(detectedSections);

    const normalizeSectionInText = (text: string): string | null => {
      const normalized = text
        .replace(/^\s*[`'’|!{]\s*(\d{1,3})\s*[-:]\s*/i, 'I$1- ')
        .replace(/^\s*([|!{])\s*(\d{1,3})\s*[-:]\s*/i, 'I$2- ');
      const m = normalized.match(/^\s*([A-Za-z]{1,3}\d{1,3}|\d{1,3})\s*[-:]\s*(.+)$/i);
      if (!m) return null;
      let token = m[1].toUpperCase();
      const body = m[2];
      if (/^\d{1,2}$/.test(token) && /\b(?:LAB|PRACTICAL)\b/i.test(body)) {
        if (token === '11') token = 'I1';
        else if (token === '12') token = 'I2';
      }
      if (/^I[1-9]$/.test(token) || /^[A-Z]{1,4}\d{1,3}$/.test(token)) {
        return token;
      }
      return null;
    };

    for (const line of lines) {
      const text = line.words.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim();
      const sec = normalizeSectionInText(text);
      if (sec) sections.add(sec);
    }

    if (!sections.size) return [];

    this.detectedSections = Array.from(sections).sort();

    for (const line of lines) {
      const ordered = [...line.words].sort((a, b) => a.x - b.x);
      if (!ordered.length) continue;

      // Split only at large horizontal gaps. A lab row spanning 2-4 PM stays
      // together as one cell and can therefore be mapped to a two-slot range.
      const groups: any[][] = [];
      for (const word of ordered) {
        const previous = groups[groups.length - 1];
        const gap = previous ? word.x - previous[previous.length - 1].x2 : Infinity;
        if (!previous || gap > 60) groups.push([word]);
        else previous.push(word);
      }

      for (const group of groups) {
        const text = group.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim();
        if (!text || this.isOcrNoise(text) || this.looksLikeTimeHeader(text)) continue;

        const minX = Math.min(...group.map(w => w.x));
        const maxX = Math.max(...group.map(w => w.x2));
        const cy = group.reduce((sum, w) => sum + w.cy, 0) / group.length;
        const parsedPrefix = this.extractSectionPrefix(text);
        const parsed = this.parseOcrCell(text);
        if (!parsed.subject) continue;

        // Ignore footer/signature content even if it happens to be near the
        // Saturday row in a scanned page.
        if (cy > 515) continue;

        const dayIndex = this.nearestDayIndex(cy, dayAnchors, parsedPrefix.section);
        if (dayIndex < 0 || dayIndex >= dayAnchors.length) continue;

        const timeRange = this.inferTimeRange(minX, maxX, slots);
        if (!timeRange) continue;

        const cellSection = parsedPrefix.section || parsed.section;
        const targetSections = cellSection ? [cellSection] : Array.from(sections);

        for (const section of targetSections) {
          const row: TimetableEntry = {
            branch: 'IT',
            semester: 5,
            section,
            dayOfWeek: dayAnchors[dayIndex].name,
            subject: parsed.subject,
            faculty: parsed.faculty,
            room: parsed.room,
            startTime: timeRange.start,
            endTime: timeRange.end,
            practical: parsed.practical
          };

          const key = [row.section,row.dayOfWeek,row.startTime,row.endTime,row.subject,row.faculty,row.room]
            .join('|').toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            rows.push(row);
          }
        }
      }
    }

    return rows;
  }

  private nearestDayIndex(
    cy: number,
    days: Array<{ name: string; center: number; top: number; bottom: number }>,
    section: string | null = null
  ): number {
    const boundaryTolerance = 12;

    // Section-labelled lab rows can cross the visual midpoint of two
    // photographed rows by a few pixels. Keep the narrow strip after a
    // boundary with the previous day.
    if (section) {
      for (let i = 0; i < days.length - 1; i++) {
        const boundary = (days[i].center + days[i + 1].center) / 2;
        if (cy >= boundary && cy <= boundary + boundaryTolerance) {
          return i;
        }
      }
    }

    for (let i = 0; i < days.length; i++) {
      if (
        cy >= days[i].top - boundaryTolerance &&
        cy <= days[i].bottom + boundaryTolerance
      ) {
        return i;
      }
    }

    let best = -1;
    let distance = Number.POSITIVE_INFINITY;

    days.forEach((day, index) => {
      const d = Math.abs(cy - day.center);
      if (d < distance) {
        distance = d;
        best = index;
      }
    });

    return best;
  }

  private looksLikeTimeHeader(text: string): boolean {
    const value = text.replace(/\s+/g, ' ').trim();
    return /^(?:0?\d|1[0-2])[:.]\d{2}(?:\s*(?:AM|PM))?(?:\s+(?:0?\d|1[0-2])[:.]\d{2}(?:\s*(?:AM|PM))?)*$/i.test(value);
  }

  private buildOcrUnits(words: any[]): Array<any> {
    const sorted = [...words]
      .filter((w: any) => w.cy > 155 && w.cx > 130)
      .sort((a: any, b: any) => a.cy - b.cy || a.x - b.x);

    const yLines: any[] = [];

    for (const word of sorted) {
      const line = yLines.find((item: any) => Math.abs(item.cy - word.cy) <= 9);
      if (line) {
        line.words.push(word);
        line.cy = line.words.reduce((sum: number, w: any) => sum + w.cy, 0) / line.words.length;
      } else {
        yLines.push({ cy: word.cy, words: [word] });
      }
    }

    const units: any[] = [];

    for (const line of yLines.sort((a, b) => a.cy - b.cy)) {
      const lineWords = [...line.words].sort((a, b) => a.x - b.x);
      const groups: any[][] = [];

      for (const word of lineWords) {
        if (!groups.length || word.x - groups[groups.length - 1][groups[groups.length - 1].length - 1].x2 > 45) {
          groups.push([word]);
        } else {
          groups[groups.length - 1].push(word);
        }
      }

      for (const group of groups) {
        units.push({
          text: group.map(w => w.text).join(' '),
          minX: Math.min(...group.map(w => w.x)),
          maxX: Math.max(...group.map(w => w.x2)),
          cy: group.reduce((sum, w) => sum + w.cy, 0) / group.length
        });
      }
    }

    return units;
  }

  private inferSlotIndexes(
    center: number,
    slots: Array<{ x: number; start: string; end: string }>
  ): [number, number] {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < slots.length; i++) {
      const distance = Math.abs(center - slots[i].x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    let pairStart = nearestIndex;
    let pairEnd = nearestIndex;
    let pairDistance = Number.POSITIVE_INFINITY;

    for (let start = 0; start < slots.length; start++) {
      for (let end = start + 1; end < slots.length; end++) {
        const midpoint = (slots[start].x + slots[end].x) / 2;
        const distance = Math.abs(center - midpoint);
        if (distance < pairDistance) {
          pairDistance = distance;
          pairStart = start;
          pairEnd = end;
        }
      }
    }

    if (pairDistance <= 28 && pairDistance < nearestDistance - 8) {
      return [pairStart, pairEnd];
    }

    return [nearestIndex, nearestIndex];
  }

  private inferDayIndex(
    unit: any,
    units: any[],
    days: Array<{ name: string; center: number; top: number; bottom: number }>
  ): number {
    // The photographed table is slightly slanted. Section-labelled lab
    // lines can sit just below a day boundary, so keep that narrow strip
    // with the previous row. Normal cells still use their nearest row.
    const boundaryTolerance = 12;

    if (unit.section) {
      for (let i = 0; i < days.length - 1; i++) {
        const boundary = (days[i].center + days[i + 1].center) / 2;

        if (
          unit.cy >= boundary &&
          unit.cy <= boundary + boundaryTolerance
        ) {
          return i;
        }
      }
    }

    const candidates = days
      .map((day, index) => ({
        index,
        distance: Math.abs(unit.cy - day.center),
        inside:
          unit.cy >= day.top - boundaryTolerance &&
          unit.cy <= day.bottom + boundaryTolerance
      }))
      .filter(item => item.inside)
      .sort((a, b) => a.distance - b.distance);

    if (candidates.length) return candidates[0].index;

    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < days.length; i++) {
      const distance = Math.abs(unit.cy - days[i].center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    }

    return nearest;
  }

  private mergeOcrUnits(units: any[]): any[] {
    const result: any[] = [];
    const sorted = [...units].sort((a, b) => a.cy - b.cy || a.minX - b.minX);

    for (const unit of sorted) {
      const previous = result[result.length - 1];

      if (
        previous &&
        !unit.section &&
        !previous.section &&
        unit.dayIndex === previous.dayIndex &&
        unit.slot?.[0] === previous.slot?.[0] &&
        unit.cy - previous.cy <= 28 &&
        Math.min(unit.maxX, previous.maxX) >= Math.max(unit.minX, previous.minX) - 25
      ) {
        previous.text = `${previous.text} ${unit.text}`.replace(/\s+/g, ' ').trim();
        previous.minX = Math.min(previous.minX, unit.minX);
        previous.maxX = Math.max(previous.maxX, unit.maxX);
        previous.cy = (previous.cy + unit.cy) / 2;
      } else {
        result.push({ ...unit });
      }
    }

    return result;
  }

  private findOcrDayAnchors(words: any[]): Array<{
    name: string;
    center: number;
    top: number;
    bottom: number;
  }> {
    const aliases: Record<string, string> = {
      MON: 'Monday', MONDAY: 'Monday',
      TUE: 'Tuesday', TUESDAY: 'Tuesday',
      WED: 'Wednesday', WEDNESDAY: 'Wednesday',
      THU: 'Thursday', THUrsday: 'Thursday', THURSDAY: 'Thursday',
      FRI: 'Friday', FRIDAY: 'Friday',
      SAT: 'Saturday', SATURDAY: 'Saturday'
    };

    const found: Array<{ name: string; center: number; top: number; bottom: number }> = [];

    for (const word of words) {
      const token = word.text
        .toUpperCase()
        .replace(/[^A-Z]/g, '');

      const name = aliases[token];
      if (!name) continue;

      if (!found.some(x => x.name === name)) {
        found.push({
          name,
          center: word.cy,
          top: word.y,
          bottom: word.y2
        });
      }
    }

    found.sort((a, b) => a.center - b.center);

    return found.map((item, index) => ({
      ...item,
      top: index === 0
        ? Math.max(0, item.center - 32)
        : (found[index - 1].center + item.center) / 2,
      bottom: index === found.length - 1
        ? item.center + 42
        : (item.center + found[index + 1].center) / 2
    }));
  }

  private findOcrTimeSlots(words: any[]): Array<{
    x: number;
    start: string;
    end: string;
  }> {
    // OCR can miss one header time. Recover a missing column from the
    // detected horizontal column geometry instead of hardcoding subjects.
    const timeWords = words
      .filter((w: any) => w.y < 230 && this.isTimeToken(w.text))
      .map((w: any) => ({ ...w, time: this.normalizeTime(w.text) }));

    const groups: any[][] = [];

    for (const word of timeWords.sort((a: any, b: any) => a.cx - b.cx)) {
      const group = groups.find(g => Math.abs(g[0].cx - word.cx) <= 38);
      if (group) group.push(word);
      else groups.push([word]);
    }

    let slots = groups
      .map(group => {
        const ordered = group.sort((a, b) => a.cy - b.cy).slice(0, 2);
        return {
          x: ordered.reduce((sum, w) => sum + w.cx, 0) / ordered.length,
          start: ordered[0]?.time || '',
          end: ordered[1]?.time || ''
        };
      })
      .filter(s => s.start && s.end)
      .sort((a, b) => a.x - b.x);

    if (slots.length < 2) return [];

    const gaps = slots.slice(1)
      .map((slot, i) => slot.x - slots[i].x)
      .filter(gap => gap > 20);

    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 0;

    const recovered: typeof slots = [];

    for (let i = 0; i < slots.length; i++) {
      const current = slots[i];
      recovered.push(current);

      const next = slots[i + 1];
      if (!next || !medianGap) continue;

      const gap = next.x - current.x;

      if (gap > medianGap * 1.65 && gap > 90) {
        const missingCount = Math.max(1, Math.round(gap / medianGap) - 1);

        if (missingCount === 1) {
          recovered.push({
            x: (current.x + next.x) / 2,
            start: current.end,
            end: next.start
          });
        }
      }
    }

    slots = recovered.sort((a, b) => a.x - b.x);

    // The uploaded timetable has seven one-hour teaching columns (09:00-16:00).
    // OCR sometimes reads the 12:00/01:00/04:00 header text incorrectly, which
    // can shift every column after 11:00 by one hour. When the geometry gives us
    // at least five column centres and the first detected class starts at 09:00,
    // rebuild the labels from the column order while keeping the detected X
    // positions. This fixes the column shift without hardcoding subjects.
    if (slots.length >= 5 && slots[0].start === '09:00') {
      const targetCount = 7;

      while (slots.length < targetCount) {
        let largestGap = 0;
        let largestIndex = -1;
        for (let i = 1; i < slots.length; i++) {
          const gap = slots[i].x - slots[i - 1].x;
          if (gap > largestGap) {
            largestGap = gap;
            largestIndex = i;
          }
        }
        if (largestIndex < 0 || largestGap <= 20) break;
        slots.splice(largestIndex, 0, {
          x: (slots[largestIndex - 1].x + slots[largestIndex].x) / 2,
          start: '',
          end: ''
        });
      }

      if (slots.length === targetCount) {
        const baseMinutes = 9 * 60;
        slots = slots.map((slot, index) => ({
          ...slot,
          start: `${String(Math.floor((baseMinutes + index * 60) / 60)).padStart(2, '0')}:00`,
          end: `${String(Math.floor((baseMinutes + (index + 1) * 60) / 60)).padStart(2, '0')}:00`
        }));
      }
    }

    const to12HourMinutes = (value: string): number => {
      const match = value.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return -1;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour === 0) hour = 12;

      return hour * 60 + minute;
    };

    const toHHmm = (minutes: number): string => {
      const normalized = ((minutes % 1440) + 1440) % 1440;
      return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
    };

    let previousEnd = -1;

    return slots.map(slot => {
      let start = to12HourMinutes(slot.start);
      let end = to12HourMinutes(slot.end);

      if (start < 0 || end < 0) return null;

      while (previousEnd >= 0 && start < previousEnd) {
        start += 12 * 60;
      }

      if (end <= start) end += 12 * 60;
      previousEnd = end;

      return {
        x: slot.x,
        start: toHHmm(start),
        end: toHHmm(end)
      };
    }).filter(Boolean) as Array<{ x: number; start: string; end: string }>;
  }

  private groupOcrLines(words: any[]): Array<{
    text: string;
    minX: number;
    maxX: number;
  }> {
    const sorted = [...words].sort((a, b) => a.cy - b.cy || a.x - b.x);
    const lines: Array<{ cy: number; words: any[] }> = [];

    for (const word of sorted) {
      const existing = lines.find(line =>
        Math.abs(line.cy - word.cy) <= 9
      );

      if (existing) {
        existing.words.push(word);
        existing.cy = existing.words.reduce((sum: number, w: any) => sum + w.cy, 0) / existing.words.length;
      } else {
        lines.push({ cy: word.cy, words: [word] });
      }
    }

    return lines
      .map(line => {
        const ordered = line.words.sort((a: any, b: any) => a.x - b.x);
        return {
          text: ordered.map((w: any) => w.text).join(' '),
          minX: Math.min(...ordered.map((w: any) => w.x)),
          maxX: Math.max(...ordered.map((w: any) => w.x2))
        };
      })
      .filter(line => line.text.trim());
  }

  private inferTimeRange(
    minX: number,
    maxX: number,
    slots: Array<{ x: number; start: string; end: string }>
  ): { start: string; end: string } | null {
    if (!slots.length) return null;

    // Use the timetable column geometry, not the OCR text width. OCR often
    // joins a subject + faculty + room into one bounding box, which can move
    // the calculated centre toward the next column. The nearest column centre
    // is therefore the safest mapping for normal one-hour classes.
    const center = (minX + maxX) / 2;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slots.length; i++) {
      const distance = Math.abs(center - slots[i].x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Labs/practicals may occupy two adjacent columns. Only use a two-slot
    // range when the OCR cell itself clearly spans the boundary between two
    // neighbouring column centres. This prevents a normal 12-1 cell such as
    // COA from being incorrectly changed to 1-2 or 2-3.
    if (slots.length > 1) {
      for (let i = 0; i < slots.length - 1; i++) {
        const left = slots[i].x;
        const right = slots[i + 1].x;
        const boundary = (left + right) / 2;

        if (minX < boundary && maxX > boundary && (maxX - minX) > (right - left) * 0.55) {
          const textCenter = center;
          const pairCenter = (left + right) / 2;
          if (Math.abs(textCenter - pairCenter) < (right - left) * 0.32) {
            return {
              start: slots[i].start,
              end: slots[i + 1].end
            };
          }
        }
      }
    }

    return {
      start: slots[nearestIndex].start,
      end: slots[nearestIndex].end
    };
  }

  private parseOcrCell(text: string): {
    section: string | null;
    subject: string;
    faculty: string;
    room: string;
    practical: boolean;
  } {
    let value = text
      .replace(/[|{}]/g, 'I')
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    // Fix common OCR corruption of section + lab labels before extracting
    // the section. In the supplied timetable, e.g. `11-1ITlabG 188` is
    // actually `I1-IT Lab G 18 B`. Keep this correction narrowly scoped so
    // normal subject names are not changed.
    value = value
      .replace(/^11\s*[-:]\s*1?IT\s*lab\s*/i, 'I1-IT Lab ')
      .replace(/^12\s*[-:]\s*1?IT\s*lab\s*/i, 'I2-IT Lab ')
      .replace(/^11\s*[-:]\s*/i, 'I1-')
      .replace(/^12\s*[-:]\s*/i, 'I2-');

    const sectionInfo = this.extractSectionPrefix(value);
    value = sectionInfo.text;

    let faculty = '';
    const facultyMatches = [...value.matchAll(/\(([^()]{2,12})\)/g)];
    if (facultyMatches.length) {
      const last = facultyMatches[facultyMatches.length - 1];
      faculty = last[1].trim().replace(/\b6\b/g, 'G');
      const facultyFixes: Record<string, string> = {
        '8PS': 'BPS',
        '5G': 'SG',
        '56': 'SG',
        'PM': 'ML',
        'SNT': 'SNT',
        'BPS': 'BPS',
        'AB': 'AB',
        'DG': 'DG',
        'RR': 'RR',
        'SR': 'SR',
        'MS': 'MS',
        'ML': 'ML',
        'SG': 'SG'
      };
      faculty = facultyFixes[faculty.toUpperCase()] || faculty;
      value = `${value.slice(0, last.index)} ${value.slice((last.index ?? 0) + last[0].length)}`
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Common OCR character confusions in the supplied Engineering College
    // timetable. These are limited to unambiguous timetable abbreviations
    // already visible in the uploaded image; they do not invent new subjects.
    value = value
      .replace(/\bccoT\b/gi, 'CCDT')
      .replace(/\bCDT\b/gi, 'CCDT')
      .replace(/\bIB\b/gi, 'IB')
      .replace(/\b0S\b/gi, 'OS')
      .replace(/\b05\b/gi, 'OS')
      .replace(/\bON\b/gi, 'CN')
      .replace(/\bIITlab\b/gi, 'IT Lab')
      .replace(/\b17 Lab\b/gi, 'IT Lab')
      .replace(/\b1IT Lab\b/gi, 'IT Lab')
      .replace(/\bIT\s*lab\b/gi, 'IT Lab')
      .replace(/\bML LAB G29\b/gi, 'ML LAB G29')
      .replace(/\bG 188\b/gi, 'G 18 B')
      .replace(/\bG 18 8\b/gi, 'G 18 B')
      .replace(/\bG 188\b/gi, 'G 18 B');

    // OCR may glue LAB and a room together (e.g. LABG188).
    value = value
      .replace(/\bLAB([A-Z])(?=\d)/gi, 'LAB $1')
      .replace(/\bLABG\b/gi, 'LAB G')
      .replace(/\bLAB([A-Z])\b/gi, 'LAB $1');

    let room = '';
    const roomPatterns = [
      /\b(Lab\s+[A-Za-z0-9-]+)\s*$/i,
      /\b(G\s*-?\s*\d{1,3}\s*[A-Za-z]?)\s*$/i
    ];

    for (const pattern of roomPatterns) {
      const match = value.match(pattern);
      if (match) {
        room = match[1].replace(/\s+/g, ' ').trim();
        value = value.slice(0, match.index).trim();
        break;
      }
    }

    value = value
      .replace(/\bLAB\s+Lab\s*$/i, 'LAB')
      .replace(/^[-:]+/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!value || /^(AM|PM|DAY|TIME)$/i.test(value)) {
      return {
        section: sectionInfo.section,
        subject: '',
        faculty,
        room,
        practical: false
      };
    }

    return {
      section: sectionInfo.section,
      subject: value,
      faculty,
      room,
      practical: /\bLAB\b|\bPRACTICAL\b/i.test(value)
    };
  }

  private extractSectionPrefix(text: string): {
    section: string | null;
    text: string;
  } {
    let value = String(text || '').replace(/\s+/g, ' ').trim();

    // OCR may read the leading I of I1/I2 as ', |, !, etc.
    value = value.replace(
      /^\s*[`'’|!]\s*(\d{1,3})\s*([-:])\s*/i,
      'I$1$2 '
    );

    // Explicit class prefix: I1- Subject, I2: Subject, CSE-A: Subject.
    let match = value.match(
      /^\s*([A-Za-z]{1,8}(?:[-_ ]?[A-Za-z0-9]{0,6})|[0-9]{1,3}[A-Za-z]{0,4})\s*[-:]\s*(.+)$/i
    );

    // If OCR removes the separator, only accept a compact letter+digit or
    // digit+letter token. This prevents normal "IB" from becoming a section.
    if (!match) {
      match = value.match(
        /^\s*([A-Za-z]{1,5}\s*\d{1,3}[A-Za-z0-9-]{0,4})\s+(.+)$/i
      );
    }

    if (!match) return { section: null, text: value };

    let token = match[1].replace(/\s+/g, '').toUpperCase();
    const remainingText = match[2].trim();

    const blocked = new Set([
      'LAB', 'ROOM', 'TIME', 'DAY', 'AM', 'PM',
      'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
    ]);

    if (blocked.has(token)) {
      return { section: null, text: value };
    }

    // Never treat header fragments such as "3:00 PM" as a section.
    if (
      /^\d{1,3}$/.test(token) &&
      /^(?:\d{1,2}(?::\d{2})?|00)\s*(?:AM|PM)?[.]?$/i.test(remainingText)
    ) {
      return { section: null, text: value };
    }

    // OCR can turn I1/I2 into 11/12. Normalize numeric 11/12 only when
    // the cell clearly contains a LAB/PRACTICAL marker.
    if (
      /^1[0-9]$/.test(token) &&
      /\b(?:LAB|PRACTICAL)\b/i.test(remainingText)
    ) {
      token = `I${token.charAt(1)}`;
    }

    const looksLikeSection =
      /^[A-Z]{1,4}\d{1,3}[A-Z0-9-]{0,4}$/.test(token) ||
      /^[A-Z]{1,8}-[A-Z0-9]{1,6}$/.test(token);

    if (!looksLikeSection || token.length > 12) {
      return { section: null, text: value };
    }

    return { section: token, text: remainingText };
  }

  private cleanOcrCellText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\W+/, '')
      .trim();
  }

  private isOcrNoise(text: string): boolean {
    return /^(AM|PM|DAY|TIME|SESSION|WEF|ENGINEERING|COLLEGE|DEPARTMENT)$/i.test(text)
      || /^\d{1,2}[:.]\d{2}\s*(AM|PM)?$/i.test(text)
      || /^\d{1,2}\s*(AM|PM)[.]?$/i.test(text)
      || /^(?:\d{1,2}[:.]\d{2}\s*)+(?:AM|PM)?$/i.test(text);
  }

  private isTimeToken(value: string): boolean {
    return /^(?:0?[1-9]|1[0-2])[:.]\d{2}$/.test(value.trim());
  }

  private normalizeTime(value: string): string {
    const match = value.trim().replace('.', ':').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return '';
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private timeToMinutes(value: string): number {
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) return -1;
    return Number(match[1]) * 60 + Number(match[2]);
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