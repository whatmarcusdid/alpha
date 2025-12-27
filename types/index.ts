export interface Site {
  id: string;
  userId: string;
  name: string;
  url: string;
  type: 'website' | 'landing_page';
  status: 'active' | 'provisioning' | 'error';
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
