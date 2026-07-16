import { redirect } from 'next/navigation';

/**
 * Subscription signup disabled (Phase 1).
 * Site Fix signup uses /book-service/signup — unaffected.
 */
export default function SignUpPage() {
  redirect('/');
}
