import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic.service';
import { AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection } from '../../models/models';

@Component({
  selector: 'app-academic-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './academic-management.component.html',
  styleUrl: './academic-management.component.css'
})
export class AcademicManagementComponent implements OnInit {
  departments: AcademicDepartment[] = [];
  branches: AcademicBranch[] = [];
  semesters: AcademicSemester[] = [];
  sections: AcademicSection[] = [];

  selectedDepartmentId?: number;
  selectedBranchId?: number;
  selectedSemesterId?: number;

  departmentForm: AcademicDepartment = { name: '', code: '', active: true };
  branchForm: AcademicBranch = { name: '', code: '', department: { name: '', code: '' } };
  semesterForm: AcademicSemester = { semesterNumber: 1, name: '1st Semester', branch: { name: '', code: '', department: { name: '', code: '' } } };
  sectionForm: AcademicSection = { name: '', semester: { semesterNumber: 1, name: '', branch: { name: '', code: '', department: { name: '', code: '' } } } };

  editingDepartment?: number;
  editingBranch?: number;
  editingSemester?: number;
  editingSection?: number;
  busy = false;
  message = '';
  error = '';

  constructor(private academic: AcademicService) {}

  ngOnInit(): void { this.loadDepartments(); }

  loadDepartments(): void {
    this.academic.departments().subscribe({ next: v => this.departments = v ?? [], error: e => this.fail(e) });
  }

  selectDepartment(id: number): void {
    this.selectedDepartmentId = +id;
    this.selectedBranchId = undefined;
    this.selectedSemesterId = undefined;
    this.branches = []; this.semesters = []; this.sections = [];
    this.academic.branches(+id).subscribe({ next: v => this.branches = v ?? [], error: e => this.fail(e) });
  }

  selectBranch(id: number): void {
    this.selectedBranchId = +id;
    this.selectedSemesterId = undefined;
    this.semesters = []; this.sections = [];
    this.academic.semesters(+id).subscribe({ next: v => this.semesters = v ?? [], error: e => this.fail(e) });
  }

  selectSemester(id: number): void {
    this.selectedSemesterId = +id;
    this.sections = [];
    this.academic.sections(+id).subscribe({ next: v => this.sections = v ?? [], error: e => this.fail(e) });
  }

  saveDepartment(): void {
    this.error = '';
    const req = this.editingDepartment
      ? this.academic.updateDepartment(this.editingDepartment, this.departmentForm)
      : this.academic.createDepartment(this.departmentForm);
    req.subscribe({ next: () => { this.resetDepartment(); this.loadDepartments(); this.ok('Department saved.'); }, error: e => this.fail(e) });
  }
  editDepartment(v: AcademicDepartment): void { this.editingDepartment = v.id; this.departmentForm = { ...v }; }
  removeDepartment(v: AcademicDepartment): void { if (!v.id || !confirm(`Remove ${v.name}?`)) return; this.academic.deleteDepartment(v.id).subscribe({ next: () => { this.loadDepartments(); this.ok('Department removed.'); }, error: e => this.fail(e) }); }
  resetDepartment(): void { this.editingDepartment = undefined; this.departmentForm = { name: '', code: '', active: true }; }

  saveBranch(): void {
    if (!this.selectedDepartmentId) { this.error = 'Select a department first.'; return; }
    const payload = { ...this.branchForm, department: { id: this.selectedDepartmentId, name: '', code: '' } } as AcademicBranch;
    const req = this.editingBranch ? this.academic.updateBranch(this.editingBranch, payload) : this.academic.createBranch(payload);
    req.subscribe({ next: () => { this.resetBranch(); this.selectDepartment(this.selectedDepartmentId!); this.ok('Branch saved.'); }, error: e => this.fail(e) });
  }
  editBranch(v: AcademicBranch): void { this.editingBranch = v.id; this.branchForm = { ...v }; }
  removeBranch(v: AcademicBranch): void { if (!v.id || !confirm(`Remove ${v.name}?`)) return; this.academic.deleteBranch(v.id).subscribe({ next: () => this.selectDepartment(this.selectedDepartmentId!), error: e => this.fail(e) }); }
  resetBranch(): void { this.editingBranch = undefined; this.branchForm = { name: '', code: '', department: { name: '', code: '' } }; }

  saveSemester(): void {
    if (!this.selectedBranchId) { this.error = 'Select a branch first.'; return; }
    const payload = { ...this.semesterForm, branch: { id: this.selectedBranchId, name: '', code: '', department: { name: '', code: '' } } } as AcademicSemester;
    const req = this.editingSemester ? this.academic.updateSemester(this.editingSemester, payload) : this.academic.createSemester(payload);
    req.subscribe({ next: () => { this.resetSemester(); this.selectBranch(this.selectedBranchId!); this.ok('Semester saved.'); }, error: e => this.fail(e) });
  }
  editSemester(v: AcademicSemester): void { this.editingSemester = v.id; this.semesterForm = { ...v }; }
  removeSemester(v: AcademicSemester): void { if (!v.id || !confirm(`Remove ${v.name}?`)) return; this.academic.deleteSemester(v.id).subscribe({ next: () => this.selectBranch(this.selectedBranchId!), error: e => this.fail(e) }); }
  resetSemester(): void { this.editingSemester = undefined; this.semesterForm = { semesterNumber: 1, name: '1st Semester', branch: { name: '', code: '', department: { name: '', code: '' } } }; }

  saveSection(): void {
    if (!this.selectedSemesterId) { this.error = 'Select a semester first.'; return; }
    const payload = { ...this.sectionForm, semester: { id: this.selectedSemesterId, semesterNumber: 1, name: '', branch: { name: '', code: '', department: { name: '', code: '' } } } } as AcademicSection;
    const req = this.editingSection ? this.academic.updateSection(this.editingSection, payload) : this.academic.createSection(payload);
    req.subscribe({ next: () => { this.resetSection(); this.selectSemester(this.selectedSemesterId!); this.ok('Section saved.'); }, error: e => this.fail(e) });
  }
  editSection(v: AcademicSection): void { this.editingSection = v.id; this.sectionForm = { ...v }; }
  removeSection(v: AcademicSection): void { if (!v.id || !confirm(`Remove ${v.name}?`)) return; this.academic.deleteSection(v.id).subscribe({ next: () => this.selectSemester(this.selectedSemesterId!), error: e => this.fail(e) }); }
  resetSection(): void { this.editingSection = undefined; this.sectionForm = { name: '', semester: { semesterNumber: 1, name: '', branch: { name: '', code: '', department: { name: '', code: '' } } } }; }

  private ok(m: string): void { this.error = ''; this.message = m; setTimeout(() => this.message = '', 2500); }
  private fail(e: any): void { console.error(e); this.error = 'Operation failed. Backend check karein.'; }
}
