import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliveryPdf } from './delivery-pdf';

describe('DeliveryPdf', () => {
  let component: DeliveryPdf;
  let fixture: ComponentFixture<DeliveryPdf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryPdf],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryPdf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
