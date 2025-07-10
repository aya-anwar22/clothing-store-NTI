import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { passwordMatchValidator } from '../../validators/password-match.validator';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { SignupData } from '../../../core/models/auth.model';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit {
  signUpForm = new FormGroup({
    registerMethod: new FormControl('email'),
    email: new FormControl('', []),
    phoneNumber: new FormControl('', []),
    userName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: passwordMatchValidator });

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.signUpForm.get('registerMethod')?.valueChanges.subscribe(method => {
      this.updateMethodValidators(method as string);
    });

    this.updateMethodValidators(this.signUpForm.get('registerMethod')?.value || 'email');
  }

  updateMethodValidators(method: string) {
    if (method === 'email') {
      this.signUpForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.signUpForm.get('phoneNumber')?.clearValidators();
      this.signUpForm.get('phoneNumber')?.setValue('');
    } else {
      this.signUpForm.get('phoneNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^01[0-2,5]{1}[0-9]{8}$/)
      ]);
      this.signUpForm.get('email')?.clearValidators();
      this.signUpForm.get('email')?.setValue('');
    }

    this.signUpForm.get('email')?.updateValueAndValidity();
    this.signUpForm.get('phoneNumber')?.updateValueAndValidity();
  }




  signUpWithGoogle() {
    window.location.href = 'http://localhost:3000/v1/auth/google';
  }
  onSubmit() {
    if (this.signUpForm.valid) {
      const formValue = this.signUpForm.value;

      const data: SignupData = {
        userName: formValue.userName!,
        password: formValue.password!,
        confirmPassword: formValue.confirmPassword!,
        ...(formValue.registerMethod === 'email'
          ? { email: formValue.email! }
          : { phoneNumber: formValue.phoneNumber! })
      };

      this.authService.signup(data).subscribe({
        next: res => {
          console.log('Signup success:', res);
          if (formValue.registerMethod === 'phone') {
            this.router.navigate(['/login']);
          } else {
            this.router.navigate(['/verify-email']);
          }
        },
        error: err => {
          console.error('Signup error:', err);
        }
      });
    } else {
      this.signUpForm.markAllAsTouched();
    }
  }
}
