# Support Tickets Refactoring - customerId to userId

## Summary
Refactored all support ticket references from `customerId` to `userId` for consistency with the rest of the codebase.

## Files Changed

### 1. `/types/support.ts`
**Changes:**
- `SupportTicket` interface: Changed `customerId: string` → `userId: string` (line 87)
- `CreateTicketInput` interface: Changed `customerId: string` → `userId: string` (line 139)
- `TicketFilters` interface: Changed `customerId?: string` → `userId?: string` (line 204)

### 2. `/lib/firestore/support.ts`
**Changes:**
- `convertTicketData()` function: Changed `customerId: data.customerId` → `userId: data.userId` (line 82)
- `createSupportTicket()` function: Changed `customerId: input.customerId` → `userId: input.userId` (line 131)
- `getActiveTickets()` function:
  - JSDoc comment: Changed "customer" → "user" (line 179)
  - Firestore where clause: `where('customerId', '==', customerId)` → `where('userId', '==', userId)` (line 194)
  - Console log: "customer" → "user" (line 207)
- `getPastTickets()` function:
  - JSDoc comment: Changed "customer" → "user" (line 216)
  - Firestore where clause: `where('customerId', '==', customerId)` → `where('userId', '==', userId)` (line 231)
  - Console log: "customer" → "user" (line 244)

### 3. `/scripts/create-test-tickets.ts`
**Changes:**
- `createActiveTicket()` function:
  - Parameter name in signature: `customerId` → `userId` (line 8)
  - Field in data object: `customerId: customerId` → `userId: userId` (line 15)
  - Field in data object: `createdByUserId: customerId` → `createdByUserId: userId` (line 16)
- `createPastTicket()` function:
  - Parameter name in signature: `customerId` → `userId` (line 59)
  - Field in data object: `customerId: customerId` → `userId: userId` (line 70)
  - Field in data object: `createdByUserId: customerId` → `createdByUserId: userId` (line 71)
- `main()` function:
  - Console log: "Customer ID:" → "User ID:" (line 125)

### 4. `/scripts/QUICK_START.md`
**Changes:**
- Expected output section: Changed "Customer ID:" → "User ID:" in example output

## Database Migration Required

⚠️ **IMPORTANT**: This refactoring changes the field name in Firestore documents from `customerId` to `userId`.

### Migration Options:

#### Option 1: Database Migration Script (Recommended for Production)
Create a migration script to update all existing documents:

```typescript
// scripts/migrate-customerId-to-userId.ts
import { adminDb } from '@/lib/firebase/admin';

async function migrateFields() {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const ticketsRef = adminDb.collection('supportTickets');
  const snapshot = await ticketsRef.get();
  
  const batch = adminDb.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.customerId && !data.userId) {
      batch.update(doc.ref, {
        userId: data.customerId,
        customerId: adminDb.FieldValue.delete()
      });
      count++;
    }
  });
  
  await batch.commit();
  console.log(`✅ Migrated ${count} documents`);
}

migrateFields();
```

#### Option 2: Manual Update (for Development/Testing)
Since you're in development, you can:
1. Delete existing test tickets
2. Run the updated `create-test-tickets.ts` script to create new tickets with the correct field name

## Testing Checklist

- [ ] Run `npm run create-test-tickets YOUR_USER_ID` to create test tickets
- [ ] Verify tickets appear in Support Hub dashboard
- [ ] Check Active Tickets section displays correctly
- [ ] Check Past Support Tickets table displays correctly
- [ ] Verify Firestore documents have `userId` field (not `customerId`)
- [ ] Test creating new tickets through the support form
- [ ] Ensure no TypeScript errors in the codebase

## Benefits of This Change

1. **Consistency**: All entities now use `userId` consistently across the codebase
2. **Clarity**: The term "user" is more accurate than "customer" for the authenticated user
3. **Maintainability**: Reduces confusion when working with different parts of the system
4. **Type Safety**: TypeScript will catch any remaining references to the old field name

## Backwards Compatibility

⚠️ This is a **breaking change** for existing Firestore data. All existing documents with `customerId` will need to be migrated to use `userId` instead.

If you need to support both field names temporarily during migration, you can update the `convertTicketData()` function:

```typescript
function convertTicketData(ticketId: string, data: any): SupportTicket {
  return {
    ticketId,
    userId: data.userId || data.customerId, // Support both fields during migration
    createdByUserId: data.createdByUserId,
    // ... rest of fields
  };
}
```
