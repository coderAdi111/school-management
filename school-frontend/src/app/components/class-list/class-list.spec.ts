import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassList } from './class-list.component';

describe('ClassListComponent', () => {
  let component: ClassList;
  let fixture: ComponentFixture<ClassList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassList],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
