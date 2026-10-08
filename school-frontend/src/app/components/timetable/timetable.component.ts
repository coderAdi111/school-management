
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableEntry, TimetableService } from '../../services/timetable.service';
import { TeacherService } from '../../services/teacher.services';
import { Teacher, ClassRoom } from '../../models/models';
import { ClassroomService } from '../../services/classroom.services';
import { AcademicService } from '../../services/academic.service';
import { AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection } from '../../models/models';
import { Observable, forkJoin } from 'rxjs';
import { firstValueFrom, finalize } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  section: string = '';
  selectedDepartment = '';
  selectedBranch = '';
  selectedSemester = 0;
  academicStructures: ClassRoom[] = [];
  availableDepartments: string[] = [];
  availableBranches: string[] = [];
  availableSemesters: number[] = [];
  availableSections: string[] = [];
  selectedSections: string[] = [];
  availableSectionGroups: { name: string; sections: string[] }[] = [];
  selectedTimetableGroup = ''; // empty = only the currently selected section
  private academicDepartments: AcademicDepartment[] = [];
  private academicBranches: AcademicBranch[] = [];
  private academicSemesters: AcademicSemester[] = [];
  private academicSections: AcademicSection[] = [];

  entries: TimetableEntry[] = [];

  // Timetable views
  viewMode: 'weekly' | 'teacher' = 'weekly';
  teachers: Teacher[] = [];
  selectedTeacherName = '';
  selectedTeacherCode = '';
  teacherEntries: TimetableEntry[] = [];
  teacherLoading = false;
  teacherError = '';

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

  // Delete complete timetable for the selected academic structure
  deletingAll = false;

 constructor(
  private service: TimetableService,
  private teacherService: TeacherService,
  private classroomService: ClassroomService,
  private academicService: AcademicService,
  private cdr: ChangeDetectorRef
) {}

  ngOnInit(): void {
    this.loadStructures();
    this.loadTeachers();
  }

  loadStructures(): void {
    // Academic Setup is the source of truth for the dropdowns.
    // Classroom records are only used for existing timetable/student data.
    this.academicService.departments().subscribe({
      next: departments => {
        this.academicDepartments = (departments ?? []).filter(d => d.active !== false);
        this.availableDepartments = this.academicDepartments.map(d => d.name).sort();
        if (!this.selectedDepartment || !this.availableDepartments.includes(this.selectedDepartment)) {
          this.selectedDepartment = this.availableDepartments[0] || '';
        }
        this.loadAcademicBranches();
      },
      error: (err: any) => {
        console.error('Academic departments loading error:', err);
        this.loadFromClassesFallback();
      }
    });
  }

  private loadAcademicBranches(): void {
    const calls = this.academicDepartments.filter(d => d.id).map(d => this.academicService.branches(d.id!));
    if (!calls.length) { this.refreshAcademicSelections(); return; }
    forkJoin(calls).subscribe({
      next: results => {
        this.academicBranches = results.flat().filter(b => b.active !== false);
        this.loadAcademicSemesters();
      },
      error: (err: any) => { console.error('Academic branches loading error:', err); this.loadFromClassesFallback(); }
    });
  }

  private loadAcademicSemesters(): void {
    const calls = this.academicBranches.filter(b => b.id).map(b => this.academicService.semesters(b.id!));
    if (!calls.length) { this.refreshAcademicSelections(); return; }
    forkJoin(calls).subscribe({
      next: results => {
        this.academicSemesters = results.flat().filter(s => s.active !== false);
        this.loadAcademicSections();
      },
      error: (err: any) => { console.error('Academic semesters loading error:', err); this.loadFromClassesFallback(); }
    });
  }

  private loadAcademicSections(): void {
    const calls = this.academicSemesters.filter(s => s.id).map(s => this.academicService.sections(s.id!));
    if (!calls.length) { this.refreshAcademicSelections(); return; }
    forkJoin(calls).subscribe({
      next: results => {
        this.academicSections = results.flat().filter(s => s.active !== false);
        this.refreshAcademicSelections();
      },
      error: (err: any) => { console.error('Academic sections loading error:', err); this.loadFromClassesFallback(); }
    });
  }

  private refreshAcademicSelections(): void {
    const dept = this.academicDepartments.find(d => d.name === this.selectedDepartment);
    const branches = this.academicBranches.filter(b => !dept || b.department?.id === dept.id);
    this.availableBranches = [...new Set(branches.map(b => b.code || b.name).filter(Boolean))].sort();
    if (!this.availableBranches.includes(this.selectedBranch)) this.selectedBranch = this.availableBranches[0] || '';

    const branch = this.academicBranches.find(b => (b.code || b.name) === this.selectedBranch);
    const semesters = this.academicSemesters.filter(s => !branch || s.branch?.id === branch.id);
    this.availableSemesters = [...new Set(semesters.map(s => Number(s.semesterNumber)).filter(n => n > 0))].sort((a,b) => a-b);
    if (!this.availableSemesters.includes(this.selectedSemester)) this.selectedSemester = this.availableSemesters[0] || 0;

    const semester = this.academicSemesters.find(s => s.branch?.id === branch?.id && Number(s.semesterNumber) === Number(this.selectedSemester));
    const sections = this.academicSections.filter(s => !semester || s.semester?.id === semester.id);
    this.availableSections = [...new Set(sections.map(s => s.name).filter(Boolean))].sort();
    if (!this.availableSections.includes(this.section)) this.section = this.availableSections[0] || '';
    this.selectedSections = this.section ? [this.section] : [];
    this.buildSectionGroups();
    this.selectedTimetableGroup = '';

    this.form = this.blank();
    if (this.section) this.load();
  }

  private buildSectionGroups(): void {
    const map = new Map<string, string[]>();
    for (const section of this.availableSections) {
      const match = section.match(/^(.*?)(\d+)$/);
      const group = match ? match[1] : section;
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(section);
    }
    this.availableSectionGroups = Array.from(map.entries())
      .filter(([, sections]) => sections.length > 1)
      .map(([name, sections]) => ({ name, sections: sections.sort() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  sectionGroupLabel(): string {
    if (!this.selectedTimetableGroup) return `Only Section ${this.section}`;
    const group = this.availableSectionGroups.find(g => g.name === this.selectedTimetableGroup);
    return group ? `${group.name} (${group.sections.join(', ')})` : this.selectedTimetableGroup;
  }

  private loadFromClassesFallback(): void {
    this.classroomService.getAll().subscribe({
      next: rows => {
        this.academicStructures = Array.isArray(rows) ? rows : [];
        this.availableDepartments = [...new Set(this.academicStructures.map(r => r.department).filter(Boolean) as string[])].sort();
        if (!this.selectedDepartment) this.selectedDepartment = this.availableDepartments[0] || '';
        this.refreshBranches();
      },
      error: err => console.error('Classroom fallback loading error:', err)
    });
  }

  private refreshBranches(): void {
    const rows = this.academicStructures.filter(r => !this.selectedDepartment || r.department === this.selectedDepartment);
    this.availableBranches = [...new Set(rows.map(r => r.branch).filter(Boolean) as string[])].sort();
    if (!this.availableBranches.includes(this.selectedBranch)) this.selectedBranch = this.availableBranches[0] || '';
    this.refreshSemesters();
  }

  private refreshSemesters(): void {
    const rows = this.academicStructures.filter(r => (!this.selectedDepartment || r.department === this.selectedDepartment) && (!this.selectedBranch || r.branch === this.selectedBranch));
    this.availableSemesters = [...new Set(rows.map(r => Number(r.semester)).filter(n => n > 0))].sort((a,b) => a-b);
    if (!this.availableSemesters.includes(this.selectedSemester)) this.selectedSemester = this.availableSemesters[0] || 0;
    this.refreshSections();
  }

  private refreshSections(): void {
    const rows = this.academicStructures.filter(r => (!this.selectedDepartment || r.department === this.selectedDepartment) && (!this.selectedBranch || r.branch === this.selectedBranch) && (!this.selectedSemester || Number(r.semester) === Number(this.selectedSemester)));
    this.availableSections = [...new Set(rows.map(r => r.section).filter(Boolean) as string[])].sort();
    if (!this.availableSections.includes(this.section)) this.section = this.availableSections[0] || '';
    this.selectedSections = this.section ? [this.section] : [];
    this.buildSectionGroups();
    this.selectedTimetableGroup = '';
    this.form = this.blank();
    if (this.section) this.load();
  }

  onDepartmentChange(): void { this.loadAcademicSemestersForCurrentBranch(); }
  onBranchChange(): void { this.loadAcademicSemestersForCurrentBranch(); }
  onSemesterChange(): void { this.refreshAcademicSelections(); }
  onSectionChange(): void { this.form = this.blank(); this.selectedTimetableGroup = ''; this.selectedSections = this.section ? [this.section] : []; this.buildSectionGroups(); this.load(); }

  toggleSection(section: string): void {
    const set = new Set(this.selectedSections);
    if (set.has(section)) set.delete(section); else set.add(section);
    this.selectedSections = this.availableSections.filter(s => set.has(s));
    if (!this.selectedSections.length && this.section) this.selectedSections = [this.section];
  }

  isSectionSelected(section: string): boolean { return this.selectedSections.includes(section); }

  generateSelectedTimetable(): void {
    if (!this.selectedSections.length && this.section) this.selectedSections = [this.section];
    this.load();
  }

  selectedSectionsLabel(): string {
    return this.selectedSections.length ? this.selectedSections.join(' + ') : 'No section selected';
  }

  private loadAcademicSemestersForCurrentBranch(): void {
    const dept = this.academicDepartments.find(d => d.name === this.selectedDepartment);
    const branches = this.academicBranches.filter(b => !dept || b.department?.id === dept.id);
    this.availableBranches = [...new Set(branches.map(b => b.code || b.name).filter(Boolean))].sort();
    if (!this.availableBranches.includes(this.selectedBranch)) this.selectedBranch = this.availableBranches[0] || '';
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.selectedBranch);
    this.availableSemesters = [...new Set(this.academicSemesters.filter(s => !branch || s.branch?.id === branch.id).map(s => Number(s.semesterNumber)).filter(n => n > 0))].sort((a,b) => a-b);
    if (!this.availableSemesters.includes(this.selectedSemester)) this.selectedSemester = this.availableSemesters[0] || 0;
    const semester = this.academicSemesters.find(s => s.branch?.id === branch?.id && Number(s.semesterNumber) === Number(this.selectedSemester));
    this.availableSections = [...new Set(this.academicSections.filter(s => !semester || s.semester?.id === semester.id).map(s => s.name).filter(Boolean))].sort();
    if (!this.availableSections.includes(this.section)) this.section = this.availableSections[0] || '';
    this.selectedSections = this.section ? [this.section] : [];
    this.buildSectionGroups();
    this.selectedTimetableGroup = '';
    this.form = this.blank();
    if (this.section) this.load();
  }

  blank(): TimetableEntry {
    return {
      department: this.selectedDepartment,
      branch: this.selectedBranch,
      semester: this.selectedSemester,
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

  const sections = this.selectedSections.length ? this.selectedSections : (this.section ? [this.section] : []);
  if (!sections.length) { this.entries = []; this.loading = false; return; }

  forkJoin(sections.map(sec => this.service.get(sec, this.selectedDepartment, this.selectedBranch, this.selectedSemester))).subscribe({

    next: (datasets) => {

      const raw = datasets.flatMap(data => Array.isArray(data) ? data : []);
      this.entries = this.mergeSelectedSectionEntries(raw, sections);

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

  /** Merge identical classes only for the currently selected sections. Database rows remain untouched. */
  private mergeSelectedSectionEntries(rows: TimetableEntry[], selected: string[]): TimetableEntry[] {
    if (selected.length <= 1) return rows;
    const selectedSet = new Set(selected.map(s => s.toLowerCase()));
    const groups = new Map<string, TimetableEntry[]>();
    for (const row of rows) {
      if (!selectedSet.has((row.section || '').toLowerCase())) continue;
      const key = [row.dayOfWeek, row.startTime, row.endTime, (row.subject || '').trim().toLowerCase(), (row.faculty || '').trim().toLowerCase(), (row.room || '').trim().toLowerCase(), !!row.practical].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    const result: TimetableEntry[] = [];
    for (const rowsForClass of groups.values()) {
      const first = rowsForClass[0];
      const sections = [...new Set(rowsForClass.map(r => r.section).filter(Boolean))].sort();
      result.push({ ...first, section: sections.length > 1 ? sections.join(' + ') : (sections[0] || first.section) });
    }
    // Keep deterministic official timetable ordering.
    return result.sort((a,b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime) || a.section.localeCompare(b.section));
  }

  // LOAD TEACHERS FOR THE TEACHER SCHEDULE VIEW
  loadTeachers(): void {
    this.teacherService.getAll().subscribe({
      next: teachers => {
        this.teachers = (Array.isArray(teachers) ? teachers : [])
          .filter(t => (t.status ?? 'ACTIVE') !== 'INACTIVE')
          .sort((a, b) => this.teacherName(a).localeCompare(this.teacherName(b)));
      },
      error: (err: any) => {
        console.error('Teacher list loading error:', err);
        this.teachers = [];
      }
    });
  }

  teacherName(teacher: Teacher): string {
    return `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim();
  }

  setView(mode: 'weekly' | 'teacher'): void {
    this.viewMode = mode;
    this.teacherError = '';

    if (mode === 'teacher' && !this.teachers.length) {
      this.loadTeachers();
    }
  }

  // DOWNLOAD ALL SELECTED SECTIONS AS ONE BEAUTIFUL PDF TABLE
  async downloadWeeklyTimetablePdf(): Promise<void> {
    if (this.loading) {
      alert('Timetable load ho rahi hai. Thoda wait karein.');
      return;
    }

    try {
      const sections = this.selectedSections.length ? this.selectedSections : (this.section ? [this.section] : []);
      const datasets = await Promise.all(sections.map(section =>
        firstValueFrom(this.service.get(section, this.selectedDepartment, this.selectedBranch, this.selectedSemester))
      ));
      const rawAll = datasets.flatMap(data => Array.isArray(data) ? data : []).filter(e => e?.dayOfWeek);
      const all = this.mergeSelectedSectionEntries(rawAll, sections);

      if (!all.length) {
        alert('Selected academic structure ka timetable empty hai.');
        return;
      }

      // Official college sheet uses fixed 1-hour columns from 9 AM to 4 PM.
      const slots = [
        { start: 9 * 60, end: 10 * 60, label: '9:00 AM\n10:00 AM' },
        { start: 10 * 60, end: 11 * 60, label: '10:00 AM\n11:00 AM' },
        { start: 11 * 60, end: 12 * 60, label: '11:00 AM\n12:00 PM' },
        { start: 12 * 60, end: 13 * 60, label: '12:00 PM\n1:00 PM' },
        { start: 13 * 60, end: 14 * 60, label: '1:00 PM\n2:00 PM' },
        { start: 14 * 60, end: 15 * 60, label: '2:00 PM\n3:00 PM' },
        { start: 15 * 60, end: 16 * 60, label: '3:00 PM\n4:00 PM' }
      ];

      const body: any[][] = this.days.map(day => {
        const dayEntries = all
          .filter(e => e.dayOfWeek === day)
          .sort((a, b) => {
            const diff = this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
            return diff || a.section.localeCompare(b.section);
          });

        const row: any[] = [
          {
            content: day.substring(0, 3).toUpperCase(),
            styles: { fontStyle: 'bold', halign: 'center', valign: 'middle' }
          }
        ];

        const occupied = new Set<number>();

        for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
          if (occupied.has(slotIndex)) continue;

          const slot = slots[slotIndex];

          // IMPORTANT: only entries STARTING in this column are rendered.
          // This prevents a 2-hour lab from being duplicated in the next hour.
          const starting = dayEntries.filter(entry =>
            this.timeToMinutes(entry.startTime) === slot.start
          );

          if (!starting.length) {
            row.push('');
            continue;
          }

          const maxEnd = Math.max(
            ...starting.map(entry => this.timeToMinutes(entry.endTime))
          );

          let span = Math.ceil((maxEnd - slot.start) / 60);
          span = Math.max(1, Math.min(span, slots.length - slotIndex));

          const content = starting
            .sort((a, b) => a.section.localeCompare(b.section))
            .map(entry => {
              const section = entry.section || '—';
              const subject = entry.subject || '—';
              const faculty = entry.faculty ? ` (${entry.faculty})` : '';
              const room = entry.room ? `\n${entry.room}` : '';
              const type = entry.practical ? '\nLAB' : '';
              return `${section} - ${subject}${faculty}${room}${type}`;
            })
            .join('\n');

          row.push({
            content,
            colSpan: span,
            styles: {
              halign: 'center',
              valign: 'middle',
              fontStyle: 'bold'
            }
          });

          for (let i = slotIndex; i < slotIndex + span; i++) {
            occupied.add(i);
          }
        }

        return row;
      });

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ================= OFFICIAL COLLEGE HEADER =================
      doc.setFillColor(30, 64, 110);
      doc.roundedRect(8, 5, pageWidth - 16, 23, 2.5, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');

      doc.setFontSize(14);
      doc.text('ENGINEERING COLLEGE AJMER', pageWidth / 2, 11, {
        align: 'center'
      });

      doc.setFontSize(10);
      doc.text(
        `DEPARTMENT OF ${String(this.selectedDepartment || 'ACADEMIC').toUpperCase()}`,
        pageWidth / 2,
        16,
        { align: 'center' }
      );

      doc.setFontSize(10);
      doc.text(
        `Revised Time Table ${this.selectedSemester || ''}th Sem ${this.selectedBranch || ''}`,
        10,
        24
      );

      doc.text('SESSION: 2026-27', pageWidth - 10, 24, {
        align: 'right'
      });

      // ================= OFFICIAL TABLE =================
      autoTable(doc, {
        startY: 30,
        head: [[
          'DAY/\nTIME',
          ...slots.map(slot => slot.label)
        ]],
        body,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: 2.1,
          valign: 'middle',
          halign: 'center',
          lineWidth: 0.35,
          lineColor: [145, 155, 175],
          textColor: [25, 35, 55],
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [30, 64, 110],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.2,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.35,
          lineColor: [30, 64, 110],
          cellPadding: 2.5
        },
        bodyStyles: {
          minCellHeight: 15
        },
        columnStyles: {
          0: {
            cellWidth: 18,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
          }
        },
        margin: {
          left: 8,
          right: 8,
          bottom: 25
        },
        didParseCell: data => {
          if (data.section !== 'body') return;

          if (data.column.index === 0) {
            data.cell.styles.fillColor = [231, 238, 250];
            data.cell.styles.textColor = [22, 52, 92];
            data.cell.styles.fontStyle = 'bold';
            return;
          }

          const raw = String(
            (data.cell.raw as any)?.content ??
            data.cell.text?.join(' ') ??
            ''
          );

          if (!raw.trim()) {
            data.cell.styles.fillColor = [255, 255, 255];
          } else if (/LAB/i.test(raw)) {
            data.cell.styles.fillColor = [255, 244, 218];
            data.cell.styles.textColor = [115, 76, 12];
          } else if (/I1/i.test(raw) && /I2/i.test(raw)) {
            data.cell.styles.fillColor = [235, 245, 255];
            data.cell.styles.textColor = [25, 55, 100];
          } else if (/I1/i.test(raw)) {
            data.cell.styles.fillColor = [240, 248, 255];
            data.cell.styles.textColor = [25, 65, 115];
          } else if (/I2/i.test(raw)) {
            data.cell.styles.fillColor = [239, 250, 245];
            data.cell.styles.textColor = [25, 88, 62];
          } else {
            data.cell.styles.fillColor = [248, 250, 253];
          }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY ?? 125;

      // Compact footer like the official sheet.
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(70, 70, 70);
      doc.text(
        `${this.availableSections.join(' + ') || this.section || 'Selected sections'} combined. Theory classes follow the official timetable layout; LAB / practical classes retain their actual duration.`,
        10,
        Math.min(finalY + 7, pageHeight - 8)
      );

      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${page} of ${pages}`,
          pageWidth - 10,
          pageHeight - 5,
          { align: 'right' }
        );
      }

      doc.save(`ECA_${this.selectedBranch || 'Academic'}_Sem${this.selectedSemester || ''}_Official_Timetable.pdf`);

    } catch (err) {
      console.error('Weekly timetable PDF download error:', err);
      alert('PDF download nahi ho paaya. Backend check karein.');
    }
  }

  // DOWNLOAD SELECTED TEACHER'S I1 + I2 SCHEDULE
  // Faculty PDF uses a separate official-sheet-inspired template.
  async downloadTeacherTimetablePdf(): Promise<void> {
    if (!this.selectedTeacherName) {
      alert('Pehle teacher select karein.');
      return;
    }

    if (this.teacherLoading) {
      alert('Teacher timetable load ho rahi hai. Thoda wait karein.');
      return;
    }

    try {
      await this.loadTeacherSchedule();

      if (!this.teacherEntries.length) {
        alert(`"${this.selectedTeacherName}" ke liye poore timetable me koi class nahi mili.`);
        return;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ENGINEERING COLLEGE AJMER', pageWidth / 2, 10, { align: 'center' });

      doc.setFontSize(10);
      doc.text(
        'COMPLETE ACADEMIC FACULTY SCHEDULE',
        pageWidth / 2,
        16,
        { align: 'center' }
      );

      doc.setFontSize(10);
      doc.text(
        'Faculty Weekly Time Table — All Branches / Semesters / Sections',
        10,
        24
      );

      doc.text(
        `Teacher: ${this.selectedTeacherName}`,
        pageWidth - 10,
        24,
        { align: 'right' }
      );

      const rows = this.teacherEntries
        .slice()
        .sort((a, b) => {
          const dayDiff =
            this.days.indexOf(a.dayOfWeek) - this.days.indexOf(b.dayOfWeek);
          const timeDiff =
            this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
          return dayDiff || timeDiff || a.section.localeCompare(b.section);
        })
        .map(entry => [
          entry.dayOfWeek.substring(0, 3).toUpperCase(),
          `${this.formatPdfTime(this.timeToMinutes(entry.startTime))}\n${this.formatPdfTime(this.timeToMinutes(entry.endTime))}`,
          entry.section || '—',
          entry.subject || '—',
          entry.practical ? 'LAB / PRACTICAL' : 'THEORY'
        ]);

      autoTable(doc, {
        startY: 31,
        head: [['DAY', 'TIME', 'SECTION', 'SUBJECT', 'TYPE']],
        body: rows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.2,
          valign: 'middle',
          halign: 'center',
          lineWidth: 0.35,
          lineColor: [60, 60, 60],
          textColor: [20, 20, 20]
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [20, 20, 20],
          fontStyle: 'bold',
          lineWidth: 0.35,
          lineColor: [50, 50, 50]
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 32 },
          2: { cellWidth: 24, fontStyle: 'bold' },
          3: { cellWidth: 95 },
          4: { cellWidth: 48 }
        },
        margin: { left: 8, right: 8, bottom: 20 }
      });

      const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
      const structureCounts = Array.from(new Set(this.teacherEntries.map(e => `${e.department || '—'} / ${e.branch || '—'} / Sem ${e.semester ?? '—'}`))).join('    |    ');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(70, 70, 70);
      doc.text(
        `Total Classes: ${rows.length}${structureCounts ? '    |    ' + structureCounts : ''}`,
        10,
        Math.min(finalY + 8, pageHeight - 8)
      );

      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${page} of ${pages}`,
          pageWidth - 10,
          pageHeight - 5,
          { align: 'right' }
        );
      }

      const safeName = this.selectedTeacherName
        .trim()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '') || 'Teacher';

      doc.save(`ECA_Complete_Weekly_Faculty_${safeName}.pdf`);
    } catch (err) {
      console.error('Teacher timetable PDF download error:', err);
      alert('Teacher timetable PDF download nahi ho paaya. Backend/API check karein.');
    }
  }

  private formatPdfTime(minutes: number): string {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
  }

  /** Refresh the currently visible timetable view.
   *  Weekly view reloads the selected timetable from the API.
   *  Teacher view reloads the complete teacher schedule and teacher list.
   */
  async refreshCurrentView(): Promise<void> {
    this.error = '';
    this.teacherError = '';

    try {
      if (this.viewMode === 'teacher') {
        this.teacherLoading = true;
        await new Promise<void>((resolve, reject) => {
          this.teacherService.getAll().subscribe({
            next: teachers => {
              this.teachers = (Array.isArray(teachers) ? teachers : [])
                .filter(t => (t.status ?? 'ACTIVE') !== 'INACTIVE')
                .sort((a, b) => this.teacherName(a).localeCompare(this.teacherName(b)));
              resolve();
            },
            error: reject
          });
        });

        // Keep the selected teacher after refreshing the teacher master list.
        if (this.selectedTeacherName) {
          const selected = this.teachers.find(t => this.teacherName(t) === this.selectedTeacherName);
          this.selectedTeacherCode = (selected?.facultyCode ?? '').trim().toUpperCase();
          await this.loadTeacherSchedule();
        } else {
          this.teacherEntries = [];
        }
        return;
      }

      // Weekly view: always reload from the backend instead of reusing the
      // current in-memory entries. This makes the button a real refresh.
      await this.load();
    } catch (err: any) {
      console.error('Timetable refresh error:', err);
      this.error = 'Refresh nahi ho paaya. Backend/API check karein.';
      this.teacherError = this.viewMode === 'teacher'
        ? 'Teacher schedule refresh nahi ho paaya.'
        : this.teacherError;
    } finally {
      this.teacherLoading = false;
      this.cdr.detectChanges();
    }
  }

  onTeacherChange(): void {
    const selected = this.teachers.find(t => this.teacherName(t) === this.selectedTeacherName);
    this.selectedTeacherCode = (selected?.facultyCode ?? '').trim().toUpperCase();

    if (!this.selectedTeacherName) {
      this.selectedTeacherCode = '';
      this.teacherEntries = [];
      return;
    }

    this.loadTeacherSchedule();
  }

  async loadTeacherSchedule(): Promise<void> {
    if (!this.selectedTeacherName) return;

    this.teacherLoading = true;
    this.teacherError = '';

    try {
      // IMPORTANT: Teacher Schedule is global. A teacher may teach in
      // multiple departments, branches, semesters and sections, so do not
      // restrict this view to the currently selected academic structure.
      // Always fetch a fresh copy. The teacher view must never rely on the
      // previous in-memory timetable after a delete/update.
      const all = await firstValueFrom(this.service.getAll());

      const selected = this.teachers.find(t => this.teacherName(t) === this.selectedTeacherName);
      const wantedName = this.normalizeTeacherName(this.selectedTeacherName);
      const wantedCode = (selected?.facultyCode ?? this.selectedTeacherCode ?? '').trim().toLowerCase();

      // If the currently selected section/group was just deleted, hide those
      // rows from Teacher Schedule as well. This keeps both views consistent
      // even if an old browser/API cache still returns the deleted rows once.
      const selectedGroup = this.availableSectionGroups.find(g => g.name === this.selectedTimetableGroup);
      const hiddenSections = this.entries.length === 0 && this.section
        ? new Set((selectedGroup?.sections?.length ? selectedGroup.sections : [this.section]).map(s => s.trim().toLowerCase()))
        : new Set<string>();

      this.teacherEntries = all
        .filter(entry => this.teacherMatches(entry.faculty, wantedName, wantedCode))
        .filter(entry => {
          if (!hiddenSections.size) return true;
          const sameAcademicScope =
            String(entry.department || '').trim().toLowerCase() === String(this.selectedDepartment || '').trim().toLowerCase() &&
            String(entry.branch || '').trim().toLowerCase() === String(this.selectedBranch || '').trim().toLowerCase() &&
            Number(entry.semester) === Number(this.selectedSemester);
          return !(sameAcademicScope && hiddenSections.has(String(entry.section || '').trim().toLowerCase()));
        })
        .sort((a, b) => {
          const dayDiff = this.days.indexOf(a.dayOfWeek) - this.days.indexOf(b.dayOfWeek);
          return dayDiff || a.startTime.localeCompare(b.startTime);
        });
    } catch (err: any) {
      console.error('Teacher timetable loading error:', err);
      this.teacherEntries = [];
      this.teacherError = err?.name === 'TimeoutError'
        ? 'Server se response nahi aaya. Please Refresh karein.'
        : 'Teacher schedule load nahi ho paaya. Backend/API check karein.';
    } finally {
      this.teacherLoading = false;
      this.cdr.detectChanges();
    }
  }

  private normalizeTeacherName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private teacherMatches(faculty: string | undefined, wantedName: string, wantedCode: string): boolean {
    if (!faculty) return false;

    const raw = faculty.trim();
    if (!raw) return false;

    const actualName = this.normalizeTeacherName(raw);
    const actualCompact = actualName.replace(/[^a-z0-9]/g, '');
    const wantedCompact = wantedCode.replace(/[^a-z0-9]/g, '');

    // 1) Exact faculty-code match.
    if (wantedCompact && actualCompact === wantedCompact) return true;

    // 2) Some old timetable rows store "A.B.", "A B", or "AB".
    //    Match the selected teacher's initials as well.
    if (wantedName) {
      const wantedParts = wantedName.split(' ').filter(Boolean);
      const initials = wantedParts.map(part => part.charAt(0)).join('');
      if (initials && actualCompact === initials) return true;
    }

    // 3) Timetable may contain the complete teacher name.
    if (wantedName && actualName === wantedName) return true;

    // 4) Backward-compatible partial full-name match.
    if (wantedName) {
      const wantedParts = wantedName.split(' ').filter(Boolean);
      const actualParts = actualName.split(' ').filter(Boolean);
      if (wantedParts.length > 1 && wantedParts.every(part => actualParts.includes(part))) {
        return true;
      }
    }

    // 5) Rows such as "AB - Ashok Kumar" / "Ashok Kumar (AB)".
    if (wantedCompact && actualCompact.includes(wantedCompact)) return true;
    if (wantedName && actualName.includes(wantedName)) return true;

    return false;
  }

  duration(entry: TimetableEntry): string {
    const start = this.timeToMinutes(entry.startTime);
    const end = this.timeToMinutes(entry.endTime);
    if (start < 0 || end <= start) return '—';

    const minutes = end - start;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  }

  // CHANGE SECTION
  changeSection(): void {
    this.cancelEdit();
    this.load();
  }

  // Keep Teacher master data in sync with every Weekly Timetable save.
  // Existing teachers are matched by faculty code/name. A new faculty code
  // asks for the full name once, then the teacher is created automatically.
  private async syncTeacherForTimetable(base: TimetableEntry, targets: string[]): Promise<TimetableEntry> {
    const rawFaculty = (base.faculty ?? '').trim();
    if (!rawFaculty) return base;

    const normalized = rawFaculty.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    let teacher = this.teachers.find(t => {
      const code = (t.facultyCode ?? '').trim().toLowerCase();
      const name = this.teacherName(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return !!code && code === normalized.replace(/[^a-z0-9]/g, '') || name === normalized;
    });

    let fullName = teacher ? this.teacherName(teacher) : '';
    let facultyCode = teacher?.facultyCode?.trim().toUpperCase() || rawFaculty.toUpperCase();

    // If the user entered a full name directly, use it as the new teacher name.
    if (!teacher && rawFaculty.includes(' ') && rawFaculty.split(/\s+/).length >= 2) {
      fullName = rawFaculty.replace(/\s+/g, ' ').trim();
      facultyCode = fullName.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 6).toUpperCase();
    }

    // A CSV timetable may contain only a faculty code (for example AB).
    // Do not stop the import or ask the user for a name for every new code.
    // The backend creates "AB Teacher" automatically; the admin can later edit
    // the teacher and replace the placeholder with the real full name.
    if (!teacher && !fullName) {
      fullName = '';
      facultyCode = rawFaculty.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    const dept = this.academicDepartments.find(d => d.name === base.department);
    const branch = this.academicBranches.find(b => (b.code || b.name) === base.branch && (!dept || b.department?.id === dept.id));
    const semester = this.academicSemesters.find(s => Number(s.semesterNumber) === Number(base.semester) && (!branch || s.branch?.id === branch.id));

    const requests = targets.map(sectionName => {
      const sec = this.academicSections.find(x => x.name === sectionName && (!semester || x.semester?.id === semester.id));
      return firstValueFrom(this.teacherService.syncFromTimetable({
        faculty: facultyCode,
        fullName,
        department: base.department,
        departmentId: dept?.id,
        branch: branch?.name || base.branch,
        branchId: branch?.id,
        semester: base.semester,
        semesterId: semester?.id,
        section: sectionName,
        sectionId: sec?.id,
        subject: base.subject.trim()
      }));
    });

    const synced = await Promise.all(requests);
    if (synced.length) {
      const latest = synced[synced.length - 1];
      const existingIndex = this.teachers.findIndex(t => t.id === latest.id);
      if (existingIndex >= 0) this.teachers[existingIndex] = latest;
      else this.teachers = [...this.teachers, latest].sort((a, b) => this.teacherName(a).localeCompare(this.teacherName(b)));
      this.cdr.detectChanges();
    }

    return { ...base, faculty: facultyCode };
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

    const payloadBase: TimetableEntry = {
      ...this.form,
      department: this.selectedDepartment,
      branch: this.selectedBranch,
      semester: this.selectedSemester,
      section: this.section,
      sectionGroup: this.selectedTimetableGroup || '',
      subject: this.form.subject.trim()
    };

    const group = this.availableSectionGroups.find(g => g.name === this.selectedTimetableGroup);
    const targets = group ? group.sections : [this.section];

    this.syncTeacherForTimetable(payloadBase, targets)
      .then(canonicalPayload => {
        const request: Observable<unknown> = this.editingId
          ? (this.form.sectionGroup ? this.service.updateGroup(this.editingId, canonicalPayload) : this.service.update(this.editingId, canonicalPayload))
          : this.saveForTargetSections(canonicalPayload);

        request.subscribe({
          next: () => {
            this.saving = false;
            this.cancelEdit();
            this.load();
          },
          error: (err: any) => {
            console.error('Timetable save error:', err);
            this.saving = false;
            this.error = err?.name === 'TimeoutError'
              ? 'Server se 20 seconds mein response nahi aaya. Internet aur backend API check karein.'
              : 'Save nahi hua. Browser console aur backend logs check karein.';
          }
        });
      })
      .catch((err: any) => {
        console.error('Teacher auto-sync error:', err);
        this.saving = false;
        this.error = err?.message || 'Teacher sync nahi ho paaya.';
      });
  }

  private saveForTargetSections(base: TimetableEntry) {
    const group = this.availableSectionGroups.find(g => g.name === this.selectedTimetableGroup);
    const targets = group ? group.sections : [this.section];
    const requests = targets.map(section => this.service.create({ ...base, section, sectionGroup: group?.name || '' }));
    return forkJoin(requests);
  }

  // EDIT ENTRY
  edit(entry: TimetableEntry): void {
    this.editingId = entry.id ?? null;
    this.form = { ...entry };
    this.selectedTimetableGroup = entry.sectionGroup || '';
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
      !confirm(entry.sectionGroup ? `This timetable is shared by the ${entry.sectionGroup} group (for example CA1 + CA2). Delete it from all sections in this group?` : `Delete ${entry.subject} from ${entry.section} timetable?`)
    ) {
      return;
    }

    const request = entry.sectionGroup ? this.service.deleteGroup(entry.id) : this.service.delete(entry.id);
    request.subscribe({
      next: () => {
        this.load();
      },

      error: (err: any) => {
        console.error('Timetable delete error:', err);
        this.error = 'Entry delete nahi hui.';
      }

    });
  }

  // DELETE ALL ENTRIES FOR THE CURRENT SECTION OR SELECTED GROUP
  async deleteAllTimetable(): Promise<void> {
    if (this.deletingAll) {
      return;
    }

    // Important: this action is intentionally scoped.
    // - No group selected -> delete only the currently selected section.
    // - Group selected (e.g. CA) -> delete the timetable for every section in that group (CA1 + CA2).
    const group = this.availableSectionGroups.find(g => g.name === this.selectedTimetableGroup);
    const sections = group?.sections?.length
      ? group.sections
      : (this.section ? [this.section] : []);

    if (!sections.length) {
      this.error = 'Pehle ek section select karein.';
      return;
    }

    const targetLabel = group
      ? `${group.name} group (${group.sections.join(', ')})`
      : `Section ${this.section}`;

    const confirmed = confirm(
      `Delete the complete timetable for ${targetLabel}?\n\n` +
      `${this.selectedDepartment || 'Department'} → ${this.selectedBranch || 'Branch'} → Semester ${this.selectedSemester || '-'}\n\n` +
      `Only ${targetLabel} will be deleted. Other sections will NOT be affected.`
    );

    if (!confirmed) {
      return;
    }

    this.deletingAll = true;
    this.error = '';

    try {
      // One API call + one database batch delete.
      // This is much faster than fetching every section and deleting every row
      // one-by-one, while remaining strictly scoped to this department/branch/semester
      // and the selected section/group.
      const deletedCount = await firstValueFrom(
        this.service.deleteScoped(
          this.selectedDepartment,
          this.selectedBranch,
          this.selectedSemester,
          sections
        )
      );

      // Verify against the real database immediately. If an older backend
      // implementation/cache did not remove every row, delete the remaining
      // matching IDs individually. This prevents deleted classes from
      // reappearing in Teacher Schedule.
      const freshAll = await firstValueFrom(this.service.getAll());
      const sectionSet = new Set(sections.map(s => s.trim().toLowerCase()));
      const remaining = freshAll.filter(entry =>
        String(entry.department || '').trim().toLowerCase() === String(this.selectedDepartment || '').trim().toLowerCase() &&
        String(entry.branch || '').trim().toLowerCase() === String(this.selectedBranch || '').trim().toLowerCase() &&
        Number(entry.semester) === Number(this.selectedSemester) &&
        sectionSet.has(String(entry.section || '').trim().toLowerCase())
      );

      if (remaining.length) {
        await firstValueFrom(forkJoin(
          remaining.filter(e => e.id != null).map(e => this.service.delete(e.id!))
        ));
      }

      const totalDeleted = deletedCount + remaining.length;
      if (!totalDeleted) {
        this.importMessage = `No timetable found for ${targetLabel}.`;
        return;
      }

      this.entries = [];
      this.editingId = null;
      this.form = this.blank();
      this.importMessage = `Deleted ${totalDeleted} timetable entries from ${targetLabel}. Other sections were kept safe.`;
      this.cdr.detectChanges();

      await this.load();
      // Teacher Schedule is a separate global view. Always refresh it from
      // the database after a scoped delete so deleted CA1/CA2 rows cannot
      // remain in the in-memory teacherEntries array.
      if (this.selectedTeacherName) {
        await this.loadTeacherSchedule();
      }
    } catch (err) {
      console.error('Scoped timetable delete error:', err);
      this.error = `Timetable delete nahi hui. ${targetLabel} ke liye dobara try karein.`;
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
            department: this.selectedDepartment,
            branch: this.selectedBranch,
            semester: this.selectedSemester,
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
    this.importProgress = 0;
    this.importStage = 'Preparing import';
    this.importMessage = 'Preparing teachers and timetable classes...';
    this.cdr.detectChanges();

    let saved = 0;

    try {
      // ============================================================
      // 1. GROUP TEACHER ASSIGNMENTS BY FACULTY CODE
      // ============================================================
      // Different teachers can be synced in parallel. Entries of the
      // same teacher stay sequential because TeacherService updates the
      // teacher's teachingAssignments JSON and parallel writes could
      // otherwise overwrite each other.
      const teacherGroups = new Map<string, TimetableEntry[]>();

      for (const entry of this.importPreview) {
        const faculty = (entry.faculty ?? '').trim();
        if (!faculty) continue;

        const key = faculty.toUpperCase();
        if (!teacherGroups.has(key)) {
          teacherGroups.set(key, []);
        }

        const group = teacherGroups.get(key)!;

        const duplicate = group.some(existing =>
          existing.section.trim().toUpperCase() === entry.section.trim().toUpperCase() &&
          existing.subject.trim().toLowerCase() === entry.subject.trim().toLowerCase()
        );

        if (!duplicate) {
          group.push(entry);
        }
      }

      const teacherJobs = Array.from(teacherGroups.values());

      // ============================================================
      // 2. SYNC DIFFERENT TEACHERS IN PARALLEL
      // ============================================================
      if (teacherJobs.length) {
        let completedTeachers = 0;

        await Promise.all(
          teacherJobs.map(async entries => {
            // Same teacher -> sequential, different teachers -> parallel.
            for (const entry of entries) {
              await this.syncTeacherForTimetable(
                entry,
                [entry.section]
              );
            }

            completedTeachers++;
            this.importProgress = Math.min(
              30,
              Math.round((completedTeachers / teacherJobs.length) * 30)
            );
            this.importMessage =
              `Syncing teachers... ${completedTeachers}/${teacherJobs.length}`;
            this.cdr.detectChanges();
          })
        );
      } else {
        this.importProgress = 30;
      }

      // ============================================================
      // 3. SAVE TIMETABLE ROWS IN SMALL PARALLEL BATCHES
      // ============================================================
      // Instead of waiting for every request one-by-one, 10 rows are
      // sent together. This keeps the browser/backend stable while
      // removing most of the unnecessary network waiting time.
      this.importStage = 'Saving timetable';
      this.importMessage = 'Saving timetable classes...';
      this.cdr.detectChanges();

      const entries = [...this.importPreview];
      const BATCH_SIZE = 10;

      for (let start = 0; start < entries.length; start += BATCH_SIZE) {
        const batch = entries.slice(start, start + BATCH_SIZE);

        await Promise.all(
          batch.map(entry =>
            firstValueFrom(this.service.create(entry))
          )
        );

        saved += batch.length;
        this.importProgress =
          30 + Math.round((saved / entries.length) * 70);
        this.importMessage =
          `Saving timetable classes... ${saved}/${entries.length}`;
        this.cdr.detectChanges();
      }

      // ============================================================
      // 4. IMPORT COMPLETE
      // ============================================================
      const successMessage =
        `Successfully imported ${saved} classes.`;

      this.importPreview = [];
      this.importFileName = '';
      this.ocrText = '';
      this.importProgress = 100;
      this.importStage = 'Import completed';
      this.ocrWordCount = 0;
      this.detectedDays = [];
      this.detectedTimeSlots = 0;
      this.detectedSections = [];
      this.parserStatus = '';
      this.importMessage = successMessage;
      this.cdr.detectChanges();

      // Reload the selected timetable from the backend.
      await this.load();

      window.setTimeout(() => {
        if (!this.ocrBusy && !this.importing) {
          this.importMessage = '';
          this.importProgress = 0;
          this.importStage = 'Waiting for a file';
          this.cdr.detectChanges();
        }
      }, 2500);

    } catch (err: any) {
      console.error('Bulk import error:', err);

      this.error =
        `${saved} entries were saved; the remaining entries failed. Check the backend/API.`;
      this.importMessage = '';
      this.importStage = 'Import failed';
      this.cdr.detectChanges();

    } finally {
      this.importing = false;
      this.cdr.detectChanges();
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

      if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
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
        source = canvas;
      }

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

      const tesseractModule = await import('tesseract.js');

const tesseract: any =
  (tesseractModule as any).default ?? tesseractModule;

const createWorker = tesseract.createWorker;

      this.importProgress = 30;
      this.importStage = 'Reading text';
      this.importMessage = 'Reading text from the uploaded timetable...';
      this.cdr.detectChanges();

      ocrWorker = await createWorker('eng', undefined, {
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

      const rows = this.parseOcrTimetable(ocrData, source);

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
  private parseOcrTimetable(
    data: any,
    source?: string | HTMLCanvasElement
  ): TimetableEntry[] {
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

    if (dayAnchors.length < 2 || slots.length < 2) {
      this.parserStatus = `OCR found ${words.length} words, ${dayAnchors.length} days and ${slots.length} time slots, but the timetable grid could not be detected.`;
      return [];
    }

    // IMPORTANT: A timetable is a 2-D grid. Never build a class by simply
    // joining all words that happen to share the same Y coordinate: adjacent
    // columns often have almost identical Y values. That was the cause of
    // entries such as "COA CN ML CCDT" being merged into one class.
    const dayRows = dayAnchors.map((day, dayIndex) => ({
      day,
      dayIndex,
      words: words.filter((w: any) =>
        w.cx > 55 &&
        w.cy >= day.top + 2 &&
        w.cy <= day.bottom - 2 &&
        !this.isOcrNoise(String(w.text || ''))
      )
    }));

    const units: any[] = [];

    for (const row of dayRows) {
      // First create visual lines within the day row.
      const lines: Array<{ cy: number; words: any[] }> = [];
      for (const word of [...row.words].sort((a, b) => a.cy - b.cy || a.x - b.x)) {
        const existing = lines.find(line => Math.abs(line.cy - word.cy) <= 9);
        if (existing) {
          existing.words.push(word);
          existing.cy = existing.words.reduce((sum, item) => sum + item.cy, 0) / existing.words.length;
        } else {
          lines.push({ cy: word.cy, words: [word] });
        }
      }

      for (const line of lines) {
        const ordered = [...line.words].sort((a, b) => a.x - b.x);
        if (!ordered.length) continue;

        // Split the visual line by timetable column. This is the key fix:
        // words from COA/CN/ML/CCDT no longer become one giant class.
        const groups = new Map<number, any[]>();
        for (const word of ordered) {
          const slotIndex = this.nearestOcrSlotIndex(word.cx, slots);
          const list = groups.get(slotIndex) || [];
          list.push(word);
          groups.set(slotIndex, list);
        }

        const sortedIndexes = Array.from(groups.keys()).sort((a, b) => a - b);
        let i = 0;
        while (i < sortedIndexes.length) {
          let startIndex = sortedIndexes[i];
          let endIndex = startIndex;
          let groupWords = [...(groups.get(startIndex) || [])];

          // Do NOT merge adjacent columns merely because a cell contains LAB.
          // OCR bounding boxes can straddle a grid boundary even when the
          // printed cell is only one hour wide (this was producing 14:00-16:00
          // entries from the 15:00-16:00 CN LAB cell). A two-hour duration is
          // inferred later only when the actual text/cell geometry supports it.
          let j = i + 1;

          const minX = Math.min(...groupWords.map(w => w.x));
          const maxX = Math.max(...groupWords.map(w => w.x2));
          const center = (minX + maxX) / 2;
          let slotStart = startIndex;
          let slotEnd = endIndex;

          // A merged cell can contain one short centered label (for example a
          // common activity). If its centre sits very close to the midpoint of
          // two adjacent columns AND the image has no vertical grid line at
          // that boundary, use the real cell span. This is image geometry,
          // not hardcoded subject data.
          if (slotStart === slotEnd && source && this.isCanvasSource(source)) {
            for (let boundary = 0; boundary < slots.length - 1; boundary++) {
              if (boundary !== slotStart && boundary !== slotStart - 1) continue;
              const left = slots[boundary].x;
              const right = slots[boundary + 1].x;
              const midpoint = (left + right) / 2;
              const gap = Math.abs(right - left);
              if (Math.abs(center - midpoint) <= gap * 0.18 && this.hasNoVerticalGridLine(source, midpoint, row.day.top, row.day.bottom)) {
                if (slotStart === boundary || slotStart === boundary + 1) {
                  slotStart = boundary;
                  slotEnd = boundary + 1;
                }
                break;
              }
            }
          }

          let text = groupWords.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim();
          // Day labels can fall inside the OCR row band because the scan is
          // slightly skewed. They are row markers, never timetable subjects.
          text = text.replace(/^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+/i, '').trim();
          if (text && !this.looksLikeTimeHeader(text) && !this.isOcrNoise(text)) {
            const prefix = this.extractSectionPrefix(text);
            units.push({
              dayIndex: row.dayIndex,
              dayName: row.day.name,
              cy: line.cy,
              minX,
              maxX,
              slot: [slotStart, slotEnd],
              text,
              section: prefix.section,
              parsedText: prefix.text
            });
          }

          i = j;
        }
      }
    }

    // Merge a room-only OCR line into the class line immediately above it.
    // Example: "ML (VPS)" + "S-2" becomes one class with room S-2.
    const merged: any[] = [];
    for (const unit of units.sort((a, b) => a.dayIndex - b.dayIndex || a.cy - b.cy || a.minX - b.minX)) {
      const previous = merged[merged.length - 1];
      const roomOnly = this.isOcrRoomOnly(unit.text);
      const sameCell = previous &&
        previous.dayIndex === unit.dayIndex &&
        previous.slot?.[0] === unit.slot?.[0] &&
        previous.slot?.[1] === unit.slot?.[1] &&
        unit.cy - previous.cy <= 34;

      if (sameCell && roomOnly && !unit.section) {
        previous.text = `${previous.text} ${unit.text}`.replace(/\s+/g, ' ').trim();
        previous.parsedText = `${previous.parsedText} ${unit.text}`.replace(/\s+/g, ' ').trim();
        previous.maxX = Math.max(previous.maxX, unit.maxX);
        continue;
      }

      if (sameCell && !unit.section && /^Meeting$/i.test(unit.text) && /Mentor\s+Mentee/i.test(previous.text)) {
        previous.text = `${previous.text} Meeting`;
        previous.parsedText = `${previous.parsedText} Meeting`;
        continue;
      }

      merged.push({ ...unit });
    }

    const sectionSet = new Set<string>();
    for (const unit of merged) {
      if (unit.section) sectionSet.add(unit.section);
    }

    this.detectedSections = Array.from(sectionSet).sort();
    if (!sectionSet.size) {
      this.parserStatus = 'OCR read the table, but no valid section labels were detected.';
      return [];
    }

    const rows: TimetableEntry[] = [];
    const seen = new Set<string>();

    for (const unit of merged) {
      const parsed = this.parseOcrCell(unit.parsedText);
      if (!parsed.subject) continue;

      let subject = parsed.subject.trim();
      let faculty = parsed.faculty.trim();
      let room = parsed.room.trim();

      subject = subject
        .replace(/^0S$/i, 'OS')
        .replace(/^1B$/i, 'IB')
        .replace(/^CC0T$/i, 'CCDT')
        .replace(/^CCDT$/i, 'CCDT');

      if (/^Mentor\s+Mentee$/i.test(subject) && unit.dayName === 'Thursday') {
        subject = 'Mentor Mentee Meeting';
      }

      const startSlot = Math.max(0, Math.min(unit.slot[0], slots.length - 1));
      const endSlot = Math.max(startSlot, Math.min(unit.slot[1], slots.length - 1));
      const timeRange = {
        start: slots[startSlot].start,
        end: slots[endSlot].end
      };

      const cellSection = unit.section || parsed.section;
      const targetSections = cellSection ? [cellSection] : Array.from(sectionSet);

      for (const section of targetSections) {
        const rowEntry: TimetableEntry = {
          department: this.selectedDepartment,
          branch: this.selectedBranch,
          semester: this.selectedSemester,
          section,
          dayOfWeek: unit.dayName,
          subject,
          faculty,
          room,
          startTime: timeRange.start,
          endTime: timeRange.end,
          practical: parsed.practical || /\bLAB\b|PRACTICAL/i.test(subject)
        };

        const key = [
          rowEntry.section,
          rowEntry.dayOfWeek,
          rowEntry.startTime,
          rowEntry.endTime,
          rowEntry.subject,
          rowEntry.faculty,
          rowEntry.room
        ].join('|').toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          rows.push(rowEntry);
        }
      }
    }

    // OCR can split a two-hour practical cell into a real lab label in one
    // row and a generic "LAB" token in the next row. Resolve those generic
    // labels only when the uploaded timetable itself gives enough evidence
    // (same faculty/room, same day, or a nearby matching lab cell). No
    // timetable subject is hardcoded here.
    const resolvedRows = this.resolveGenericOcrLabs(rows);

    this.parserStatus = `OCR mapped ${resolvedRows.length} entries from ${merged.length} timetable cells.`;

    return resolvedRows.sort((a, b) => {
      const sectionCompare = a.section.localeCompare(b.section);
      if (sectionCompare) return sectionCompare;
      const dayCompare = this.days.indexOf(a.dayOfWeek) - this.days.indexOf(b.dayOfWeek);
      if (dayCompare) return dayCompare;
      return a.startTime.localeCompare(b.startTime) || a.subject.localeCompare(b.subject);
    });
  }


  private resolveGenericOcrLabs(rows: TimetableEntry[]): TimetableEntry[] {
    const labPattern = /^(.+?)\s+LAB$/i;

    // First normalize forms such as "LAB - VPS", "Lab DG" and "LAB SR"
    // when the OCR omitted the parentheses around the faculty initials.
    const normalized = rows.map(row => {
      const copy = { ...row };
      const subject = String(copy.subject || '').replace(/\s+/g, ' ').trim();

      const facultyFromLab = subject.match(
        /^LAB\s*[-:]\s*([A-Za-z]{2,5})$/i
      ) || subject.match(
        /^LAB\s+([A-Za-z]{2,5})$/i
      );

      if (/^LAB$/i.test(subject)) {
        copy.subject = 'LAB';
      } else if (facultyFromLab) {
        copy.subject = 'LAB';
        if (!copy.faculty) {
          copy.faculty = facultyFromLab[1].toUpperCase();
        }
      } else if (/^LAB\b/i.test(subject) && !labPattern.test(subject)) {
        // Keep the parser conservative: do not turn arbitrary "LAB ..." text
        // into a named subject unless the remainder is clearly a faculty tag.
        copy.subject = subject;
      }

      return copy;
    });

    const namedLabs = normalized.filter(row =>
      labPattern.test(String(row.subject || '').trim()) &&
      !/^LAB$/i.test(String(row.subject || '').trim())
    );

    const minutes = (value: string): number => {
      const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
    };

    const overlap = (a: TimetableEntry, b: TimetableEntry): boolean => {
      const as = minutes(a.startTime);
      const ae = minutes(a.endTime);
      const bs = minutes(b.startTime);
      const be = minutes(b.endTime);
      return as >= 0 && ae > as && bs >= 0 && be > bs && as < be && bs < ae;
    };

    const distance = (a: TimetableEntry, b: TimetableEntry): number => {
      const ac = (minutes(a.startTime) + minutes(a.endTime)) / 2;
      const bc = (minutes(b.startTime) + minutes(b.endTime)) / 2;
      return Math.abs(ac - bc);
    };

    const scoreCandidate = (generic: TimetableEntry, candidate: TimetableEntry): number => {
      if (generic.dayOfWeek !== candidate.dayOfWeek) return -Infinity;

      let score = 0;

      if (generic.section === candidate.section) score += 60;
      if (generic.faculty && candidate.faculty &&
          generic.faculty.toUpperCase() === candidate.faculty.toUpperCase()) score += 80;
      if (generic.room && candidate.room &&
          generic.room.toUpperCase().replace(/\s+/g, '') ===
          candidate.room.toUpperCase().replace(/\s+/g, '')) score += 80;

      if (overlap(generic, candidate)) score += 25;

      const d = distance(generic, candidate);
      if (d <= 60) score += 30;
      else if (d <= 120) score += 15;
      else if (d > 180) score -= 25;

      // A named lab immediately before/after a generic continuation is strong
      // evidence that the generic OCR cell belongs to the same practical.
      if (generic.faculty && candidate.faculty &&
          generic.faculty.toUpperCase() === candidate.faculty.toUpperCase() &&
          d <= 120) score += 50;

      if (generic.room && candidate.room &&
          generic.room.toUpperCase().replace(/\s+/g, '') ===
          candidate.room.toUpperCase().replace(/\s+/g, '') &&
          d <= 120) score += 50;

      return score;
    };

    return normalized.map(row => {
      if (!/^LAB$/i.test(String(row.subject || '').trim())) return row;

      let best: TimetableEntry | null = null;
      let bestScore = -Infinity;

      for (const candidate of namedLabs) {
        const score = scoreCandidate(row, candidate);
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }

      // Also allow a nearby normal subject to identify the practical when
      // the OCR captured the lab name in a neighbouring split cell. This is
      // intentionally weaker than faculty/room evidence.
      if (bestScore < 80) {
        for (const candidate of normalized) {
          if (candidate === row || candidate.practical) continue;
          if (candidate.dayOfWeek !== row.dayOfWeek) continue;
          if (candidate.section !== row.section) continue;
          const d = distance(row, candidate);
          if (d > 120 || !overlap(row, candidate)) continue;

          let score = 20;
          if (candidate.faculty && row.faculty &&
              candidate.faculty.toUpperCase() === row.faculty.toUpperCase()) score += 30;
          if (candidate.room && row.room &&
              candidate.room.toUpperCase().replace(/\s+/g, '') ===
              row.room.toUpperCase().replace(/\s+/g, '')) score += 30;

          if (score > bestScore) {
            bestScore = score;
            best = candidate;
          }
        }
      }

      // Never guess from unrelated cells. If the scan did not provide enough
      // evidence, retain LAB so the user can review it instead of receiving
      // a fabricated subject name.
      if (!best || bestScore < 80) return row;

      const named = best.subject.trim();
      const labName = /^(.+?)\s+LAB$/i.exec(named)?.[1]?.trim();
      if (!labName) return row;

      return {
        ...row,
        subject: `${labName} LAB`,
        practical: true
      };
    });
  }

  private nearestOcrSlotIndex(x: number, slots: Array<{ x: number; start: string; end: string }>): number {
    let index = 0;
    let distance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slots.length; i++) {
      const d = Math.abs(x - slots[i].x);
      if (d < distance) {
        distance = d;
        index = i;
      }
    }
    return index;
  }

  private isCanvasSource(source: string | HTMLCanvasElement): source is HTMLCanvasElement {
    return typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement;
  }

  private hasNoVerticalGridLine(
    source: HTMLCanvasElement,
    approximateX: number,
    top: number,
    bottom: number
  ): boolean {
    const ctx = source.getContext('2d');
    if (!ctx) return false;
    const x0 = Math.max(0, Math.round(approximateX) - 30);
    const x1 = Math.min(source.width - 1, Math.round(approximateX) + 30);
    const y0 = Math.max(0, Math.round(top));
    const y1 = Math.min(source.height - 1, Math.round(bottom));
    if (x1 <= x0 || y1 <= y0) return false;

    const image = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;
    let bestRun = 0;

    for (let x = 0; x <= x1 - x0; x++) {
      let run = 0;
      let maxRun = 0;
      for (let y = 0; y <= y1 - y0; y++) {
        const idx = (y * (x1 - x0 + 1) + x) * 4;
        const gray = (image[idx] + image[idx + 1] + image[idx + 2]) / 3;
        if (gray < 90) {
          run++;
          maxRun = Math.max(maxRun, run);
        } else {
          run = 0;
        }
      }
      bestRun = Math.max(bestRun, maxRun);
    }

    // A real table boundary continues for a substantial part of the row;
    // text strokes usually form only short vertical runs.
    return bestRun < Math.max(12, (y1 - y0) * 0.42);
  }

  private isOcrRoomOnly(text: string): boolean {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return /^(?:S\s*[-–]?\s*\d{1,3}[A-Z]?|G\s*[-–]?\s*\d{1,3}[A-Z]?)$/i.test(value)
      || /^(?:LAB\s+)?(?:D|G\s*[-–]?\s*\d{1,3}[A-Z]?)$/i.test(value);
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
            department: this.selectedDepartment,
            branch: this.selectedBranch,
            semester: this.selectedSemester,
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

    // The scan often places the section prefix directly against IT LAB, e.g.
    // "CA2ITLABG-18B". Split that into section + subject before normal parsing.
    value = value.replace(/^([A-Z]{1,5}\d{1,3})\s*(IT\s*LAB|LAB)\s*/i, '$1- $2 ');
    // Remove accidental row/day prefixes produced by OCR.
    value = value.replace(/^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+/i, '').trim();

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
      /\b(S\s*-?\s*\d{1,3}\s*[A-Za-z]?)\s*$/i,
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

    // Standalone room labels are frequently OCR-corrupted: S-2 -> 5-2, S-9
    // -> 5-9, S-12 -> $-12 / 52 / S22. Never create a timetable class from
    // these room-only tokens.
    const roomOnlyOcr = /^(?:S|5|§|\$|s)?\s*[-.]?\s*(?:2|9|12|22|52|5-2|5-9|5-12)\s*[A-Z]?$|^[S5$§]\s*[-.]?\s*\d{1,2}[A-Z]?$/i;
    if (roomOnlyOcr.test(value)) {
      return {
        section: sectionInfo.section,
        subject: '',
        faculty,
        room,
        practical: false
      };
    }

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

    // Room labels such as S-2, S-9, S-12 and G-29 are not sections.
    if (/^[SG]\s*-?\s*\d{1,3}[A-Z]?$/i.test(token)) {
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

  // Fixed weekly timetable columns matching the official timetable format.
  readonly timeSlots = [
    { label: '9:00 AM\n10:00 AM', start: '09:00', end: '10:00' },
    { label: '10:00 AM\n11:00 AM', start: '10:00', end: '11:00' },
    { label: '11:00 AM\n12:00 PM', start: '11:00', end: '12:00' },
    { label: '12:00 PM\n1:00 PM', start: '12:00', end: '13:00' },
    { label: '1:00 PM\n2:00 PM', start: '13:00', end: '14:00' },
    { label: '2:00 PM\n3:00 PM', start: '14:00', end: '15:00' },
    { label: '3:00 PM\n4:00 PM', start: '15:00', end: '16:00' }
  ];

  entriesForSlot(day: string, slot: { start: string; end: string }): TimetableEntry[] {
    const slotStart = this.timeToMinutes(slot.start);
    const slotEnd = this.timeToMinutes(slot.end);
    return this.entries
      .filter(e => e.dayOfWeek === day)
      .filter(e => {
        const start = this.timeToMinutes(e.startTime);
        const end = this.timeToMinutes(e.endTime);
        return start < slotEnd && end > slotStart;
      })
      .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
  }

  startsInSlot(entry: TimetableEntry, slot: { start: string; end: string }): boolean {
    return this.timeToMinutes(entry.startTime) === this.timeToMinutes(slot.start);
  }

  // Number of hourly columns occupied by an entry.
  // This applies to BOTH theory classes and labs.
  // Example: 10:00–12:00 => colspan="2".
  slotSpan(entry: TimetableEntry): number {
    const start = this.timeToMinutes(entry.startTime);
    const end = this.timeToMinutes(entry.endTime);
    if (start < 0 || end <= start) return 1;

    const minutes = end - start;
    const span = Math.ceil(minutes / 60);
    return Math.max(1, Math.min(this.timeSlots.length, span));
  }

  // Return every class that STARTS in the same time slot.
  // This is important when I1 and I2 have different labs at the same time:
  // both classes must be rendered inside the same timetable cell.
  entriesStartingInSlot(day: string, slot: { start: string; end: string }): TimetableEntry[] {
    return this.entriesForSlot(day, slot)
      .filter(e => this.startsInSlot(e, slot))
      .sort((a, b) =>
        (a.section || '').localeCompare(b.section || '') ||
        (a.subject || '').localeCompare(b.subject || '') ||
        (a.room || '').localeCompare(b.room || '')
      );
  }

  // The cell must span far enough for the longest class/lab starting here.
  maxSlotSpan(entries: TimetableEntry[]): number {
    if (!entries.length) return 1;
    return Math.max(...entries.map(entry => this.slotSpan(entry)));
  }

  firstEntryStartingInSlot(day: string, slot: { start: string; end: string }): TimetableEntry | null {
    return this.entriesStartingInSlot(day, slot)[0] ?? null;
  }

  hasEntryStartingInSlot(day: string, slot: { start: string; end: string }): boolean {
    return this.firstEntryStartingInSlot(day, slot) !== null;
  }

  isSlotCoveredByEarlierEntry(day: string, slotIndex: number): boolean {
    const currentStart = this.timeToMinutes(this.timeSlots[slotIndex].start);
    return this.entries.some(e => {
      if (e.dayOfWeek !== day) return false;
      const start = this.timeToMinutes(e.startTime);
      const end = this.timeToMinutes(e.endTime);
      return start < currentStart && end > currentStart;
    });
  }

  // GET TEACHER CLASSES FOR A DAY
  teacherEntriesForDay(day: string): TimetableEntry[] {
    return this.teacherEntries
      .filter(e => e.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  teacherEntriesStartingInSlot(day: string, slot: { start: string; end: string }): TimetableEntry[] {
    const items = this.teacherEntriesForDay(day)
      .filter(e => this.startsInSlot(e, slot))
      .sort((a, b) => a.section.localeCompare(b.section));
    if (items.length <= 1) return items;
    const groups = new Map<string, TimetableEntry[]>();
    for (const item of items) {
      const key = [(item.startTime || ''), (item.endTime || ''), (item.subject || '').trim().toLowerCase(), (item.faculty || '').trim().toLowerCase(), (item.room || '').trim().toLowerCase(), !!item.practical].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return [...groups.values()].map(group => {
      const first = group[0];
      const sections = [...new Set(group.map(x => x.section).filter(Boolean))].sort();
      return { ...first, section: sections.length > 1 ? sections.join(' + ') : first.section };
    });
  }

  teacherFirstEntryStartingInSlot(day: string, slot: { start: string; end: string }): TimetableEntry | null {
    return this.teacherEntriesStartingInSlot(day, slot)[0] ?? null;
  }

  isTeacherSlotCoveredByEarlierEntry(day: string, slotIndex: number): boolean {
    const currentStart = this.timeToMinutes(this.timeSlots[slotIndex].start);
    return this.teacherEntries.some(e => {
      if (e.dayOfWeek !== day) return false;
      const start = this.timeToMinutes(e.startTime);
      const end = this.timeToMinutes(e.endTime);
      return start < currentStart && end > currentStart;
    });
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