import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Maininstaler } from './maininstaler';

describe('Maininstaler', () => {
  let component: Maininstaler;
  let fixture: ComponentFixture<Maininstaler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Maininstaler],
    }).compileComponents();

    fixture = TestBed.createComponent(Maininstaler);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
