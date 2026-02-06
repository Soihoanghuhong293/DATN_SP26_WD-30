export type GuideGroupType = 'domestic' | 'international' | 'specialized_line' | 'group_specialist';
export type HealthStatus = 'healthy' | 'sick' | 'on_leave' | 'retired';

export interface ICertificate {
  name: string;
  issueDate: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface IExperience {
  years: number;
  specialization?: string;
  description?: string;
}

export interface ITourHistory {
  tourId?: string;
  tourName: string;
  startDate: string;
  endDate: string;
  groupSize?: number;
}

export interface IReview {
  score: number;
  comment?: string;
  date: string;
  reviewedBy?: string;
}

export interface IRating {
  average: number;
  totalReviews: number;
  reviews: IReview[];
}

export interface IGuide {
  id: string;
  _id?: string;

  user_id?: string;
  name: string;
  birtdate: string;
  avatar?: string;
  phone: string;
  email?: string;
  address?: string;
  identityCard?: string;

  certificate: ICertificate[];
  languages: string[];
  experience: IExperience;
  history: ITourHistory[];
  rating: IRating;

  group_type: GuideGroupType;
  health_status: HealthStatus;

  created_at: string;
  update_at: string;
}

export interface IGuideCreateRequest {
  user_id?: string;
  name: string;
  birtdate: string;
  avatar?: string;
  phone: string;
  email?: string;
  address?: string;
  identityCard?: string;
  certificate?: ICertificate[];
  languages?: string[];
  experience: IExperience;
  group_type?: GuideGroupType;
  health_status?: HealthStatus;
}

export interface IGuideUpdateRequest {
  name?: string;
  birtdate?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  address?: string;
  identityCard?: string;
  certificate?: ICertificate[];
  languages?: string[];
  experience?: IExperience;
  group_type?: GuideGroupType;
  health_status?: HealthStatus;
}

export interface IGuideRatingRequest {
  score: number;
  comment?: string;
  reviewedBy?: string;
}

export interface ITourHistoryRequest {
  tourId?: string;
  tourName: string;
  startDate: string;
  endDate: string;
  groupSize?: number;
}
