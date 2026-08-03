import type { AppUser, SalesRep } from '@/lib/types';

export function getSalesRepDisplayName(
  salesRepId: string | undefined,
  salesReps?: Array<{ sales_rep_id: string; name?: string }> ,
  currentName?: string,
) {
  if (currentName) {
    return currentName;
  }

  if (!salesRepId) {
    return 'Unassigned';
  }

  const salesRep = Array.isArray(salesReps)
    ? salesReps.find((rep) => rep.sales_rep_id === salesRepId)
    : undefined;

  return salesRep?.name || salesRepId;
}

export function getUserDisplayName(userId: string | undefined, users?: AppUser[]) {
  if (!userId) {
    return 'N/A';
  }

  const user = Array.isArray(users)
    ? users.find((userRecord) => userRecord.user_id === userId)
    : undefined;

  return user?.name || user?.username || userId;
}
