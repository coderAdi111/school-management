import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { StudentService } from '../../services/student.services';
import { ClassroomService } from '../../services/classroom.services';
import { ClassRoom, AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection } from '../../models/models';

import { Student } from '../../models/models';
import { AcademicService } from '../../services/academic.service';
import { forkJoin } from 'rxjs';


@Component({
  selector: 'app-student-list',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],

  templateUrl: './student-list.component.html',

  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {

  // =========================
  // STUDENTS
  // =========================

  students: Student[] = [];


  // =========================
  // SEARCH
  // =========================

  searchTerm = '';


  // =========================
  // LOADING
  // =========================

  loading = false;


  // =========================
  // ERROR
  // =========================

  errorMsg = '';
  classes: ClassRoom[] = [];
  selectedDepartment = '';
  selectedBranch = '';
  selectedSemester: number | '' = '';
  selectedSection = '';
  academicDepartments: AcademicDepartment[] = [];
  academicBranches: AcademicBranch[] = [];
  academicSemesters: AcademicSemester[] = [];
  academicSections: AcademicSection[] = [];

  // =========================
  // BULK STUDENT IMPORT
  // =========================
  bulkOpen = false;
  bulkMode: 'csv' | 'image' | 'pdf' = 'image';
  bulkBusy = false;
  bulkFileName = '';
  bulkMessage = '';
  bulkError = '';
  bulkRows: Array<{
    rollNo?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    section?: string;
    raw?: string;
    valid: boolean;
    error?: string;
  }> = [];

  bulkDepartment = '';
  bulkBranch = '';
  bulkSemester: number | '' = '';
  bulkSection = '';

  // =========================
  // BULK STUDENT ACTIONS
  // =========================
  selectedStudentIds = new Set<number>();
  bulkActionBusy = false;
  bulkMoveOpen = false;
  bulkMoveClassId: number | '' = '';
  bulkMoveDepartment = '';
  bulkMoveBranch = '';
  bulkMoveSemester: number | '' = '';
  bulkMoveSection = '';

  get selectedCount(): number {
    return this.selectedStudentIds.size;
  }

  get allVisibleSelected(): boolean {
    const ids = this.students.map(s => s.id).filter((id): id is number => id != null);
    return ids.length > 0 && ids.every(id => this.selectedStudentIds.has(id));
  }

  get bulkMoveBranches(): string[] {
    const dept = this.academicDepartments.find(d => d.name === this.bulkMoveDepartment);
    return this.academicBranches
      .filter(b => !dept || b.department?.id === dept.id)
      .map(b => b.code || b.name)
      .filter(Boolean)
      .sort();
  }

  get bulkMoveSemesters(): number[] {
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.bulkMoveBranch);
    return this.academicSemesters
      .filter(s => !branch || s.branch?.id === branch.id)
      .map(s => Number(s.semesterNumber))
      .filter(n => n > 0)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);
  }

  get bulkMoveSections(): string[] {
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.bulkMoveBranch);
    const semester = this.academicSemesters.find(
      s => s.branch?.id === branch?.id && Number(s.semesterNumber) === Number(this.bulkMoveSemester)
    );
    return this.academicSections
      .filter(s => !semester || s.semester?.id === semester.id)
      .map(s => s.name)
      .filter(Boolean)
      .sort();
  }

  onBulkMoveDepartmentChange(): void {
    this.bulkMoveBranch = '';
    this.bulkMoveSemester = '';
    this.bulkMoveSection = '';
    this.bulkMoveClassId = '';
  }

  onBulkMoveBranchChange(): void {
    this.bulkMoveSemester = '';
    this.bulkMoveSection = '';
    this.bulkMoveClassId = '';
  }

  onBulkMoveSemesterChange(): void {
    this.bulkMoveSection = '';
    this.bulkMoveClassId = '';
  }

  onBulkMoveSectionChange(): void {
    const target = this.classes.find(c =>
      c.department === this.bulkMoveDepartment &&
      c.branch === this.bulkMoveBranch &&
      Number(c.semester) === Number(this.bulkMoveSemester) &&
      c.section === this.bulkMoveSection
    );
    this.bulkMoveClassId = target?.id ?? '';
  }

  get bulkClasses(): ClassRoom[] {
    return this.classes.filter(c =>
      (!this.bulkDepartment || c.department === this.bulkDepartment) &&
      (!this.bulkBranch || c.branch === this.bulkBranch) &&
      (!this.bulkSemester || Number(c.semester) === Number(this.bulkSemester)) &&
      (!this.bulkSection || c.section === this.bulkSection)
    );
  }

  constructor(
    private studentService: StudentService,
    private classroomService: ClassroomService,
    private academicService: AcademicService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadClasses();
    this.loadAcademicStructure();
    this.loadStudents();

  }


  loadClasses(): void {
    this.classroomService.getAll().subscribe({
      next: data => { this.classes = data ?? []; this.cdr.detectChanges(); },
      error: err => console.error('Class load error:', err)
    });
  }

  get departments(): string[] {
    return this.academicDepartments.map(d => d.name).sort();
  }
  get branches(): string[] {
    const dept = this.academicDepartments.find(d => d.name === this.selectedDepartment);
    return this.academicBranches.filter(b => !dept || b.department?.id === dept.id).map(b => b.code || b.name).filter(Boolean).sort();
  }
  get semesters(): number[] {
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.selectedBranch);
    return this.academicSemesters.filter(s => !branch || s.branch?.id === branch.id).map(s => Number(s.semesterNumber)).filter(n => n > 0).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
  }
  get sections(): string[] {
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.selectedBranch);
    const semester = this.academicSemesters.find(s => s.branch?.id === branch?.id && Number(s.semesterNumber) === Number(this.selectedSemester));
    return this.academicSections.filter(s => !semester || s.semester?.id === semester.id).map(s => s.name).filter(Boolean).sort();
  }

  loadAcademicStructure(): void {
    this.academicService.departments().subscribe({
      next: departments => {
        this.academicDepartments = (departments ?? []).filter(d => d.active !== false);
        const branchCalls = this.academicDepartments.filter(d => d.id).map(d => this.academicService.branches(d.id!));
        if (!branchCalls.length) return;
        forkJoin(branchCalls).subscribe({
          next: branchResults => {
            this.academicBranches = branchResults.flat().filter(b => b.active !== false);
            const semesterCalls = this.academicBranches.filter(b => b.id).map(b => this.academicService.semesters(b.id!));
            if (!semesterCalls.length) return;
            forkJoin(semesterCalls).subscribe({
              next: semesterResults => {
                this.academicSemesters = semesterResults.flat().filter(s => s.active !== false);
                const sectionCalls = this.academicSemesters.filter(s => s.id).map(s => this.academicService.sections(s.id!));
                if (!sectionCalls.length) { this.cdr.detectChanges(); return; }
                forkJoin(sectionCalls).subscribe({
                  next: sectionResults => { this.academicSections = sectionResults.flat().filter(s => s.active !== false); this.cdr.detectChanges(); },
                  error: e => console.error('Academic sections load error:', e)
                });
              },
              error: e => console.error('Academic semesters load error:', e)
            });
          },
          error: e => console.error('Academic branches load error:', e)
        });
      },
      error: e => console.error('Academic departments load error:', e)
    });
  }

  applyFilters(): void {
    this.loadStudents();
  }

  private matchesAcademic(s: Student): boolean {
    const c = s.classRoom;
    return (!this.selectedDepartment || c?.department === this.selectedDepartment) &&
      (!this.selectedBranch || c?.branch === this.selectedBranch) &&
      (!this.selectedSemester || Number(c?.semester) === Number(this.selectedSemester)) &&
      (!this.selectedSection || c?.section === this.selectedSection);
  }

  // =========================
  // LOAD STUDENTS
  // =========================

  loadStudents(): void {

    this.loading = true;

    this.errorMsg = '';

    this.cdr.detectChanges();


    this.studentService
      .getAll()
      .subscribe({

        next: (data: Student[]) => {

          console.log(
            'Students loaded:',
            data
          );

          this.students = (data ?? []).filter(s => this.matchesAcademic(s));
          this.pruneSelection();

          this.loading = false;

          this.cdr.detectChanges();

        },

        error: (err: any) => {

          console.error(
            'Student load error:',
            err
          );

          this.loading = false;

          this.errorMsg =
            'Failed to load students. Is Spring Boot running?';

          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // SEARCH
  // =========================

  search(): void {

    const term =
      this.searchTerm.trim();


    if (!term) {

      this.loadStudents();

      return;

    }


    this.loading = true;

    this.errorMsg = '';

    this.cdr.detectChanges();


    this.studentService
      .search(term)
      .subscribe({

        next: (data: Student[]) => {

          console.log(
            'Students search result:',
            data
          );

          this.students = (data ?? []).filter(s => this.matchesAcademic(s));
          this.pruneSelection();

          this.loading = false;

          this.cdr.detectChanges();

        },

        error: (err: any) => {

          console.error(
            'Student search error:',
            err
          );

          this.loading = false;

          this.errorMsg =
            'Failed to search students.';

          this.cdr.detectChanges();

        }

      });

  }



  // =========================
  // BULK STUDENT IMPORT
  // =========================

  openBulkImport(): void {
    this.bulkOpen = true;
    this.bulkMode = 'image';
    this.bulkBusy = false;
    this.bulkFileName = '';
    this.bulkMessage = '';
    this.bulkError = '';
    this.bulkRows = [];
    this.bulkDepartment = this.selectedDepartment;
    this.bulkBranch = this.selectedBranch;
    this.bulkSemester = this.selectedSemester;
    this.bulkSection = this.selectedSection;
    this.cdr.detectChanges();
  }

  closeBulkImport(): void {
    if (this.bulkBusy) return;
    this.bulkOpen = false;
    this.bulkRows = [];
    this.bulkError = '';
    this.bulkMessage = '';
    this.bulkFileName = '';
  }

  private normalizeSection(value: unknown): string {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return '';
    const compact = raw.replace(/\s+/g, '');
    const match = compact.match(/(?:SECTION|SEC|CLASS)?[-_]?([A-Z]{1,3}\d{1,3})$/);
    return match?.[1] || compact;
  }

  private findBulkClass(section?: string): ClassRoom | undefined {
    const wantedSection = this.normalizeSection(section || this.bulkSection);
    return this.classes.find(c =>
      (!this.bulkDepartment || c.department === this.bulkDepartment) &&
      (!this.bulkBranch || c.branch === this.bulkBranch) &&
      (!this.bulkSemester || Number(c.semester) === Number(this.bulkSemester)) &&
      (!wantedSection || this.normalizeSection(c.section) === wantedSection)
    );
  }

  private async ensureBulkClass(section: string): Promise<ClassRoom | undefined> {
    const existing = this.findBulkClass(section);
    if (existing?.id) return existing;

    const normalizedSection = this.normalizeSection(section);
    if (!this.bulkDepartment || !this.bulkBranch || !this.bulkSemester || !normalizedSection) return undefined;

    const created = await new Promise<ClassRoom | undefined>((resolve) => {
      const payload: ClassRoom = {
        name: `${this.bulkSemester} Semester ${this.bulkBranch} - ${normalizedSection}`,
        grade: `${this.bulkSemester} Semester`,
        section: normalizedSection,
        department: this.bulkDepartment,
        branch: this.bulkBranch,
        semester: Number(this.bulkSemester),
        capacity: 100
      };
      this.classroomService.create(payload).subscribe({
        next: value => resolve(value),
        error: err => {
          console.error('Bulk import class creation error:', err);
          resolve(undefined);
        }
      });
    });

    if (created?.id) {
      const duplicate = this.classes.find(c =>
        c.department === created.department &&
        c.branch === created.branch &&
        Number(c.semester) === Number(created.semester) &&
        this.normalizeSection(c.section) === normalizedSection
      );
      if (!duplicate) this.classes = [...this.classes, created];
      return created;
    }
    return undefined;
  }

  private sectionFromValue(value: unknown): string {
    const normalized = this.normalizeSection(value);
    if (!normalized) return '';

    // Prefer an already configured class/section when it exists.
    const known = this.classes
      .filter(c =>
        (!this.bulkDepartment || c.department === this.bulkDepartment) &&
        (!this.bulkBranch || c.branch === this.bulkBranch) &&
        (!this.bulkSemester || Number(c.semester) === Number(this.bulkSemester))
      )
      .map(c => this.normalizeSection(c.section))
      .filter(Boolean);
    const configured = known.find(s => normalized === s || normalized.includes(s));
    if (configured) return configured;

    // College student-list files commonly use Batch values such as
    // CA1, CA2, CB1, CB2. These are the actual student groups/sections
    // for import, even when their ClassRoom rows have not been created yet.
    // Do not require the section to already exist in the database; saveBulkStudents()
    // will create the missing class automatically.
    if (/^[A-Z]{1,3}\d{1,3}$/.test(normalized)) return normalized;

    return '';
  }

  private detectSectionInText(line: string): string {
    const candidates = line.toUpperCase().match(/(?:SECTION|SEC)?\s*[:\-]?\s*([A-Z]{1,3}\d{1,3})\b/g) || [];
    for (const candidate of candidates) {
      const section = this.sectionFromValue(candidate.replace(/^(SECTION|SEC)\s*[:\-]?/i, ''));
      if (section) return section;
    }
    const tokens = line.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    for (const token of tokens) {
      const section = this.sectionFromValue(token);
      if (section) return section;
    }
    return '';
  }

  private validateBulkRows(): void {
    this.bulkRows = this.bulkRows.map(row => {
      const firstName = row.firstName.trim();
      const lastName = row.lastName.trim();
      const rollNo = String(row.rollNo || '').trim();
      // Email is optional in college roll-list files. If it is missing,
      // create a deterministic internal email from the roll number so the
      // existing backend validation/unique-email rule can still be used.
      const email = (row.email || (rollNo ? `${rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.local` : '')).trim().toLowerCase();
      const section = this.sectionFromValue(row.section || this.bulkSection);
      let error = '';
      if (!firstName) error = 'Name incomplete';
      else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error = 'Email or Roll No required';
      else if (!section) error = 'Section/Batch required or select a target section';
      // A detected section does not have to exist beforehand. The import
      // flow creates the missing Department/Branch/Semester/Section class.
      return { ...row, rollNo, firstName, lastName, email, section, valid: !error, error };
    });
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.bulkRows = [];
    this.bulkError = '';
    this.bulkMessage = '';
    if (!file) return;

    this.bulkFileName = file.name;
    const lower = file.name.toLowerCase();

    try {
      if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
        this.bulkMode = 'csv';
        this.bulkRows = this.parseStudentCsv(await file.text());
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        this.bulkMode = 'csv';
        this.bulkRows = await this.parseStudentExcel(file);
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(lower)) {
        this.bulkMode = 'image';
        this.bulkRows = await this.ocrStudentFile(file);
      } else if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
        this.bulkMode = 'pdf';
        this.bulkRows = await this.ocrStudentFile(file);
      } else {
        throw new Error('Please upload CSV, XLS/XLSX, JPG, PNG, WEBP, BMP image or PDF.');
      }

      this.validateBulkRows();
      const valid = this.bulkRows.filter(r => r.valid).length;
      const sections = [...new Set(this.bulkRows.map(r => r.section).filter(Boolean))];
      this.bulkMessage = `${this.bulkRows.length} students detected. ${valid} ready to import${sections.length > 1 ? ` across ${sections.join(', ')}` : ''}.`;
    } catch (err: any) {
      console.error('Bulk student import error:', err);
      this.bulkError = err?.message || 'Could not read the student list.';
      this.bulkRows = [];
    } finally {
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  private parseStudentCsv(text: string): typeof this.bulkRows {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim());
    if (lines.length < 2) throw new Error('CSV must contain a header and at least one student.');

    const parse = (line: string) => {
      const out: string[] = [];
      let value = '', quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (quoted && line[i + 1] === '"') { value += '"'; i++; }
          else quoted = !quoted;
        } else if ((ch === ',' || ch === ';' || ch === '\t') && !quoted) {
          out.push(value.trim()); value = '';
        } else value += ch;
      }
      out.push(value.trim());
      return out;
    };

    const headers = parse(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const idx = (...names: string[]) => {
      for (const name of names) {
        const i = headers.indexOf(name);
        if (i >= 0) return i;
      }
      return -1;
    };

    const first = idx('firstname', 'name', 'studentname', 'student');
    const last = idx('lastname', 'surname', 'lastname');
    const email = idx('email', 'emailid', 'emailaddress');
    const phone = idx('phone', 'mobile', 'mobileno', 'contact', 'contactno');
    const section = idx('section', 'sec', 'classsection', 'studentsection');
    const batch = idx('batch', 'group', 'labgroup', 'batchname');
    const roll = idx('rollno', 'rollnumber', 'roll', 'enrollmentno', 'enrollmentnumber', 'collegerollno');
    if (first < 0) throw new Error('File needs a Name/Student Name or First Name column.');
    if (email < 0 && roll < 0) throw new Error('File needs an Email column or Roll No column.');

    return lines.slice(1).map(line => {
      const c = parse(line);
      const full = c[first] || '';
      const parts = full.trim().split(/\s+/).filter(Boolean);
      const firstName = last >= 0 ? (c[first] || '') : (parts.shift() || '');
      const lastName = last >= 0 ? (c[last] || '') : (parts.join(' ') || '');
      return {
        rollNo: roll >= 0 ? c[roll] || '' : '',
        firstName,
        lastName,
        email: email >= 0 ? c[email] || '' : '',
        phone: phone >= 0 ? c[phone] || '' : '',
        section: batch >= 0 ? this.sectionFromValue(c[batch]) : (section >= 0 ? this.sectionFromValue(c[section]) : (this.detectSectionInText(line) || this.bulkSection)),
        valid: false,
        raw: line
      };
    });
  }

  private async parseStudentExcel(file: File): Promise<typeof this.bulkRows> {
    const xlsxModule: any = await import('xlsx');
    const XLSX: any = xlsxModule.default ?? xlsxModule;
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows: typeof this.bulkRows = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (csv.trim()) rows.push(...this.parseStudentCsv(csv));
    }
    if (!rows.length) throw new Error('No student rows found in the Excel file.');
    return rows;
  }

  private async ocrStudentFile(file: File): Promise<typeof this.bulkRows> {
    let worker: any = null;
    const objectUrls: string[] = [];
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        const textRows = await this.extractPdfStudentRows(file);
        if (textRows.length) return textRows;
      }

      const tesseractModule: any = await import('tesseract.js');
      const tesseract: any = tesseractModule.default ?? tesseractModule;
      worker = await tesseract.createWorker('eng');
      await worker.setParameters({ tessedit_pageseg_mode: '6' as any });

      const images: Array<string | HTMLCanvasElement> = [];
      if (isPdf) {
        const pdfjs: any = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs';
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pageCount = Math.min(pdf.numPages, 30);
        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          images.push(canvas);
        }
      } else {
        const objectUrl = URL.createObjectURL(file);
        objectUrls.push(objectUrl);
        const image = new Image();
        image.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Could not load the uploaded image for OCR.'));
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not prepare the image for OCR.');
        ctx.drawImage(image, 0, 0);
        images.push(canvas);
      }

      const rows: typeof this.bulkRows = [];
      for (const image of images) {
        const result = await worker.recognize(image);
        rows.push(...this.parseStudentOcrText(String(result?.data?.text || '')));
      }
      if (!rows.length) throw new Error('No student rows were detected. Use a clear table containing Roll No, Student Name and Section/Batch. Email is optional.');
      return rows;
    } finally {
      for (const url of objectUrls) URL.revokeObjectURL(url);
      if (worker) { try { await worker.terminate(); } catch {} }
    }
  }

  private async extractPdfStudentRows(file: File): Promise<typeof this.bulkRows> {
    const pdfjs: any = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const rows: typeof this.bulkRows = [];

    for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 50); pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const items = (content.items || []).filter((x: any) => typeof x.str === 'string' && x.str.trim());
      const lines: any[][] = [];

      for (const item of items) {
        const y = Number(item.transform?.[5] ?? 0);
        let line = lines.find((g: any[]) => Math.abs(Number(g[0].transform?.[5] ?? 0) - y) < 3);
        if (!line) { line = []; lines.push(line); }
        line.push(item);
      }

      lines.sort((a, b) => Number(b[0]?.transform?.[5] ?? 0) - Number(a[0]?.transform?.[5] ?? 0));
      for (const group of lines) {
        group.sort((a: any, b: any) => Number(a.transform?.[4] ?? 0) - Number(b.transform?.[4] ?? 0));
        const line = group.map((x: any) => String(x.str).trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        const parsed = this.parseStudentTableLine(line);
        if (parsed) rows.push(parsed);
      }
    }
    return rows;
  }

  private parseStudentTableLine(line: string): typeof this.bulkRows[number] | null {
    const normalized = line.replace(/\s+/g, ' ').trim();
    if (!normalized || /^(s\.?no|college roll no|student name|section|batch)\b/i.test(normalized)) return null;

    // College-list form can appear in PDF extraction as either:
    //   1 24CS01 Aaliya Farheen A CA1
    // or, when the visual Section column is dropped by PDF.js:
    //   1 24CS01 Aaliya Farheen CA1
    // The final CA1/CA2/CB1/CB2 token is the actual import group.
    const match = normalized.match(/^\s*(?:\d+\s+)?(\d{2}[A-Z]{2,4}\d{2,4})\s+(.+?)(?:\s+[A-Z])?\s+([A-Z]{1,4}\d{1,3})\s*$/i);
    if (!match) return null;

    const rollNo = match[1].toUpperCase();
    const name = match[2].trim();
    const batch = this.sectionFromValue(match[3]) || this.normalizeSection(match[3]);
    if (!name || !batch) return null;
    const parts = name.split(/\s+/).filter(Boolean);
    return {
      rollNo,
      firstName: parts.shift() || '',
      lastName: parts.join(' '),
      email: '',
      phone: '',
      section: batch,
      valid: false,
      raw: normalized
    };
  }

  private parseStudentOcrText(text: string): typeof this.bulkRows {
    const rows: typeof this.bulkRows = [];
    const lines = text.split(/\r?\n/).map(x => x.replace(/\u00a0/g, ' ').trim()).filter(Boolean);
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phoneRe = /(?:\+91[\s-]?)?[6-9]\d{9}/;

    for (const line of lines) {
      const tableRow = this.parseStudentTableLine(line);
      if (tableRow) { rows.push(tableRow); continue; }

      const emailMatch = line.match(emailRe);
      const rollMatch = line.match(/\b(\d{2}[A-Z]{2,4}\d{2,4})\b/i);
      const batchMatch = line.match(/\b([A-Z]{1,4}\d{1,3})\b/i);
      if (!emailMatch && !rollMatch) continue;

      const email = emailMatch?.[0]?.toLowerCase() || '';
      const rollNo = rollMatch?.[1]?.toUpperCase() || '';
      let before = line;
      if (rollMatch) before = before.slice((rollMatch.index || 0) + rollMatch[0].length);
      if (emailMatch) before = before.slice(0, Math.max(0, before.indexOf(emailMatch[0])));
      const phoneMatch = line.match(phoneRe);
      let namePart = before
        .replace(/^\s*(?:\d+|[A-Z]{1,4}\d{1,4})\s*[-.)]?\s*/i, '')
        .replace(/\b(?:SECTION|SEC)\s*[:\-]?\s*[A-Z]{1,3}\d{1,3}\b/ig, '')
        // Never allow the detected batch/group token to become part of the surname.
        .replace(/\b(?:CA1|CA2|CB1|CB2)\b\s*$/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (phoneMatch) namePart = namePart.replace(phoneMatch[0], '').trim();
      if (/^(roll|sr|s\.?no|enrollment|student|name|email|mobile|phone)\b/i.test(namePart)) continue;
      const detectedSection = (batchMatch ? this.sectionFromValue(batchMatch[1]) : '') || this.detectSectionInText(line) || this.bulkSection;
      const parts = namePart.split(/\s+/).filter(Boolean);
      if (!parts.length || !detectedSection) continue;
      rows.push({
        rollNo,
        firstName: parts.shift() || '',
        lastName: parts.join(' ') || '',
        email,
        phone: phoneMatch?.[0] || '',
        section: detectedSection,
        valid: false,
        raw: line
      });
    }
    return rows;
  }

  removeBulkRow(index: number): void {
    this.bulkRows.splice(index, 1);
    this.validateBulkRows();
  }

  async saveBulkStudents(): Promise<void> {
    if (this.bulkBusy) return;
    if (!this.bulkDepartment || !this.bulkBranch || !this.bulkSemester) {
      this.bulkError = 'Please select Department, Branch and Semester first.';
      return;
    }

    this.validateBulkRows();
    const validRows = this.bulkRows.filter(r => r.valid);
    if (!validRows.length) {
      this.bulkError = 'No valid student rows are ready to import.';
      return;
    }

    const counts = validRows.reduce((m, r) => { const key = r.section || this.bulkSection; m[key] = (m[key] || 0) + 1; return m; }, {} as Record<string, number>);
    const summary = Object.entries(counts).map(([section, count]) => `${section}: ${count}`).join(', ');
    if (!confirm(`Import ${validRows.length} students?\n\n${summary}`)) return;

    this.bulkBusy = true;
    this.bulkError = '';
    let saved = 0;
    let skipped = 0;

    const classCache = new Map<string, ClassRoom>();

    // Resolve/create each target class only once. The old importer sent all
    // students one-by-one, so 126 students meant 126 sequential HTTP waits.
    // Create students in small concurrent batches instead. This keeps the
    // browser/backend stable while making large imports much faster.
    const rowsWithClasses: Array<{ row: typeof validRows[number]; targetClass: ClassRoom }> = [];
    for (const row of validRows) {
      const section = this.normalizeSection(row.section || this.bulkSection);
      let targetClass = classCache.get(section) || this.findBulkClass(section);
      if (!targetClass?.id) targetClass = await this.ensureBulkClass(section);
      if (!targetClass?.id) { skipped++; continue; }
      classCache.set(section, targetClass);
      rowsWithClasses.push({ row, targetClass });
    }

    const importOne = async (item: typeof rowsWithClasses[number]): Promise<boolean> => {
      const { row, targetClass } = item;
      const payload: Student = {
        rollNo: row.rollNo || '',
        firstName: row.firstName,
        // Keep single-word names valid for the existing backend.
        lastName: row.lastName || '-',
        email: row.email,
        phone: row.phone || '',
        status: 'ACTIVE',
        enrollmentDate: new Date().toISOString().slice(0, 10),
        classRoom: {
          id: targetClass.id,
          name: targetClass.name,
          grade: targetClass.grade,
          section: targetClass.section,
          department: targetClass.department,
          branch: targetClass.branch,
          semester: targetClass.semester,
          teacher: targetClass.teacher,
          capacity: targetClass.capacity
        }
      };
      try {
        await new Promise<void>((resolve, reject) => {
          this.studentService.create(payload).subscribe({ next: () => resolve(), error: err => reject(err) });
        });
        return true;
      } catch {
        return false;
      }
    };

    // 12 parallel requests at a time: much faster than 126 sequential calls
    // without flooding the Spring Boot server/database.
    const CONCURRENCY = 12;
    for (let i = 0; i < rowsWithClasses.length; i += CONCURRENCY) {
      const batch = rowsWithClasses.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(importOne));
      saved += results.filter(Boolean).length;
      skipped += results.filter(ok => !ok).length;
      this.bulkMessage = `Importing students... ${Math.min(i + batch.length, rowsWithClasses.length)}/${rowsWithClasses.length}`;
      this.cdr.detectChanges();
    }

    this.bulkBusy = false;
    this.bulkMessage = `Import complete: ${saved} added, ${skipped} skipped (duplicates/errors).`;
    this.loadStudents();
    this.cdr.detectChanges();
  }

  // =========================
  // BULK STUDENT ACTIONS
  // =========================

  toggleStudentSelection(id: number | undefined): void {
    if (id == null) return;
    if (this.selectedStudentIds.has(id)) this.selectedStudentIds.delete(id);
    else this.selectedStudentIds.add(id);
  }

  isStudentSelected(id: number | undefined): boolean {
    return id != null && this.selectedStudentIds.has(id);
  }

  toggleSelectAllVisible(): void {
    const ids = this.students.map(s => s.id).filter((id): id is number => id != null);
    if (!ids.length) return;
    if (ids.every(id => this.selectedStudentIds.has(id))) {
      ids.forEach(id => this.selectedStudentIds.delete(id));
    } else {
      ids.forEach(id => this.selectedStudentIds.add(id));
    }
  }

  clearSelection(): void {
    this.selectedStudentIds.clear();
  }

  private pruneSelection(): void {
    const visible = new Set(this.students.map(s => s.id).filter((id): id is number => id != null));
    this.selectedStudentIds.forEach(id => { if (!visible.has(id)) this.selectedStudentIds.delete(id); });
  }

  get filteredScopeLabel(): string {
    const parts: string[] = [];
    if (this.selectedDepartment) parts.push(this.selectedDepartment);
    if (this.selectedBranch) parts.push(this.selectedBranch);
    if (this.selectedSemester) parts.push(`${this.selectedSemester} Semester`);
    if (this.selectedSection) parts.push(`Section ${this.selectedSection}`);
    return parts.length ? parts.join(' • ') : 'current search results';
  }

  deleteSelectedStudents(): void {
    const ids = Array.from(this.selectedStudentIds);
    if (!ids.length || this.bulkActionBusy) return;
    const ok = confirm(`Delete ${ids.length} selected student${ids.length === 1 ? '' : 's'}?\n\nStudents will be deactivated, so their attendance/marks/fees history stays safe.`);
    if (!ok) return;

    this.bulkActionBusy = true;
    this.errorMsg = '';
    this.studentService.bulkDelete(ids).subscribe({
      next: result => {
        this.selectedStudentIds.clear();
        this.bulkActionBusy = false;
        this.loadStudents();
        this.errorMsg = '';
        alert(`${result?.deleted ?? ids.length} student${(result?.deleted ?? ids.length) === 1 ? '' : 's'} deleted successfully.`);
      },
      error: err => {
        console.error('Bulk delete error:', err);
        this.bulkActionBusy = false;
        this.errorMsg = 'Bulk delete failed. Please check the backend and try again.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteAllFilteredStudents(): void {
    const ids = this.students.map(s => s.id).filter((id): id is number => id != null);
    if (!ids.length || this.bulkActionBusy) return;
    const scope = this.filteredScopeLabel;
    const ok = confirm(`Delete ALL ${ids.length} students from ${scope}?\n\nThis affects only the students currently shown by your filters/search. Their records will be deactivated, not physically erased.`);
    if (!ok) return;
    this.selectedStudentIds = new Set(ids);
    this.deleteSelectedStudents();
  }

  openBulkMove(): void {
    if (!this.selectedCount) return;
    this.bulkMoveClassId = '';
    this.bulkMoveDepartment = '';
    this.bulkMoveBranch = '';
    this.bulkMoveSemester = '';
    this.bulkMoveSection = '';
    this.bulkMoveOpen = true;
  }

  closeBulkMove(): void {
    if (!this.bulkActionBusy) this.bulkMoveOpen = false;
  }

  moveSelectedStudents(): void {
    const ids = Array.from(this.selectedStudentIds);
    const classId = Number(this.bulkMoveClassId);
    if (!ids.length || !classId || this.bulkActionBusy) return;
    const target = this.classes.find(c => Number(c.id) === classId);
    if (!target) return;
    if (!confirm(`Move ${ids.length} selected student${ids.length === 1 ? '' : 's'} to ${target.name}?`)) return;

    this.bulkActionBusy = true;
    this.studentService.bulkMove(ids, classId).subscribe({
      next: result => {
        this.bulkMoveOpen = false;
        this.selectedStudentIds.clear();
        this.bulkActionBusy = false;
        this.loadStudents();
        alert(`${result?.moved ?? ids.length} student${(result?.moved ?? ids.length) === 1 ? '' : 's'} moved successfully.`);
      },
      error: err => {
        console.error('Bulk move error:', err);
        this.bulkActionBusy = false;
        this.errorMsg = 'Students could not be moved. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  exportVisibleStudents(): void {
    if (!this.students.length) return;
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'Email', 'Phone', 'Department', 'Branch', 'Semester', 'Section', 'Status'];
    const rows = this.students.map(s => [
      `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
      s.email ?? '',
      s.phone ?? '',
      s.classRoom?.department ?? '',
      s.classRoom?.branch ?? '',
      s.classRoom?.semester ?? '',
      s.classRoom?.section ?? '',
      s.status ?? ''
    ]);
    const csv = [header, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =========================
  // DELETE
  // =========================


  deleteStudent(id: number): void {

    if (
      !confirm(
        'Delete this student? This cannot be undone.'
      )
    ) {

      return;

    }


    this.studentService
      .delete(id)
      .subscribe({

        next: () => {

          this.students =
            this.students.filter(
              student =>
                student.id !== id
            );
          this.selectedStudentIds.delete(id);

          this.cdr.detectChanges();

        },

        error: (err: any) => {

          console.error(
            'Delete student error:',
            err
          );

          this.errorMsg =
            'Failed to delete student.';

          this.cdr.detectChanges();

        }

      });

  }

}