import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassForm } from './class-form.component';

describe('ClassForm', () => {
  let component: ClassForm;
  let fixture: ComponentFixture<ClassForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
