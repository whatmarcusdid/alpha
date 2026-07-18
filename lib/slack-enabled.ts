/**
 * MVP gate for Slack notifications.
 *
 * Slack is off by default. Set SLACK_NOTIFICATIONS_ENABLED=true in Vercel
 * when the team is ready to turn alerts back on.
 */
export function isSlackNotificationsEnabled(): boolean {
  return process.env.SLACK_NOTIFICATIONS_ENABLED === 'true';
}
