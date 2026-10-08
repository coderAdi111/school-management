import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../services/teacher.services';
import { AcademicService } from '../../services/academic.service';
import { Teacher, TeacherAssignment, AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection } from '../../models/models';
import * as XLSX from 'xlsx';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-list.html',
  styleUrl: './teacher-list.css'
})
export class TeacherListComponent implements OnInit {
  teachers: Teacher[] = [];
  searchTerm = '';
  loading = false;
  saving = false;
  errorMessage = '';
  showForm = false;
  editing = false;
  selectedTeacherId: number | null = null;
  formTeacher: Teacher = this.emptyTeacher();

  departments: AcademicDepartment[] = [];
  branches: AcademicBranch[] = [];
  semesters: AcademicSemester[] = [];
  sections: AcademicSection[] = [];
  assignmentDraft: TeacherAssignment = { subject: '' };

  // Bulk teacher import
  showImport = false;
  importRows: any[] = [];
  importError = '';
  importing = false;
  importProgress = 0;
  importFileName = '';
  private academicCacheReady = false;

  // Teacher list filters: a teacher remains visible when ANY of their
  // teaching assignments matches the selected academic scope.
  filterDepartmentId: number | null = null;
  filterBranchId: number | null = null;
  filterSemesterId: number | null = null;
  filterSectionId: number | null = null;

  // Bulk teacher selection/actions
  selectedTeacherIds = new Set<number>();
  bulkActionBusy = false;

  get selectedCount(): number {
    return this.selectedTeacherIds.size;
  }

  get allVisibleSelected(): boolean {
    const ids = this.filteredTeachers
      .map(t => t.id)
      .filter((id): id is number => id != null);
    return ids.length > 0 && ids.every(id => this.selectedTeacherIds.has(id));
  }

  isTeacherSelected(id: number | undefined): boolean {
    return id != null && this.selectedTeacherIds.has(id);
  }

  toggleTeacherSelection(id: number | undefined): void {
    if (id == null) return;
    if (this.selectedTeacherIds.has(id)) this.selectedTeacherIds.delete(id);
    else this.selectedTeacherIds.add(id);
  }

  toggleSelectAllVisible(): void {
    const ids = this.filteredTeachers
      .map(t => t.id)
      .filter((id): id is number => id != null);
    if (!ids.length) return;
    if (this.allVisibleSelected) ids.forEach(id => this.selectedTeacherIds.delete(id));
    else ids.forEach(id => this.selectedTeacherIds.add(id));
  }

  clearTeacherSelection(): void {
    this.selectedTeacherIds.clear();
  }

  private async deleteTeacherIds(ids: number[]): Promise<void> {
    if (!ids.length) return;
    this.bulkActionBusy = true;
    this.loading = true;
    try {
      await new Promise<void>((resolve, reject) => {
        forkJoin(ids.map(id => this.teacherService.delete(id))).subscribe({
          next: () => resolve(),
          error: error => reject(error)
        });
      });
      ids.forEach(id => this.selectedTeacherIds.delete(id));
      this.loadTeachers();
    } catch (error) {
      console.error('Bulk teacher delete failed:', error);
      this.errorMessage = 'Failed to delete one or more teachers.';
      this.loading = false;
    } finally {
      this.bulkActionBusy = false;
      this.cdr.detectChanges();
    }
  }

  deleteSelectedTeachers(): void {
    const ids = Array.from(this.selectedTeacherIds);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected teacher(s)?\n\nThis action cannot be undone.`)) return;
    void this.deleteTeacherIds(ids);
  }

  deleteAllFilteredTeachers(): void {
    const ids = this.filteredTeachers
      .map(t => t.id)
      .filter((id): id is number => id != null);
    if (!ids.length) return;
    if (!confirm(`Delete all ${ids.length} teacher(s) currently visible?\n\nOnly teachers matching the current Department / Branch / Semester / Section / Search filters will be deleted.`)) return;
    void this.deleteTeacherIds(ids);
  }

  constructor(
    private teacherService: TeacherService,
    private academicService: AcademicService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAcademic();
    this.loadTeachers();
  }

  emptyTeacher(): Teacher {
    return { firstName: '', lastName: '', email: '', phone: '', subject: '', qualification: '', facultyCode: '', status: 'ACTIVE', assignments: [] };
  }

  parseAssignments(teacher: Teacher): TeacherAssignment[] {
    if (teacher.assignments?.length) return [...teacher.assignments];
    if (!teacher.teachingAssignments) return [];
    try {
      const parsed = JSON.parse(teacher.teachingAssignments);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private filterCurrentTeachers(data: Teacher[]): Teacher[] {
    return (data ?? []).filter(t => (t.status ?? 'ACTIVE') !== 'INACTIVE');
  }

  get filterBranches(): AcademicBranch[] {
    if (!this.filterDepartmentId) return this.branches;
    return this.branches.filter(b => b.department?.id === this.filterDepartmentId);
  }

  get filterSemesters(): AcademicSemester[] {
    if (!this.filterBranchId) return this.semesters;
    return this.semesters.filter(s => s.branch?.id === this.filterBranchId);
  }

  get filterSections(): AcademicSection[] {
    if (!this.filterSemesterId) return this.sections;
    return this.sections.filter(s => s.semester?.id === this.filterSemesterId);
  }

  get filteredTeachers(): Teacher[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.teachers.filter(t => {
      const name = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
      const assignments = this.parseAssignments(t);
      const textMatch = !term ||
        name.includes(term) ||
        String(t.email || '').toLowerCase().includes(term) ||
        String(t.facultyCode || '').toLowerCase().includes(term) ||
        assignments.some(a => `${a.subject} ${a.departmentName} ${a.branchName} ${a.branchCode} ${a.semesterName} ${a.sectionName}`.toLowerCase().includes(term));

      const scopeMatch = !this.filterDepartmentId && !this.filterBranchId && !this.filterSemesterId && !this.filterSectionId
        ? true
        : assignments.some(a =>
            (!this.filterDepartmentId || a.departmentId === this.filterDepartmentId) &&
            (!this.filterBranchId || a.branchId === this.filterBranchId) &&
            (!this.filterSemesterId || a.semesterId === this.filterSemesterId) &&
            (!this.filterSectionId || a.sectionId === this.filterSectionId)
          );

      return textMatch && scopeMatch;
    });
  }

  onFilterDepartmentChange(): void {
    this.filterBranchId = null;
    this.filterSemesterId = null;
    this.filterSectionId = null;
  }

  onFilterBranchChange(): void {
    this.filterSemesterId = null;
    this.filterSectionId = null;
  }

  onFilterSemesterChange(): void {
    this.filterSectionId = null;
  }

  resetTeacherFilters(): void {
    this.selectedTeacherIds.clear();
    this.searchTerm = '';
    this.filterDepartmentId = null;
    this.filterBranchId = null;
    this.filterSemesterId = null;
    this.filterSectionId = null;
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading = true; this.errorMessage = '';
    this.teacherService.getAll().subscribe({
      next: data => { this.teachers = this.filterCurrentTeachers(data).map(t => ({ ...t, assignments: this.parseAssignments(t) })); this.loading = false; this.cdr.detectChanges(); },
      error: error => { console.error('Teacher loading error:', error); this.loading = false; this.errorMessage = 'Failed to load teachers. Is Spring Boot running?'; this.cdr.detectChanges(); }
    });
  }

  search(): void {
    const term = this.searchTerm.trim();
    if (!term) { this.loadTeachers(); return; }
    this.loading = true; this.errorMessage = '';
    this.teacherService.search(term).subscribe({
      next: data => { this.teachers = this.filterCurrentTeachers(data).map(t => ({ ...t, assignments: this.parseAssignments(t) })); this.loading = false; this.cdr.detectChanges(); },
      error: error => { console.error('Teacher search error:', error); this.loading = false; this.errorMessage = 'Failed to search teachers.'; this.cdr.detectChanges(); }
    });
  }

  loadAcademic(): void {
    this.academicService.departments().subscribe({
      next: d => {
        this.departments = d.filter(x => x.active !== false);
        const branchCalls = this.departments.filter(d => d.id != null).map(d => this.academicService.branches(d.id!));
        if (!branchCalls.length) { this.academicCacheReady = true; return; }
        forkJoin(branchCalls).subscribe({
          next: groups => {
            this.branches = groups.flat().filter(x => x.active !== false);
            const semesterCalls = this.branches.filter(b => b.id != null).map(b => this.academicService.semesters(b.id!));
            if (!semesterCalls.length) { this.academicCacheReady = true; return; }
            forkJoin(semesterCalls).subscribe({
              next: semesterGroups => {
                this.semesters = semesterGroups.flat().filter(x => x.active !== false);
                const sectionCalls = this.semesters.filter(s => s.id != null).map(s => this.academicService.sections(s.id!));
                if (!sectionCalls.length) { this.academicCacheReady = true; return; }
                forkJoin(sectionCalls).subscribe({
                  next: sectionGroups => {
                    this.sections = sectionGroups.flat().filter(x => x.active !== false);
                    this.academicCacheReady = true;
                  },
                  error: () => this.academicCacheReady = false
                });
              },
              error: () => this.academicCacheReady = false
            });
          },
          error: () => this.academicCacheReady = false
        });
      },
      error: () => this.academicCacheReady = false
    });
  }

  onDepartmentChange(): void {
    this.branches = []; this.semesters = []; this.sections = [];
    this.assignmentDraft.branchId = undefined; this.assignmentDraft.semesterId = undefined; this.assignmentDraft.sectionId = undefined;
    if (this.assignmentDraft.departmentId) this.academicService.branches(this.assignmentDraft.departmentId).subscribe({ next: b => this.branches = b.filter(x => x.active !== false) });
  }

  onBranchChange(): void {
    this.semesters = []; this.sections = [];
    this.assignmentDraft.semesterId = undefined; this.assignmentDraft.sectionId = undefined;
    if (this.assignmentDraft.branchId) this.academicService.semesters(this.assignmentDraft.branchId).subscribe({ next: s => this.semesters = s.filter(x => x.active !== false) });
  }

  onSemesterChange(): void {
    this.sections = []; this.assignmentDraft.sectionId = undefined;
    if (this.assignmentDraft.semesterId) this.academicService.sections(this.assignmentDraft.semesterId).subscribe({ next: s => this.sections = s.filter(x => x.active !== false) });
  }

  addAssignment(): void {
    const d = this.departments.find(x => x.id === this.assignmentDraft.departmentId);
    const b = this.branches.find(x => x.id === this.assignmentDraft.branchId);
    const sem = this.semesters.find(x => x.id === this.assignmentDraft.semesterId);
    const sec = this.sections.find(x => x.id === this.assignmentDraft.sectionId);
    const subject = this.assignmentDraft.subject?.trim();
    if (!d || !b || !sem || !sec || !subject) { alert('Please select Department, Branch, Semester, Section and enter Subject.'); return; }
    const item: TeacherAssignment = { departmentId: d.id, departmentName: d.name, branchId: b.id, branchName: b.name, branchCode: b.code, semesterId: sem.id, semesterName: sem.name, sectionId: sec.id, sectionName: sec.name, subject };
    const list = this.formTeacher.assignments ?? [];
    const duplicate = list.some(x => x.departmentId === item.departmentId && x.branchId === item.branchId && x.semesterId === item.semesterId && x.sectionId === item.sectionId && x.subject.toLowerCase() === subject.toLowerCase());
    if (duplicate) { alert('This teaching assignment is already added.'); return; }
    this.formTeacher.assignments = [...list, item];
    this.assignmentDraft = { subject: '' };
  }

  removeAssignment(index: number): void { this.formTeacher.assignments = (this.formTeacher.assignments ?? []).filter((_, i) => i !== index); }

  openAddForm(): void { this.editing = false; this.selectedTeacherId = null; this.formTeacher = this.emptyTeacher(); this.resetAssignmentSelectors(); this.showForm = true; }

  openEditForm(teacher: Teacher): void { this.editing = true; this.selectedTeacherId = teacher.id ?? null; this.formTeacher = { ...teacher, assignments: this.parseAssignments(teacher) }; this.resetAssignmentSelectors(); this.showForm = true; }

  resetAssignmentSelectors(): void { this.branches = []; this.semesters = []; this.sections = []; this.assignmentDraft = { subject: '' }; }

  closeForm(): void { this.showForm = false; this.editing = false; this.selectedTeacherId = null; this.formTeacher = this.emptyTeacher(); this.resetAssignmentSelectors(); this.saving = false; }

  private generateFacultyCode(): string {
    const first = (this.formTeacher.firstName || '').trim();
    const last = (this.formTeacher.lastName || '').trim();
    const base = ((first[0] || '') + (last[0] || '')).toUpperCase() || 'T';
    const used = new Set(this.teachers.filter(t => t.id !== this.selectedTeacherId).map(t => (t.facultyCode || '').trim().toUpperCase()).filter(Boolean));
    if (!used.has(base)) return base;
    let n = 2; while (used.has(`${base}${n}`)) n++;
    return `${base}${n}`;
  }

  private duplicateNameCount(teacher: Teacher): number { const name = `${teacher.firstName} ${teacher.lastName}`.trim().toLowerCase(); return this.teachers.filter(t => `${t.firstName} ${t.lastName}`.trim().toLowerCase() === name).length; }
  getDisplayName(teacher: Teacher): string { const name = `${teacher.firstName} ${teacher.lastName}`.trim(); return this.duplicateNameCount(teacher) > 1 && teacher.facultyCode ? `${name} (${teacher.facultyCode})` : name; }

  saveTeacher(): void {
    if (!this.formTeacher.firstName?.trim()) { alert('Please enter first name.'); return; }
    if (!this.formTeacher.lastName?.trim()) { alert('Please enter last name.'); return; }
    this.saving = true;
    const assignments = this.formTeacher.assignments ?? [];
    const legacySubject = assignments.length ? assignments.map(a => a.subject).filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i).join(' / ') : (this.formTeacher.subject?.trim() || '');
    const teacherToSave: Teacher = { ...this.formTeacher, firstName: this.formTeacher.firstName.trim(), lastName: this.formTeacher.lastName.trim(), email: this.formTeacher.email?.trim() || '', phone: this.formTeacher.phone?.trim() || '', subject: legacySubject, facultyCode: this.formTeacher.facultyCode?.trim().toUpperCase() || this.generateFacultyCode(), qualification: this.formTeacher.qualification?.trim() || '', status: this.formTeacher.status || 'ACTIVE', teachingAssignments: JSON.stringify(assignments) };
    const request = this.editing && this.selectedTeacherId !== null ? this.teacherService.update(this.selectedTeacherId, teacherToSave) : this.teacherService.create(teacherToSave);
    request.subscribe({ next: () => { alert(this.editing ? 'Teacher updated successfully!' : 'Teacher added successfully!'); this.closeForm(); this.loadTeachers(); }, error: error => { console.error('Teacher save error:', error); this.saving = false; alert('Failed to save teacher.'); } });
  }

  // =========================
  // BULK TEACHER IMPORT
  // =========================

  openImport(): void {
    this.showImport = true;
    this.importRows = [];
    this.importError = '';
    this.importProgress = 0;
    this.importFileName = '';
  }

  closeImport(): void {
    if (this.importing) return;
    this.showImport = false;
    this.importRows = [];
    this.importError = '';
    this.importProgress = 0;
    this.importFileName = '';
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importFileName = file.name;
    this.importError = '';
    this.importRows = [];
    this.importProgress = 0;

    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (ext !== 'xlsx') {
      this.importError = 'Only XLSX (.xlsx) is supported. Please use the Teacher Import Template.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result as ArrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('No worksheet found');
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '', raw: false });
        this.importRows = this.normalizeImportRows(rows);
        if (!this.importRows.length) {
          this.importError = 'No teacher rows found. Use the fixed XLSX Teacher Import Template.';
        } else {
          const bad = this.importRows.filter(r => r.error).length;
          this.importError = bad
            ? `${this.importRows.length} rows detected. ${bad} row(s) need correction.`
            : `${this.importRows.length} rows detected. Review before importing.`;
        }
      } catch (e) {
        console.error('Teacher XLSX import error:', e);
        this.importRows = [];
        this.importError = 'Could not read this XLSX file. Please use the provided Teacher Import Template.';
      }
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.importError = 'Could not read the XLSX file.';
      this.cdr.detectChanges();
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  private parseTeacherDocumentText(text: string): any[] {
    const clean = (value: string): string =>
      String(value || '')
        .replace(/[|¦]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const lines = String(text || '')
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean);

    if (!lines.length) return [];

    const rows: any[] = [];

    // Strong PDF text-layer fallback: PDF extractors often lose the original
    // table line breaks. Parse the complete text stream around:
    // S.No -> Teacher (CODE) -> Subject/Lab -> CA1/CA2/CB1/CB2...
    // This path runs BEFORE OCR, so normal text PDFs never require Tesseract.
    const sectionPattern =
      '(?:CA|CB)\\s*[12](?:\\s*,\\s*(?:CA|CB)\\s*[12])*';

    const streamPattern = new RegExp(
      '(?:^|\\\\n|\\\\r|\\\\s)(\\\\d{1,3})[\\\\s.)-]+' +
      '(.+?)\\\\s*\\\\(([A-Z][A-Z0-9]{1,8})\\\\)\\\\s+' +
      '(.+?)\\\\s+(' + sectionPattern + ')(?=\\\\s|$)',
      'gi'
    );

    let streamMatch: RegExpExecArray | null;
    while ((streamMatch = streamPattern.exec(String(text || ''))) !== null) {
      const name = this.cleanTeacherName(streamMatch[2]);
      const code = streamMatch[3].toUpperCase();
      const subject = clean(streamMatch[4]);
      const section = clean(streamMatch[5]);

      // Avoid accidentally treating headings/source text as teachers.
      if (
        !name ||
        name.length < 3 ||
        /^(teacher|faculty|name|s\.?no|subject|section)$/i.test(name) ||
        !subject
      ) {
        continue;
      }

      rows.push(
        this.makeImportedTeacherRow(name, code, subject, section)
      );
    }

    // Some PDF text layers omit the S.No entirely. In that case use the
    // distinctive "(CODE) Subject Section" structure.
    if (!rows.length) {

      const noSerialPattern = new RegExp(
        String.raw`(^|\n|\r|\s)([A-Za-z][A-Za-z .&\-']{2,80}?)\s*\(([A-Z][A-Z0-9]{1,8})\)\s+(.+?)\s+(${sectionPattern})(?=\s|$)`,
        'gi'
      );

      let match: RegExpExecArray | null;
      while ((match = noSerialPattern.exec(String(text || ''))) !== null) {
        const name = this.cleanTeacherName(match[2]);
        const code = match[3].toUpperCase();
        const subject = clean(match[4]);
        const section = clean(match[5]);

        if (!name || !subject || name.length < 3) continue;

        rows.push(
          this.makeImportedTeacherRow(name, code, subject, section)
        );
      }
    }

    // Common academic timetable/faculty-table pattern:

    // 1
    // Dr. Satya Narayan Tazi (SNT)
    // COA
    // CA1, CA2, CB1, CB2
    //
    // Also supports:
    // 1 Dr. Satya Narayan Tazi (SNT) COA CA1, CA2...
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Single-line form.
      const single = line.match(
        /^(?:\d+[\s.)-]+)?(.+?)\s*\(([A-Z][A-Z0-9]{1,8})\)\s+(.+?)\s+((?:CA|CB|I|II|A|B)?\d(?:\s*,\s*(?:CA|CB|I|II|A|B)?\d)*)$/i
      );

      if (single) {
        const name = this.cleanTeacherName(single[1]);
        const code = single[2].toUpperCase();
        const subject = clean(single[3]);
        const section = clean(single[4]);

        if (name) {
          rows.push(this.makeImportedTeacherRow(name, code, subject, section));
        }
        continue;
      }

      // Multi-line S.No table.
      if (/^\d+[\s.)-]*$/.test(line) && i + 3 < lines.length) {
        const nameLine = lines[i + 1];
        const subjectLine = lines[i + 2];
        const sectionLine = lines[i + 3];

        const codeMatch = nameLine.match(/\(([A-Z][A-Z0-9]{1,8})\)/i);
        const looksLikeSections =
          /\b(?:CA|CB)\s*\d\b/i.test(sectionLine) ||
          /\b(?:I|II)\s*\d\b/i.test(sectionLine);

        if (codeMatch && looksLikeSections) {
          const name = this.cleanTeacherName(nameLine);
          const code = codeMatch[1].toUpperCase();

          if (name && subjectLine && sectionLine) {
            rows.push(
              this.makeImportedTeacherRow(
                name,
                code,
                subjectLine,
                sectionLine
              )
            );
            i += 3;
            continue;
          }
        }
      }
    }

    // Generic fallback for rows such as:
    // Teacher Name | Faculty Code | Subject | Section
    if (!rows.length) {
      for (const line of lines) {
        const codeMatch = line.match(/\(([A-Z][A-Z0-9]{1,8})\)/i);
        const sectionMatch = line.match(
          /\b((?:CA|CB)\s*[12](?:\s*,\s*(?:CA|CB)\s*[12]){0,3})\b/i
        );

        if (!codeMatch || !sectionMatch) continue;

        const code = codeMatch[1].toUpperCase();
        const name = this.cleanTeacherName(
          line.slice(0, codeMatch.index ?? 0)
        );

        if (!name) continue;

        const afterCode = line
          .slice((codeMatch.index ?? 0) + codeMatch[0].length)
          .replace(sectionMatch[0], '')
          .trim();

        if (!afterCode) continue;

        rows.push(
          this.makeImportedTeacherRow(
            name,
            code,
            afterCode,
            sectionMatch[1]
          )
        );
      }
    }

    // Generic fallback: email/phone based faculty list.
    if (!rows.length) {
      for (const line of lines) {
        const email = line.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        )?.[0] || '';

        const phone = line.match(
          /(?:\+91[\s-]?)?[6-9]\d{9}\b/
        )?.[0] || '';

        if (!email && !phone) continue;

        let remaining = line
          .replace(email, '')
          .replace(phone, '')
          .replace(/^\d+[\s.)-]+/, '')
          .trim();

        const codeMatch = remaining.match(
          /\b[A-Z]{2,8}(?:[-_/]?\d{1,4})?\b/
        );

        const code = codeMatch?.[0]?.toUpperCase() || '';
        if (codeMatch) remaining = remaining.replace(codeMatch[0], '').trim();

        const parts = remaining.split(/\s+/).filter(Boolean);
        if (parts.length < 2) continue;

        const firstName = parts.shift() || '';
        const lastName = parts.join(' ');

        rows.push({
          _index: rows.length + 1,
          firstName,
          lastName,
          email,
          phone,
          facultyCode: code,
          qualification: '',
          status: 'ACTIVE',
          department: '',
          branch: '',
          semester: '',
          section: '',
          subject: '',
          error: ''
        });
      }
    }

    // Deduplicate rows produced by multiple OCR/table passes.
    const seen = new Set<string>();
    return rows
      .filter(row => {
        const key = [
          row.firstName,
          row.lastName,
          row.email,
          row.facultyCode,
          row.subject,
          row.section
        ]
          .map((x: any) => String(x || '').trim().toLowerCase())
          .join('|');

        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row, index) => ({ ...row, _index: index + 1 }));
  }

  private makeImportedTeacherRow(
    name: string,
    facultyCode: string,
    subject: string,
    section: string
  ): any {
    const cleanedName = this.cleanTeacherName(name);
    const parts = cleanedName.split(/\s+/).filter(Boolean);

    return {
      _index: 0,
      firstName: parts.shift() || '',
      lastName: parts.join(' '),
      email: '',
      phone: '',
      facultyCode: facultyCode || '',
      qualification: '',
      status: 'ACTIVE',
      department: '',
      branch: '',
      semester: '',
      section: section || '',
      subject: subject || '',
      error: ''
    };
  }

  private cleanTeacherName(value: string): string {
    return String(value || '')
      .replace(/^\d+[\s.)-]*/, '')
      .replace(/\((?:[A-Z][A-Z0-9]{1,8})\)\s*$/, '')
      .replace(/^(?:Dr|Mr|Mrs|Ms|Miss|Prof|Professor)\.?\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Converts OCR text into the same normalized row structure used by
   * CSV/XLS/XLSX imports.
   *
   * The parser first looks for a header row and uses its columns. If a clean
   * table header is not available, it falls back to name/email/phone/code
   * detection so ordinary faculty-list images still work.
   */
  private parseTeacherOcrText(text: string): any[] {
    const clean = (value: string): string =>
      String(value || '')
        .replace(/[|¦]+/g, ' ')
        .replace(/[“”"]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizeHeader = (value: string): string =>
      clean(value)
        .toLowerCase()
        .replace(/[_-]/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();

    const lines = String(text || '')
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean);

    if (!lines.length) return [];

    const headerIndex = lines.findIndex(line => {
      const h = normalizeHeader(line);
      const hits = [
        /(^|\s)name(\s|$)/.test(h),
        /first\s*name/.test(h),
        /faculty\s*(code|id|no)/.test(h),
        /email/.test(h),
        /phone|mobile|contact/.test(h),
        /department|branch/.test(h),
        /subject/.test(h)
      ].filter(Boolean).length;

      return hits >= 2;
    });

    const rows: any[] = [];

    // Try structured table parsing when OCR preserved column spacing.
    if (headerIndex >= 0) {
      const header = lines[headerIndex];
      const headerCells = header
        .split(/\t+|\s{3,}/)
        .map(normalizeHeader)
        .filter(Boolean);

      const hasUsefulHeaders =
        headerCells.some(x => /name|first name/.test(x)) &&
        headerCells.length >= 2;

      if (hasUsefulHeaders) {
        for (let i = headerIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (this.isLikelyTeacherHeading(line)) continue;

          const cells = line
            .split(/\t+|\s{3,}/)
            .map(clean)
            .filter(Boolean);

          if (cells.length < 2) continue;

          const row: any = {
            _index: rows.length + 1,
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            facultyCode: '',
            qualification: '',
            status: 'ACTIVE',
            department: '',
            branch: '',
            semester: '',
            section: '',
            subject: ''
          };

          headerCells.forEach((h, index) => {
            const value = cells[index] || '';
            if (!value) return;

            if (/first\s*name/.test(h)) row.firstName = value;
            else if (/last\s*name|surname/.test(h)) row.lastName = value;
            else if (/name|teacher/.test(h) && !row.firstName) {
              const parts = value.split(/\s+/);
              row.firstName = parts.shift() || '';
              row.lastName = parts.join(' ');
            } else if (/email/.test(h)) row.email = value;
            else if (/phone|mobile|contact/.test(h)) row.phone = value;
            else if (/faculty.*(code|id|no)|code/.test(h)) {
              row.facultyCode = value.toUpperCase();
            } else if (/qualification|degree/.test(h)) row.qualification = value;
            else if (/department/.test(h)) row.department = value;
            else if (/branch/.test(h)) row.branch = value;
            else if (/semester|sem/.test(h)) row.semester = value;
            else if (/section/.test(h)) row.section = value;
            else if (/subject/.test(h)) row.subject = value;
            else if (/status/.test(h)) {
              row.status =
                value.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
            }
          });

          this.finishOcrTeacherRow(row);

          if (row.firstName && row.lastName) {
            row.error = '';
            rows.push(row);
          }
        }
      }
    }

    // Generic OCR fallback. This is useful when the PDF/image has a simple
    // faculty list such as: "Ashok Kumar   AK   9876543210".
    if (!rows.length) {
      for (const line of lines) {
        if (this.isLikelyTeacherHeading(line)) continue;

        const emailMatch = line.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        );
        const phoneMatch = line.match(
          /(?:\+91[\s-]?)?[6-9]\d{9}\b/
        );

        const facultyMatch = line.match(
          /\b[A-Z]{2,8}(?:[-_/]?\d{1,4})?\b/
        );

        let remaining = line;

        const email = emailMatch?.[0] || '';
        const phone = phoneMatch?.[0] || '';
        const facultyCode = facultyMatch?.[0] || '';

        if (email) remaining = remaining.replace(email, ' ');
        if (phone) remaining = remaining.replace(phone, ' ');
        if (facultyCode) remaining = remaining.replace(facultyCode, ' ');

        remaining = clean(remaining)
          .replace(/^\d+\s+/, '')
          .replace(/\b(?:mr|mrs|ms|dr|prof|professor)\.?\s+/i, '')
          .trim();

        const nameParts = remaining.split(/\s+/).filter(Boolean);

        if (nameParts.length < 2) continue;

        const row: any = {
          _index: rows.length + 1,
          firstName: nameParts.shift() || '',
          lastName: nameParts.join(' '),
          email,
          phone,
          facultyCode: facultyCode.toUpperCase(),
          qualification: '',
          status: 'ACTIVE',
          department: '',
          branch: '',
          semester: '',
          section: '',
          subject: '',
          error: ''
        };

        this.finishOcrTeacherRow(row);

        if (row.firstName && row.lastName) {
          rows.push(row);
        }
      }
    }

    // Remove obvious duplicates created when a PDF has repeated OCR lines.
    const seen = new Set<string>();
    return rows.filter(row => {
      const key = [
        row.firstName,
        row.lastName,
        row.email,
        row.facultyCode,
        row.phone
      ]
        .map((x: any) => String(x || '').trim().toLowerCase())
        .join('|');

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((row, index) => ({ ...row, _index: index + 1 }));
  }

  private finishOcrTeacherRow(row: any): void {
    const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();

    // If OCR placed the faculty code into the name field, remove it.
    if (!row.facultyCode) {
      const code = fullName.match(/\b[A-Z]{2,8}(?:[-_/]?\d{1,4})?\b$/i);
      if (code && code[0].length <= 12) {
        row.facultyCode = code[0].toUpperCase();
        row.lastName = fullName.slice(0, -code[0].length).trim().split(/\s+/).slice(1).join(' ');
      }
    }

    if (!row.lastName && row.firstName) {
      const parts = String(row.firstName).trim().split(/\s+/);
      if (parts.length > 1) {
        row.firstName = parts.shift() || '';
        row.lastName = parts.join(' ');
      }
    }

    row.firstName = cleanName(row.firstName);
    row.lastName = cleanName(row.lastName);
    row.facultyCode = String(row.facultyCode || '').trim().toUpperCase();
    row.email = String(row.email || '').trim();
    row.phone = String(row.phone || '').trim();

    function cleanName(value: string): string {
      return String(value || '')
        .replace(/^\d+[\s.)-]*/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  private isLikelyTeacherHeading(line: string): boolean {
    const value = String(line || '').trim().toLowerCase();

    if (!value) return true;

    return [
      'teacher list',
      'faculty list',
      'faculty details',
      'teaching staff',
      'staff list',
      'name faculty code',
      'faculty code name',
      'department of',
      'college of',
      'engineering college',
      'page '
    ].some(marker => value.startsWith(marker));
  }

  private cell(row: any, ...names: string[]): string {
    const keys = Object.keys(row || {});
    const normalize = (value: any) => String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // First try an exact normalized header match.
    for (const wanted of names) {
      const wantedKey = normalize(wanted);
      const key = keys.find(k => normalize(k) === wantedKey);
      if (key && row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
    }

    // Then allow common Excel variations such as:
    // "Subject Name", "Teaching Subject", "Course", "Mobile No.", etc.
    const aliases = names.map(normalize);
    const key = keys.find(k => {
      const nk = normalize(k);
      return aliases.some(a => nk === a || nk.includes(a) || a.includes(nk));
    });
    return key && row[key] != null ? String(row[key]).trim() : '';
  }

  private collectSubjectValues(row: any): string[] {
    const values: string[] = [];
    const seen = new Set<string>();
    for (const key of Object.keys(row || {})) {
      const normalized = String(key).toLowerCase().replace(/[_-]+/g, ' ').trim();
      if (!/(subject|course|paper|teaching)/i.test(normalized)) continue;
      const value = String(row[key] ?? '').trim();
      if (!value) continue;

      // A cell may contain multiple subjects separated by "/", ",", "&" or " and ".
      for (const part of value.split(/\s*(?:\/|,|&|\band\b)\s*/i)) {
        const subject = part.trim();
        const keyPart = subject.toLowerCase();
        if (subject && !seen.has(keyPart)) {
          seen.add(keyPart);
          values.push(subject);
        }
      }
    }
    return values;
  }

  private normalizeImportRows(rows: any[]): any[] {
    const normalized: any[] = [];

    (rows || []).forEach((r, index) => {
      const fullName = this.cell(r, 'Teacher Name', 'Name', 'Teacher', 'Faculty Name');
      let firstName = this.cell(r, 'First Name', 'FirstName', 'Given Name');
      let lastName = this.cell(r, 'Last Name', 'LastName', 'Surname', 'Family Name');

      if (!firstName && fullName) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts.shift() || '';
        lastName = parts.join(' ');
      }

      const subjects = this.collectSubjectValues(r);
      const subject = this.cell(
        r,
        'Subject',
        'Subject Name',
        'Subjects',
        'Teaching Subject',
        'Course',
        'Course Name',
        'Paper',
        'Paper Name'
      ) || subjects.join(' / ');

      const row: any = {
        _index: index + 1,
        firstName,
        lastName,
        email: this.cell(r, 'Email', 'Email Address', 'Mail'),
        phone: this.cell(r, 'Phone', 'Mobile', 'Mobile Number', 'Contact', 'Contact Number'),
        facultyCode: this.cell(r, 'Faculty Code', 'FacultyCode', 'Faculty ID', 'Code', 'Teacher Code').toUpperCase(),
        qualification: this.cell(r, 'Qualification', 'Degree'),
        status: (this.cell(r, 'Status', 'Teacher Status') || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        department: this.cell(r, 'Department', 'Dept'),
        branch: this.cell(r, 'Branch', 'Stream', 'Program'),
        semester: this.cell(r, 'Semester', 'Sem', 'Semester Name'),
        section: this.cell(r, 'Section', 'Section Name', 'Batch', 'Group'),
        subject,
        error: ''
      };

      const missing: string[] = [];
      if (!row.firstName) missing.push('First Name');
      if (!row.lastName) missing.push('Last Name');
      if (!row.facultyCode) missing.push('Faculty Code');
      if (!row.department) missing.push('Department');
      if (!row.branch) missing.push('Branch');
      if (!row.semester) missing.push('Semester');
      if (!row.section) missing.push('Section');
      if (!row.subject) missing.push('Subject');

      row.error = missing.length ? `Required: ${missing.join(', ')}` : '';
      if (row.firstName || row.lastName || row.email || row.facultyCode) normalized.push(row);
    });

    return normalized;
  }

  private resolveAssignment(row: any): TeacherAssignment | null {
    if (!row.department && !row.branch && !row.semester && !row.section && !row.subject) return null;
    const norm = (v: any) => String(v ?? '').trim().toLowerCase();
    const d = this.departments.find(x => norm(x.name) === norm(row.department) || norm(x.code) === norm(row.department));
    const b = this.branches.find(x => (!d || x.department?.id === d.id) && (norm(x.name) === norm(row.branch) || norm(x.code) === norm(row.branch)));
    const sem = this.semesters.find(x => (!b || x.branch?.id === b.id) && (norm(x.name) === norm(row.semester) || norm(x.semesterNumber) === norm(row.semester)));
    const sec = this.sections.find(x => (!sem || x.semester?.id === sem.id) && norm(x.name) === norm(row.section));
    if (!d || !b || !sem || !sec || !row.subject) return null;
    return { departmentId: d.id, departmentName: d.name, branchId: b.id, branchName: b.name, branchCode: b.code, semesterId: sem.id, semesterName: sem.name, sectionId: sec.id, sectionName: sec.name, subject: row.subject };
  }

  public buildImportTeachers(): Teacher[] {
    const groups = new Map<string, Teacher>();
    for (const row of this.importRows) {
      if (row.error) continue;
      const key = (row.email || `${row.firstName}|${row.lastName}|${row.facultyCode}`).trim().toLowerCase();
      let teacher = groups.get(key);
      if (!teacher) {
        teacher = { firstName: row.firstName, lastName: row.lastName || '-', email: row.email || '', phone: row.phone || '', subject: '', facultyCode: row.facultyCode || '', qualification: row.qualification || '', status: row.status, assignments: [] };
        groups.set(key, teacher);
      }
      const assignment = this.resolveAssignment(row);
      if (assignment) teacher.assignments = [...(teacher.assignments || []), assignment];
      if (!teacher.phone && row.phone) teacher.phone = row.phone;
      if (!teacher.qualification && row.qualification) teacher.qualification = row.qualification;
    }
    return Array.from(groups.values()).map(t => {
      const unique = (t.assignments || []).filter((a, i, arr) => arr.findIndex(x => x.departmentId === a.departmentId && x.branchId === a.branchId && x.semesterId === a.semesterId && x.sectionId === a.sectionId && x.subject.toLowerCase() === a.subject.toLowerCase()) === i);
      t.assignments = unique;
      t.subject = unique.map(a => a.subject).filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i).join(' / ');
      return t;
    });
  }

  async importTeachers(): Promise<void> {
    if (this.importing) return;

    const invalid = this.importRows.filter(r => r.error);
    if (invalid.length) {
      this.importError = `${invalid.length} row(s) need correction before import.`;
      return;
    }
    if (!this.importRows.length) {
      this.importError = 'No teacher rows to import.';
      return;
    }
    if (!this.academicCacheReady && this.importRows.some(r => r.department || r.branch || r.semester || r.section)) {
      this.importError = 'Academic structure is still loading. Please wait a moment and try again.';
      return;
    }

    const teachers = this.buildImportTeachers();
    if (!teachers.length) {
      this.importError = 'No valid teachers were found in the file.';
      return;
    }

    this.importing = true;
    this.importProgress = 0;
    this.importError = '';

    let done = 0;
    let created = 0;
    let updated = 0;

    const normalize = (v: any) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const identity = (t: Teacher) => {
      const email = normalize(t.email);
      const code = normalize(t.facultyCode);
      const name = normalize(`${t.firstName || ''} ${t.lastName || ''}`);
      return { email, code, name };
    };

    try {
      // Always use the current teacher list so a re-import updates an existing
      // teacher instead of creating the same person a second time.
      const current = this.teachers.map(t => ({ ...t, assignments: this.parseAssignments(t) }));

      for (const imported of teachers) {
        const imp = identity(imported);
        const existing = current.find(t => {
          const cur = identity(t);
          if (imp.email && cur.email && imp.email === cur.email) return true;
          if (imp.code && cur.code && imp.code === cur.code) return true;
          return !!imp.name && !!cur.name && imp.name === cur.name;
        });

        const mergedAssignments = this.mergeTeacherAssignments(
          existing ? this.parseAssignments(existing) : [],
          imported.assignments || []
        );

        const payload: Teacher = {
          ...(existing || imported),
          firstName: existing?.firstName || imported.firstName,
          lastName: existing?.lastName || imported.lastName,
          email: existing?.email || imported.email || '',
          phone: existing?.phone || imported.phone || '',
          qualification: existing?.qualification || imported.qualification || '',
          facultyCode: existing?.facultyCode || imported.facultyCode || this.generateImportedCode(imported, teachers),
          status: imported.status || existing?.status || 'ACTIVE',
          assignments: mergedAssignments,
          subject: mergedAssignments.map(a => a.subject)
            .filter((v, i, arr) => arr.findIndex(x => normalize(x) === normalize(v)) === i)
            .join(' / '),
          teachingAssignments: JSON.stringify(mergedAssignments)
        };

        await new Promise<void>((resolve) => {
          const request = existing?.id
            ? this.teacherService.update(existing.id, payload)
            : this.teacherService.create(payload);

          request.subscribe({
            next: saved => {
              if (existing) {
                updated++;
                const idx = current.findIndex(t => t.id === existing.id);
                if (idx >= 0) current[idx] = { ...saved, assignments: mergedAssignments };
              } else {
                created++;
                current.push({ ...saved, assignments: mergedAssignments });
              }
              done++;
              this.importProgress = Math.round(done / teachers.length * 100);
              resolve();
            },
            error: err => {
              console.error('Teacher import failed', err, payload);
              done++;
              this.importProgress = Math.round(done / teachers.length * 100);
              resolve();
            }
          });
        });
      }

      this.importing = false;
      alert(`Import complete: ${created} new teacher(s), ${updated} existing teacher(s) updated.\\nExisting teachers were not duplicated; new subjects/assignments were merged.`);
      this.closeImport();
      this.loadTeachers();
    } catch (error) {
      console.error('Teacher import error:', error);
      this.importing = false;
      this.importError = 'Teacher import failed. Please check the console/server log.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  private mergeTeacherAssignments(existing: TeacherAssignment[], incoming: TeacherAssignment[]): TeacherAssignment[] {
    const all = [...(existing || []), ...(incoming || [])];
    const seen = new Set<string>();

    return all.filter(a => {
      const key = [
        a.departmentId ?? '',
        a.branchId ?? '',
        a.semesterId ?? '',
        a.sectionId ?? '',
        String(a.subject || '').trim().toLowerCase()
      ].join('|');

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private generateImportedCode(t: Teacher, all: Teacher[]): string {
    const base = (((t.firstName || '')[0] || '') + ((t.lastName || '')[0] || '')).toUpperCase() || 'T';
    const used = new Set(this.teachers.map(x => (x.facultyCode || '').toUpperCase()).filter(Boolean));
    let code = base, n = 2;
    while (used.has(code)) code = `${base}${n++}`;
    used.add(code);
    return code;
  }

  deleteTeacher(teacher: Teacher): void { if (!teacher.id) return; if (!confirm(`Delete "${this.getDisplayName(teacher)}"?`)) return; this.teacherService.delete(teacher.id).subscribe({ next: () => { this.teachers = this.teachers.filter(t => t.id !== teacher.id); if (teacher.id != null) this.selectedTeacherIds.delete(teacher.id); this.cdr.detectChanges(); }, error: error => { console.error(error); alert('Failed to delete teacher.'); } }); }

  getFullName(teacher: Teacher): string { return this.getDisplayName(teacher); }
  assignmentLabel(a: TeacherAssignment): string { return `${a.branchCode || a.branchName || ''} • ${a.semesterName || ''} • ${a.sectionName || ''} • ${a.subject}`; }
}
