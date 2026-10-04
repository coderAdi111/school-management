import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import {
  Student,
  ClassRoom,
  Attendance,
  Fee,
  Mark,
  Teacher
} from '../../models/models';

interface SubjectStat {
  subject: string;
  percentage: number;
  marked: number;
}

interface DashboardCache {
  savedAt: number;
  students: Student[];
  classes: ClassRoom[];
  teachers: Teacher[];
  attendance: Attendance[];
  fees: Fee[];
  marks: Mark[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  students: Student[] = [];
  classes: ClassRoom[] = [];
  teachers: Teacher[] = [];
  attendance: Attendance[] = [];
  fees: Fee[] = [];
  marks: Mark[] = [];

  /*
   * IMPORTANT:
   * loading no longer blocks the dashboard.
   *
   * It is only used for the small "Updating" button/state.
   */
  loading = false;
  errorMessage = '';

  today = '';
  todayLabel = '';
  greeting = 'Good Evening';
private greetingTimer: ReturnType<typeof setInterval> | undefined;

  todayMarked = 0;
  presentCount = 0;
  absentCount = 0;
  lateCount = 0;
  excusedCount = 0;

  attendancePercentage = 0;

  i1Attendance = 0;
  i2Attendance = 0;

  subjectStats: SubjectStat[] = [];

  paidAmount = 0;
  pendingAmount = 0;
  overdueAmount = 0;
  feeProgress = 0;

  averagePercentage = 0;

  /*
   * Dashboard data cache.
   *
   * localStorage means:
   * refresh / reopen dashboard
   * -> previous data appears immediately.
   */
  private readonly cacheKey =
    'school-management-dashboard-v3';

  private readonly api =
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api'
      : 'https://school-management-vy1j.onrender.com/api';

  private requestsCompleted = 0;
  private requestsFailed = 0;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  this.updateGreeting();

  this.greetingTimer = setInterval(() => {
    this.updateGreeting();
  }, 60 * 1000);

  this.setToday();
  this.restoreCache();
  this.refreshInBackground();
}

private updateGreeting(): void {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    this.greeting = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    this.greeting = 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    this.greeting = 'Good Evening';
  } else {
    this.greeting = 'Good Night';
  }
}

ngOnDestroy(): void {
  if (this.greetingTimer) {
    clearInterval(this.greetingTimer);
  }
}

  private setToday(): void {

    const now = new Date();

    const yyyy = now.getFullYear();

    const mm = String(
      now.getMonth() + 1
    ).padStart(2, '0');

    const dd = String(
      now.getDate()
    ).padStart(2, '0');

    this.today =
      `${yyyy}-${mm}-${dd}`;

    this.todayLabel =
      now.toLocaleDateString(
        'en-IN',
        {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }
      );
  }

  /*
   * ============================================================
   * CACHE
   * ============================================================
   */

  private restoreCache(): void {

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    try {

      const saved =
        localStorage.getItem(
          this.cacheKey
        );

      if (!saved) {
        return;
      }

     const cache: DashboardCache =
  JSON.parse(saved);

      if (
        !cache ||
        !Array.isArray(cache.students) ||
        !Array.isArray(cache.classes) ||
        !Array.isArray(cache.teachers) ||
        !Array.isArray(cache.attendance) ||
        !Array.isArray(cache.fees) ||
        !Array.isArray(cache.marks)
      ) {
        return;
      }

      /*
       * Restore immediately.
       */
      this.students =
        cache.students;

      this.classes =
        cache.classes;

      this.teachers =
        cache.teachers;

      this.attendance =
        cache.attendance;

      this.fees =
        cache.fees;

      this.marks =
        cache.marks;

      /*
       * Recalculate dashboard cards.
       */
      this.calculateDashboard();

      /*
       * Tell Angular immediately.
       */
      this.cdr.detectChanges();

    } catch (error) {

      console.warn(
        'Dashboard cache restore failed:',
        error
      );
    }
  }

  private saveCache(): void {

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    try {

      const cache: DashboardCache = {

        savedAt: Date.now(),

        students:
          this.students,

        classes:
          this.classes,

        teachers:
          this.teachers,

        attendance:
          this.attendance,

        fees:
          this.fees,

        marks:
          this.marks
      };

      localStorage.setItem(
        this.cacheKey,
        JSON.stringify(cache)
      );

    } catch (error) {

      console.warn(
        'Dashboard cache save failed:',
        error
      );
    }
  }

  /*
   * ============================================================
   * BACKGROUND REFRESH
   * ============================================================
   */

  refreshInBackground(): void {

    /*
     * Do NOT hide the existing dashboard.
     *
     * User can still see cached data.
     */
    this.loading = true;

    this.errorMessage = '';

    this.requestsCompleted = 0;
    this.requestsFailed = 0;

    /*
     * IMPORTANT:
     * Separate requests.
     *
     * One slow API will not block other cards.
     */

    this.loadStudents();

    this.loadClasses();

    this.loadTeachers();

    this.loadAttendance();

    this.loadFees();

    this.loadMarks();
  }

  private loadStudents(): void {

    this.http
      .get<Student[]>(
        `${this.api}/students`
      )
      .subscribe({

        next: data => {

          this.students =
            (data ?? [])
              .filter(student =>
                student.classRoom?.grade ===
                  '5th Semester' &&

                (
                  student.classRoom?.section === 'I1' ||
                  student.classRoom?.section === 'I2'
                )
              );

          this.calculateDashboard();

          this.requestDone();

        },

        error: error => {

          console.error(
            'Students dashboard API:',
            error
          );

          this.requestFailed();
        }
      });
  }

  private loadClasses(): void {

    this.http
      .get<ClassRoom[]>(
        `${this.api}/classes`
      )
      .subscribe({

        next: data => {

          this.classes =
            (data ?? [])
              .filter(classRoom =>
                classRoom.grade ===
                  '5th Semester' &&

                (
                  classRoom.section === 'I1' ||
                  classRoom.section === 'I2'
                )
              );

          this.calculateDashboard();

          this.requestDone();

        },

        error: error => {

          console.error(
            'Classes dashboard API:',
            error
          );

          this.requestFailed();
        }
      });
  }

  private loadTeachers(): void {

    this.http
      .get<Teacher[]>(
        `${this.api}/teachers`
      )
      .subscribe({

        next: data => {

          this.teachers =
            (data ?? [])
              .filter(
                teacher =>
                  teacher.status === 'ACTIVE'
              );

          this.calculateDashboard();

          this.requestDone();

        },

        error: error => {

          console.error(
            'Teachers dashboard API:',
            error
          );

          this.requestFailed();
        }
      });
  }

  private loadAttendance(): void {

    this.http
      .get<Attendance[]>(
        `${this.api}/attendance`
      )
      .subscribe({

        next: data => {

          this.attendance =
            data ?? [];

          this.filterRelatedData();

          this.calculateDashboard();

          this.requestDone();

        },

        error: error => {

          console.error(
            'Attendance dashboard API:',
            error
          );

          this.requestFailed();
        }
      });
  }

  private loadFees(): void {

    this.http
      .get<Fee[]>(
        `${this.api}/fees`
      )
      .subscribe({

        next: data => {

          this.fees =
            data ?? [];

          this.filterRelatedData();

          this.calculateDashboard();

          this.requestDone();

        },

        error: error => {

          console.error(
            'Fees dashboard API:',
            error
          );

          this.requestFailed();
        }
      });
  }

  private loadMarks(): void {

    this.http
      .get<Mark[]>(
        `${this.api}/marks`
      )
      .subscribe({

        next: data => {

          this.marks =
            data ?? [];

          this.filterRelatedData();

          this.calculateDashboard();

          this.requestDone();

        },

        error: error => {

          console.error(
            'Marks dashboard API:',
            error
          );

          this.requestFailed();
        }
      });
  }

  /*
   * ============================================================
   * RELATED DATA FILTER
   * ============================================================
   */

  private filterRelatedData(): void {

    const studentIds =
      new Set(
        this.students
          .map(student => student.id)
          .filter(
            (id): id is number =>
              id !== undefined
          )
      );

    const classIds =
      new Set(
        this.classes
          .map(classRoom => classRoom.id)
          .filter(
            (id): id is number =>
              id !== undefined
          )
      );

    /*
     * Attendance
     */
    this.attendance =
      this.attendance.filter(record =>

        (
          record.student?.id !== undefined &&
          studentIds.has(
            record.student.id
          )
        )

        ||

        (
          record.classRoom?.id !== undefined &&
          classIds.has(
            record.classRoom.id
          )
        )
      );

    /*
     * Fees
     */
    this.fees =
      this.fees.filter(record =>

        record.student?.id !== undefined &&
        studentIds.has(
          record.student.id
        )
      );

    /*
     * Marks
     */
    this.marks =
      this.marks.filter(record =>

        (
          record.student?.id !== undefined &&
          studentIds.has(
            record.student.id
          )
        )

        ||

        (
          record.classRoom?.id !== undefined &&
          classIds.has(
            record.classRoom.id
          )
        )
      );
  }

  /*
   * ============================================================
   * REQUEST STATUS
   * ============================================================
   */

  private requestDone(): void {

    this.requestsCompleted++;

    /*
     * As soon as ANY fresh data arrives,
     * dashboard is already usable.
     */
    this.loading = false;

    this.calculateDashboard();

    this.cdr.detectChanges();

    /*
     * After all requests finish,
     * save the complete fresh snapshot.
     */
    if (
      this.requestsCompleted +
      this.requestsFailed >= 6
    ) {

      this.saveCache();

      this.loading = false;

      this.cdr.detectChanges();
    }
  }

  private requestFailed(): void {

    this.requestsFailed++;

    /*
     * Do not destroy cached/old data.
     */
    this.loading = false;

    /*
     * Only show an error when
     * absolutely nothing is available.
     */
    const noData =
      this.students.length === 0 &&
      this.classes.length === 0 &&
      this.teachers.length === 0;

    if (
      noData &&
      this.requestsCompleted +
        this.requestsFailed >= 6
    ) {

      this.errorMessage =
        'Unable to connect to the management server.';
    }

    this.cdr.detectChanges();
  }

  /*
   * ============================================================
   * DASHBOARD CALCULATIONS
   * ============================================================
   */

  private calculateDashboard(): void {

    this.calculateTodayAttendance();

    this.calculateFees();

    this.calculateMarks();
  }

  private calculateTodayAttendance(): void {

    const todayRecords =
      this.attendance.filter(
        record =>
          this.normalizeDate(
            record.date
          ) === this.today
      );

    this.todayMarked =
      todayRecords.length;

    this.presentCount =
      todayRecords.filter(
        record =>
          record.status === 'PRESENT'
      ).length;

    this.absentCount =
      todayRecords.filter(
        record =>
          record.status === 'ABSENT'
      ).length;

    this.lateCount =
      todayRecords.filter(
        record =>
          record.status === 'LATE'
      ).length;

    this.excusedCount =
      todayRecords.filter(
        record =>
          record.status === 'EXCUSED'
      ).length;

    const countedAttendance =
      this.presentCount +
      this.lateCount;

    this.attendancePercentage =
      this.todayMarked > 0
        ? Math.round(
            (
              countedAttendance /
              this.todayMarked
            ) * 100
          )
        : 0;

    this.i1Attendance =
      this.sectionAttendance(
        'I1',
        todayRecords
      );

    this.i2Attendance =
      this.sectionAttendance(
        'I2',
        todayRecords
      );

    const grouped =
      new Map<string, Attendance[]>();

    todayRecords.forEach(record => {

      const subject =
        (
          record.subject ||
          'General'
        )
          .trim()
          .toUpperCase();

      if (!grouped.has(subject)) {

        grouped.set(
          subject,
          []
        );
      }

      grouped
        .get(subject)!
        .push(record);
    });

    this.subjectStats =
      Array
        .from(grouped.entries())
        .map(
          ([subject, records]) => {

            const attended =
              records.filter(
                record =>
                  record.status ===
                    'PRESENT' ||

                  record.status ===
                    'LATE'
              ).length;

            return {

              subject,

              marked:
                records.length,

              percentage:
                records.length
                  ? Math.round(
                      (
                        attended /
                        records.length
                      ) * 100
                    )
                  : 0
            };
          }
        )
        .sort(
          (a, b) =>
            b.percentage -
            a.percentage
        )
        .slice(0, 5);
  }

  private sectionAttendance(
    section: string,
    records: Attendance[]
  ): number {

    const sectionRecords =
      records.filter(record => {

        const recordSection =
          record.student?.classRoom?.section ??
          record.classRoom?.section;

        return (
          recordSection === section
        );
      });

    if (
      !sectionRecords.length
    ) {
      return 0;
    }

    const attended =
      sectionRecords.filter(
        record =>
          record.status ===
            'PRESENT' ||

          record.status ===
            'LATE'
      ).length;

    return Math.round(
      (
        attended /
        sectionRecords.length
      ) * 100
    );
  }

  private calculateFees(): void {

    this.paidAmount =
      this.fees
        .filter(
          fee =>
            fee.status === 'PAID'
        )
        .reduce(
          (sum, fee) =>
            sum +
            Number(
              fee.amount || 0
            ),
          0
        );

    this.pendingAmount =
      this.fees
        .filter(
          fee =>
            fee.status === 'PENDING'
        )
        .reduce(
          (sum, fee) =>
            sum +
            Number(
              fee.amount || 0
            ),
          0
        );

    this.overdueAmount =
      this.fees
        .filter(
          fee =>
            fee.status === 'OVERDUE'
        )
        .reduce(
          (sum, fee) =>
            sum +
            Number(
              fee.amount || 0
            ),
          0
        );

    const totalCollectable =
      this.paidAmount +
      this.pendingAmount +
      this.overdueAmount;

    this.feeProgress =
      totalCollectable
        ? Math.round(
            (
              this.paidAmount /
              totalCollectable
            ) * 100
          )
        : 0;
  }

  private calculateMarks(): void {

    const validMarks =
      this.marks.filter(
        mark =>
          mark.totalMarks > 0 &&
          mark.marksObtained !== null &&
          mark.marksObtained !== undefined
      );

    if (!validMarks.length) {

      this.averagePercentage =
        0;

      return;
    }

    const total =
      validMarks.reduce(
        (sum, mark) =>

          sum +
          (
            Number(
              mark.marksObtained
            ) /
            Number(
              mark.totalMarks
            )
          ) *
          100,

        0
      );

    this.averagePercentage =
      total /
      validMarks.length;
  }

  private normalizeDate(
    value: string
  ): string {

    return String(
      value || ''
    ).slice(0, 10);
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  refreshDashboard(): void {

    this.refreshInBackground();
  }

  open(path: string): void {

    if (
      typeof window !== 'undefined'
    ) {

      window.location.href =
        path;
    }
  }

  get formattedPaid(): string {

    return this.currency(
      this.paidAmount
    );
  }

  get formattedPending(): string {

    return this.currency(
      this.pendingAmount
    );
  }

  get formattedOverdue(): string {

    return this.currency(
      this.overdueAmount
    );
  }

  private currency(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }
    ).format(value);
  }
}