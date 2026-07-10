import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { SignInForm } from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <AuthPageLayout>
      <SignInForm />
    </AuthPageLayout>
  );
}
