import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppModule } from './app.module';

describe('AppModule', () => {
  let component: AppModule;
  let fixture: ComponentFixture<AppModule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AppModule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
