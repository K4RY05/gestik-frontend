import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormSellerPdf } from './form-seller-pdf';

describe('FormSellerPdf', () => {
  let component: FormSellerPdf;
  let fixture: ComponentFixture<FormSellerPdf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSellerPdf],
    }).compileComponents();

    fixture = TestBed.createComponent(FormSellerPdf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
