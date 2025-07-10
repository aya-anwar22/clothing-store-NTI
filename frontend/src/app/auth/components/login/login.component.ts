import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { LoginData } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginMethod: 'email' | 'phone' = 'email';

  loginForm = new FormGroup({
    email: new FormControl(''),
    phoneNumber: new FormControl(''),
    password: new FormControl('', [Validators.required])
  });

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.updateValidators();
  }

  setLoginMethodFromEvent(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.loginMethod = value as 'email' | 'phone';
    this.updateValidators();
  }

  updateValidators() {
    if (this.loginMethod === 'email') {
      this.loginForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.loginForm.get('phoneNumber')?.clearValidators();
    } else {
      this.loginForm.get('phoneNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^01[0-2,5]{1}[0-9]{8}$/)
      ]);
      this.loginForm.get('email')?.clearValidators();
    }

    this.loginForm.get('email')?.updateValueAndValidity();
    this.loginForm.get('phoneNumber')?.updateValueAndValidity();
  }

onSubmit() {
  if (this.loginForm.valid) {
    const data: LoginData = {
      password: this.loginForm.value.password!,
      ...(this.loginMethod === 'email'
        ? { email: this.loginForm.value.email! }
        : { phoneNumber: this.loginForm.value.phoneNumber! })
    };

    this.authService.login(data).subscribe({
      next: (res) => {
        console.log('Login success:', res);

        const accessToken = res.accessToken;
        const refreshToken = res.refreshToken;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        const role = this.authService.getRole();

        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error('Login error:', err);
      }
    });
  } else {
    this.loginForm.markAllAsTouched();
  }
}


  signUpWithGoogle() {
    window.location.href = 'http://localhost:3000/v1/auth/google';
  }
}
