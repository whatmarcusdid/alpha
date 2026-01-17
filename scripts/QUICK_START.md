# Test Support Tickets Script - Quick Start Guide

## What Was Created

✅ **Script File**: `/scripts/create-test-tickets.ts`  
✅ **Documentation**: `/scripts/README.md`  
✅ **Package.json Updated**: Added `tsx` dependency and npm script

## How to Use

### Step 1: Install Dependencies
```bash
npm install
```

This will install `tsx` which allows us to run TypeScript files directly.

### Step 2: Get Your User ID

**Option A - Browser Console (easiest):**
1. Open your dashboard in the browser
2. Open Developer Tools (F12 or right-click → Inspect)
3. Go to Console tab
4. Type: `localStorage.getItem('userId')` (or check your auth context)

**Option B - Firebase Console:**
1. Go to Firebase Console → Authentication
2. Find your user in the Users list
3. Copy the User UID

### Step 3: Run the Script

```bash
npm run create-test-tickets YOUR_USER_ID_HERE
```

**Example:**
```bash
npm run create-test-tickets abc123xyz456def789
```

### What Gets Created

The script creates **2 test tickets** in your Firestore database:

#### 1. Active Ticket
- **Title**: "Plugin update causing site slowdown"
- **Status**: In Progress
- **Priority**: High
- **Category**: Bug Report
- **Assigned to**: Sarah M.
- **Shows in**: Active Tickets section on Support Hub

#### 2. Past Ticket
- **Title**: "Cannot update billing address"
- **Status**: Resolved
- **Priority**: Medium
- **Category**: Updates
- **Created**: 2 days ago
- **Assigned to**: Sarah M.
- **Jira Key**: TSG-1033
- **Shows in**: Past Support Tickets table

### Expected Output

```
🚀 Creating test support tickets...
📝 User ID: abc123xyz456def789

✅ Active ticket created: XyZ1aBc2DeF3
✅ Past ticket created: QwE4rTy5UiO6

✅ All test tickets created successfully!

Created tickets:
  - Active: XyZ1aBc2DeF3
  - Past: QwE4rTy5UiO6

👉 Go to your Support Hub to see them!
```

## Troubleshooting

### "Firebase Admin not initialized"
- Check your `.env.local` file has these variables:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- Make sure the values are correct and properly formatted

### "Command not found: tsx"
- Run `npm install` to install all dependencies
- Try using `npx tsx scripts/create-test-tickets.ts YOUR_USER_ID` instead

### "Permission denied"
- The script uses Firebase Admin SDK which has full access
- Check your Firestore rules if you see permission errors
- Ensure the service account has proper permissions

## Technical Details

### Script Location
```
scripts/
  ├── create-test-tickets.ts   (Main script)
  └── README.md                (Detailed documentation)
```

### How It Works
1. Imports Firebase Admin SDK (server-side, full permissions)
2. Accepts user ID as command line argument
3. Creates two documents in the `supportTickets` collection
4. Uses `admin.firestore.FieldValue.serverTimestamp()` for timestamps
5. Sets past ticket's `createdAt` to 2 days ago
6. Updates each document with its own Firestore document ID as `ticketId`

### TypeScript & Imports
- Uses path aliases (`@/lib/firebase/admin`)
- Imports types from `@/types/support`
- TypeScript is compiled on-the-fly by `tsx`
- No build step required

## Next Steps

After running the script:
1. Open your TradeSiteGenie Dashboard
2. Navigate to **Support Hub**
3. You should see:
   - 1 active ticket in the "Active Tickets" section
   - 1 past ticket in the "Past Support Tickets" tab

You can now test the Support Hub UI with real data! 🎉
