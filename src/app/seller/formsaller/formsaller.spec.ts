import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Formsaller } from './formsaller';

describe('Formsaller', () => {
  let component: Formsaller;
  let fixture: ComponentFixture<Formsaller>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Formsaller],
    }).compileComponents();

    fixture = TestBed.createComponent(Formsaller);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
