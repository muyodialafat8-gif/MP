export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  displayName?: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  joinedAt: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  videoUrl: string;
  trailerUrl?: string;
  subtitleUrl?: string;
  rating: number;
  ratingCount: number;
  views: number;
  releaseYear: number;
  duration: string;
  quality: string;
  isPremium: boolean;
  genres: string[];
  isAdult?: boolean;
  trendingBadge?: string; // e.g. "#1 in Uganda", "Hot Today"
  vj?: string; // Video Joker / Movie Translator
  createdAt: string;
}

export interface TVSeries {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  releaseYear: number;
  genres: string[];
  isPremium: boolean;
  trendingBadge?: string;
  vj?: string; // Video Joker / Movie Translator
  createdAt: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  thumbnailUrl: string;
  views: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planName: string;
  price: number;
  expiresAt: string;
  status: 'active' | 'expired';
  createdAt: string;
}

export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'episode';
  progress: number; // in seconds
  duration: number; // total duration
  updatedAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'series';
  createdAt: string;
}

export interface MovieAd {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  position: 'homepage_banner' | 'movie_page_banner' | 'pre_roll';
  isActive: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  userScope: string; // 'all' or actual userId
  isRead: boolean;
  createdAt: string;
}

export interface HomepageConfig {
  welcomeMessage: string;
  heroMovieId?: string; // References a Movie ID
  heroType?: 'movie' | 'series';
  featuredAdsEnabled: boolean;
}

export type PageRoute =
  | 'home'
  | 'movie'
  | 'series'
  | 'watch'
  | 'search'
  | 'trending'
  | 'subscription'
  | 'account'
  | 'login'
  | 'register'
  | 'watchlist'
  | 'downloads'
  | 'notifications'
  | 'settings'
  | 'admin'
  | 'adult'
  | 'privacy'
  | 'terms';
