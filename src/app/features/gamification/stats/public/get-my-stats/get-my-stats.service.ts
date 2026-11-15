import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { ExerciseType } from '../../../../../core/api/enums';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { ShellStats } from '../../../../../core/layout/app-shell.models';

/** Swagger: GET /api/stats/me/activity → GetMyActivityResponse */
export interface ActivityResponse {
  from: string;
  to: string;
  activeDays: number;
  totalXp: number;
  totalReviews: number;
  days: { date: string; newWords: number; reviews: number; xp: number; minutesSpent: number }[];
}

/** Swagger: GET /api/stats/me/accuracy → GetMyAccuracyResponse */
export interface AccuracyResponse {
  totalAnswers: number;
  correctAnswers: number;
  accuracyPercent: number;
  byExercise: { exerciseType: ExerciseType; total: number; correct: number; accuracyPercent: number }[];
}

/** Swagger: GET /api/achievements/me → GetMyAchievementsResponse */
export interface MyAchievements {
  earnedCount: number;
  totalCount: number;
  items: {
    id: number;
    code: string;
    title: string;
    description: string | null;
    iconUrl: string | null;
    xpReward: number;
    conditionType: string;
    conditionValue: number;
    progress: number;
    isEarned: boolean;
    earnedAt: string | null;
  }[];
}

@Injectable({ providedIn: 'root' })
export class GetMyStatsService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  stats(): Observable<ShellStats> {
    return this.http.get<ShellStats>(apiUrl('/stats/me'), { context: this.quiet });
  }

  activity(days: number): Observable<ActivityResponse> {
    return this.http.get<ActivityResponse>(apiUrl('/stats/me/activity'), { params: { days }, context: this.quiet });
  }

  /** days = null — butun davr. */
  accuracy(days: number | null): Observable<AccuracyResponse> {
    const params = days ? new HttpParams().set('days', days) : undefined;
    return this.http.get<AccuracyResponse>(apiUrl('/stats/me/accuracy'), { params, context: this.quiet });
  }

  achievements(): Observable<MyAchievements> {
    return this.http.get<MyAchievements>(apiUrl('/achievements/me'), { context: this.quiet });
  }
}
