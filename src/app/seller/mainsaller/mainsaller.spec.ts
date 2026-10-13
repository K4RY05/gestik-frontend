import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mainsaller } from './mainsaller';

describe('Mainsaller', () => {
  let component: Mainsaller;
  let fixture: ComponentFixture<Mainsaller>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mainsaller],
    }).compileComponents();

    fixture = TestBed.createComponent(Mainsaller);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
