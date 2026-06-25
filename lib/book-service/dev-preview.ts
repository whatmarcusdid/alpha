export function isDevPreviewEnabled(searchParams: URLSearchParams): boolean {
  return (
    process.env.NODE_ENV === 'development' && searchParams.get('preview') === '1'
  );
}

export type ConfirmDetailsPreviewForm = {
  businessName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
};

export const SAMPLE_CONFIRM_DETAILS_ORDER_ID = 'BS-284719';

export const SAMPLE_CONFIRM_DETAILS_FORM: ConfirmDetailsPreviewForm = {
  businessName: 'Bright Path Pressure Washing',
  websiteUrl: 'brightpathpw.com',
  contactName: 'Jake',
  contactEmail: 'jake@brightpathpw.com',
};

export type AccessPreviewForm = {
  accessMethod: 'WordPress login' | 'Hosting panel login' | 'Other' | '';
  loginUrl: string;
  username: string;
  password: string;
  hostingProvider: string;
  notes: string;
  confirmed: boolean;
};

export const SAMPLE_ACCESS_FORM: AccessPreviewForm = {
  accessMethod: '',
  loginUrl: 'brightpathpw.com/wp-admin',
  username: 'jake_brightpath',
  password: 'sample-password',
  hostingProvider: '',
  notes: '',
  confirmed: false,
};
