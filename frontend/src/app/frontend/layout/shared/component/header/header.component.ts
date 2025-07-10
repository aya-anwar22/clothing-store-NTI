import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  standalone: true,  
  imports: [CommonModule],
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  userName: string | null = null;
  private subscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.subscription = this.authService.user$.subscribe(user => {
      this.userName = user ? user.userName : null;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
