import { redirect } from 'next/navigation';

export default function CreateFixJobRedirectPage() {
  redirect('/admin/fix-jobs?create=1');
}
