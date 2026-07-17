import { redirect } from 'next/navigation';

export default function CreateFixJobRedirectPage() {
  redirect('/admin?create=1');
}
