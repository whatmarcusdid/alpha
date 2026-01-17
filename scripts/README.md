# Scripts Directory

Utility scripts for TradeSiteGenie Dashboard development and testing.

## Available Scripts

### `create-test-tickets.ts`

Creates test support tickets in Firestore for development and testing purposes.

**What it creates:**
- 1 **Active ticket** (Status: "In Progress", Priority: "High")
  - Title: "Plugin update causing site slowdown"
  - Assigned to: Sarah M.
  
- 1 **Past ticket** (Status: "Resolved", Priority: "Medium")
  - Title: "Cannot update billing address"
  - Created 2 days ago
  - Assigned to: Sarah M.
  - Jira Key: TSG-1033

**Prerequisites:**
1. Firebase Admin SDK must be configured with environment variables:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

2. Install `tsx` if not already installed:
   ```bash
   npm install
   ```

**Usage:**

First, get your user ID from Firebase Auth:
- Check the browser console while logged in
- Or check the Firebase Console > Authentication

Then run the script:

```bash
# Using npm script (recommended)
npm run create-test-tickets YOUR_USER_ID_HERE

# Or directly with tsx
npx tsx scripts/create-test-tickets.ts YOUR_USER_ID_HERE
```

**Example:**
```bash
npm run create-test-tickets abc123xyz456def789
```

**Output:**
```
🚀 Creating test support tickets...
📝 Customer ID: abc123xyz456def789

✅ Active ticket created: XyZ1aBc2DeF3
✅ Past ticket created: QwE4rTy5UiO6

✅ All test tickets created successfully!

Created tickets:
  - Active: XyZ1aBc2DeF3
  - Past: QwE4rTy5UiO6

👉 Go to your Support Hub to see them!
```

**What happens:**
- Two tickets are created in the `supportTickets` Firestore collection
- Both tickets are associated with the provided user ID
- The active ticket appears in the "Active Tickets" section
- The past ticket appears in the "Past Support Tickets" table
- Both tickets include realistic sample data

**Troubleshooting:**

If you get "Firebase Admin not initialized" error:
- Ensure your `.env.local` file has all required Firebase Admin credentials
- Check that the environment variables are correctly formatted
- Verify your service account has the necessary permissions

If you get "Permission denied" error:
- Check your Firestore security rules
- Ensure the script is running with admin privileges via Firebase Admin SDK
