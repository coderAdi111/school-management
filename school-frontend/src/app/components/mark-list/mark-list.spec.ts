import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkList } from './mark-list.component';

describe('MarkList', () => {
  let component: MarkList;
  let fixture: ComponentFixture<MarkList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkList],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
