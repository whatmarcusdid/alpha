import { ClientHomePreviewShell } from '@/components/preview/ClientHomePreviewShell';

export default function ClientHomeEmptyPreviewPage() {
  return (
    <ClientHomePreviewShell
      state="empty"
      designQuestion="No active fix — empty state for the client dashboard center column."
    />
  );
}
