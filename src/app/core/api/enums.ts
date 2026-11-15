/**
 * Backend enumlari. Swagger ularni PascalCase ("Admin") ko'rsatadi, lekin backend
 * JSON'ni JsonStringEnumConverter(SnakeCaseLower) bilan yozadi va o'qiydi, shuning
 * uchun haqiqiy qiymatlar snake_case: "admin", "multiple_choice", "friend_request".
 */
export type UserRole = 'user' | 'editor' | 'admin';
export type OAuthProvider = 'google' | 'telegram' | 'apple' | 'github';
export type CefrLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'phrase'
  | 'idiom';
export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type ExerciseType =
  | 'flashcard'
  | 'multiple_choice'
  | 'typing'
  | 'listening'
  | 'fill_blank'
  | 'matching';
export type NotificationType =
  | 'streak_reminder'
  | 'review_due'
  | 'achievement'
  | 'friend_request'
  | 'system';
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type DeckScope = 'all' | 'mine' | 'started' | 'public';
export type ReportStatus = 'open' | 'resolved' | 'rejected';
export type UserStatus = 'active' | 'blocked' | 'deleted';
