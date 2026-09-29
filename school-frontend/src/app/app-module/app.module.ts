import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from '../components/navbar/navbar.component';
import { StudentListComponent } from '../components/student-list/student-list.component';
import { StudentFormComponent } from '../components/student-form/student-form.component';
import { AttendanceListComponent } from '../components/attendance-list/attendance-list.component';
import { MarkListComponent } from '../components/mark-list/mark-list.component';
import { AppModuleModule } from '../app-module-module';

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AppComponent,
    NavbarComponent,
    StudentListComponent,
    StudentFormComponent,
    AttendanceListComponent,
    MarkListComponent,
    AppModuleModule,
  ],
  providers: [],
})
export class AppModule {}
