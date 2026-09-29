import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeList } from './fee-list.component';

describe('FeeList', () => {
  let component: FeeList;
  let fixture: ComponentFixture<FeeList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeList],
    }).compileComponents();

    fixture = TestBed.createComponent(FeeList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
