import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiRecord } from '../../core/models/api.models';
import { ResourceDataService } from '../../core/services/resource-data.service';
import { RouterLink } from '@angular/router';

interface Snapshot {
  key: string;
  label: string;
  path: string;
  count: number | null;
  tone: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  loading = true;
  snapshots: Snapshot[] = [
    { key: 'orders', label: 'Orders', path: '/orders', count: null, tone: 'teal' },
    { key: 'medicines', label: 'Medicines', path: '/medicines', count: null, tone: 'blue' },
    { key: 'inventory', label: 'Inventory records', path: '/inventory', count: null, tone: 'coral' },
    { key: 'customers', label: 'Customers', path: '/customers', count: null, tone: 'gold' },
    { key: 'prescriptions', label: 'Prescriptions', path: '/prescriptions', count: null, tone: 'green' },
    { key: 'support-requests', label: 'Support requests', path: '/support-requests', count: null, tone: 'ink' },
  ];
  errorMessage = '';
  updatedAt: Date | null = null;

  constructor(private readonly data: ResourceDataService) {}

  ngOnInit(): void {
    const requests = this.snapshots.map(snapshot =>
      this.data.list(snapshot.key).pipe(catchError(() => of(null))),
    );

    forkJoin(requests).subscribe(results => {
      this.snapshots = this.snapshots.map((snapshot, index) => ({
        ...snapshot,
        count: Array.isArray(results[index]) ? (results[index] as ApiRecord[]).length : null,
      }));
      this.loading = false;
      this.updatedAt = new Date();
      if (this.snapshots.every(snapshot => snapshot.count === null)) {
        this.errorMessage = 'Dashboard summaries are unavailable. Check the backend connection.';
      }
    });
  }

  get availableCount(): number {
    return this.snapshots.filter(snapshot => snapshot.count !== null).length;
  }

  get totalRecords(): number {
    return this.snapshots.reduce((total, snapshot) => total + (snapshot.count ?? 0), 0);
  }
}