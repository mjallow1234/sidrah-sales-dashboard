export type AppUserRole = 'super_admin' | 'admin' | 'supervisor' | 'agent' | 'delivery' | 'foreman';
export const adminRoles = ['admin', 'super_admin'] as const;

/**
 * Canonical access vocabulary for the future user-permission layer.
 * These definitions describe existing role ceilings only; they are not
 * persisted permissions and are not consulted to grant access today.
 */
export const ACCESS_CATALOG = {
  dashboardView: 'dashboard.view',
  vendorsView: 'vendors.view',
  vendorsCreate: 'vendors.create',
  vendorsEdit: 'vendors.edit',
  vendorsAssign: 'vendors.assign',
  deliveriesView: 'deliveries.view',
  deliveriesCreate: 'deliveries.create',
  deliveriesClaim: 'deliveries.claim',
  deliveriesAssign: 'deliveries.assign',
  deliveriesReassign: 'deliveries.reassign',
  deliveriesDeliver: 'deliveries.deliver',
  deliveriesCancel: 'deliveries.cancel',
  factoryView: 'factory.view',
  factoryProductionCreate: 'factory.production.create',
  factoryMovementsCreate: 'factory.movements.create',
  factoryRecordsReverse: 'factory.records.reverse',
  factoryExpensesManage: 'factory.expenses.manage',
  crmView: 'crm.view',
  crmCreate: 'crm.create',
  crmEdit: 'crm.edit',
  crmStatusChange: 'crm.status.change',
  crmFollowUpManage: 'crm.follow_up.manage',
  crmAssign: 'crm.assign',
  outletsView: 'outlets.view',
  outletsManage: 'outlets.manage',
  outletsSalesRecord: 'outlets.sales.record',
  outletsStockReceive: 'outlets.stock.receive',
  accountabilityView: 'accountability.view',
  accountabilityAssign: 'accountability.assign',
  accountabilityCollectionsManage: 'accountability.collections.manage',
  accountabilityHandoversManage: 'accountability.handovers.manage',
  usersView: 'users.view',
  usersCreate: 'users.create',
  usersEdit: 'users.edit',
  usersAssignPermissions: 'users.assign_permissions',
  reportsView: 'reports.view',
  reportsExport: 'reports.export',
  productsView: 'products.view',
  productsManage: 'products.manage',
  visitsView: 'visits.view',
  visitsCreate: 'visits.create',
  visitsReverse: 'visits.reverse',
  formsManage: 'forms.manage',
  formsPublish: 'forms.publish',
} as const;

export type AccessKey = (typeof ACCESS_CATALOG)[keyof typeof ACCESS_CATALOG];

const ACCESS_KEYS = new Set<string>(Object.values(ACCESS_CATALOG));

export function isAccessKey(value: string): value is AccessKey {
  return ACCESS_KEYS.has(value);
}

/** Existing role ceiling, expressed as a reusable definition for later phases. */
export const ROLE_CEILING: Readonly<Record<AppUserRole, readonly AccessKey[]>> = {
  super_admin: Object.values(ACCESS_CATALOG),
  admin: Object.values(ACCESS_CATALOG),
  supervisor: [
    ACCESS_CATALOG.dashboardView,
    ACCESS_CATALOG.vendorsView,
    ACCESS_CATALOG.vendorsCreate,
    ACCESS_CATALOG.vendorsEdit,
    ACCESS_CATALOG.vendorsAssign,
    ACCESS_CATALOG.deliveriesView,
    ACCESS_CATALOG.deliveriesCreate,
    ACCESS_CATALOG.deliveriesAssign,
    ACCESS_CATALOG.deliveriesReassign,
    ACCESS_CATALOG.deliveriesDeliver,
    ACCESS_CATALOG.deliveriesCancel,
    ACCESS_CATALOG.crmView,
    ACCESS_CATALOG.crmCreate,
    ACCESS_CATALOG.crmEdit,
    ACCESS_CATALOG.crmStatusChange,
    ACCESS_CATALOG.crmFollowUpManage,
    ACCESS_CATALOG.crmAssign,
    ACCESS_CATALOG.accountabilityView,
    ACCESS_CATALOG.accountabilityAssign,
    ACCESS_CATALOG.accountabilityCollectionsManage,
    ACCESS_CATALOG.accountabilityHandoversManage,
    ACCESS_CATALOG.reportsView,
    ACCESS_CATALOG.reportsExport,
    ACCESS_CATALOG.productsView,
    ACCESS_CATALOG.productsManage,
    ACCESS_CATALOG.visitsView,
    ACCESS_CATALOG.visitsCreate,
    ACCESS_CATALOG.visitsReverse,
  ],
  agent: [
    ACCESS_CATALOG.dashboardView,
    ACCESS_CATALOG.vendorsView,
    ACCESS_CATALOG.vendorsCreate,
    ACCESS_CATALOG.deliveriesView,
    ACCESS_CATALOG.deliveriesCreate,
    ACCESS_CATALOG.deliveriesClaim,
    ACCESS_CATALOG.crmView,
    ACCESS_CATALOG.crmCreate,
    ACCESS_CATALOG.crmEdit,
    ACCESS_CATALOG.crmStatusChange,
    ACCESS_CATALOG.crmFollowUpManage,
    ACCESS_CATALOG.visitsView,
    ACCESS_CATALOG.visitsCreate,
  ],
  delivery: [ACCESS_CATALOG.deliveriesView, ACCESS_CATALOG.deliveriesClaim],
  foreman: [ACCESS_CATALOG.factoryView, ACCESS_CATALOG.factoryProductionCreate, ACCESS_CATALOG.productsView],
};

export function roleAllowsAccess(role: string | undefined, access: AccessKey): boolean {
  return !!role && (ROLE_CEILING[role as AppUserRole] ?? []).includes(access);
}

export function isAdminRole(role?: string): role is AppUserRole {
  return role === 'admin' || role === 'super_admin';
}

export function isSupervisorRole(role?: string): role is AppUserRole {
  return role === 'supervisor';
}

export function isDeliveryRole(role?: string): role is AppUserRole {
  return role === 'delivery';
}

export function canRecordDeliveryPayment(role?: string): boolean {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return normalized === 'delivery' || normalized === 'admin' || normalized === 'supervisor' || normalized === 'super_admin';
}

export function isAdminOrSupervisorRole(role?: string): role is AppUserRole {
  return isAdminRole(role) || isSupervisorRole(role);
}

export function isAgentRole(role?: string): role is AppUserRole {
  return role === 'agent';
}

export function isForemanRole(role?: string): role is AppUserRole {
  return role === 'foreman';
}

export function isFactoryRole(role?: string): role is AppUserRole {
  return role === 'super_admin' || role === 'admin' || isForemanRole(role);
}

export function canReverseFactoryRecords(role?: string): role is AppUserRole {
  return isAdminRole(role);
}

export function isFactoryPath(pathname: string): boolean {
  return pathname === '/factory' || pathname.startsWith('/factory/');
}

export function isFactoryApiPath(pathname: string): boolean {
  return pathname === '/api/factory' || pathname.startsWith('/api/factory/');
}

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  if (!role) {
    return false;
  }

  if (pathname === '/crm' || pathname.startsWith('/crm/')) {
    return isAgentRole(role) || isAdminOrSupervisorRole(role);
  }
  if (pathname === '/forms' || pathname.startsWith('/forms/')) {
    return isAdminRole(role);
  }
  if (pathname === '/outlets' || pathname.startsWith('/outlets/')) {
    return isAdminRole(role);
  }

  if (pathname === '/factory/expenses' || pathname.startsWith('/factory/expenses/')) {
    return isAdminRole(role);
  }

  if (pathname === '/accountability' || pathname.startsWith('/accountability/')) {
    return isAdminOrSupervisorRole(role);
  }

  if (isFactoryPath(pathname)) {
    return isFactoryRole(role);
  }

  if (role === 'foreman') {
    return isFactoryPath(pathname);
  }

  if (role === 'delivery') {
    return pathname === '/deliveries' || (pathname.startsWith('/deliveries/') && pathname !== '/deliveries/new');
  }

  if (pathname.startsWith('/deliveries')) {
    return true;
  }

  if (pathname === '/dashboard' || pathname.startsWith('/visits') || pathname === '/visit/reverse' || pathname === '/admin-stock') {
    return true;
  }

  if (pathname === '/vendors/new') {
    return true;
  }

  if (pathname === '/vendor-types' || pathname.startsWith('/vendor-types/') || pathname === '/acquired-by' || pathname.startsWith('/acquired-by/')) {
    return isAdminRole(role);
  }

  if (pathname === '/vendor-location-requests' || pathname.startsWith('/vendor-location-requests/')) {
    return isAdminRole(role);
  }

  if (pathname === '/delivery-payment-options' || pathname.startsWith('/delivery-payment-options/')) {
    return isAdminRole(role);
  }

  if (pathname.startsWith('/vendors')) {
    return true;
  }

  if (pathname.startsWith('/users')) {
    return isAdminRole(role);
  }

  if (pathname === '/salesreps/new') {
    return isAdminRole(role);
  }

  if (pathname.startsWith('/salesreps')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (pathname.startsWith('/products')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (pathname.startsWith('/reports')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  return true;
}

export function canViewLink(role: string | undefined, href: string): boolean {
  if (!role) {
    return false;
  }

  if (href === '/crm' || href.startsWith('/crm/')) {
    return isAgentRole(role) || isAdminOrSupervisorRole(role);
  }
  if (href === '/forms' || href.startsWith('/forms/')) {
    return isAdminRole(role);
  }
  if (href === '/outlets' || href.startsWith('/outlets/')) {
    return isAdminRole(role);
  }

  if (href === '/factory/expenses' || href.startsWith('/factory/expenses/')) {
    return isAdminRole(role);
  }

  if (href === '/accountability' || href.startsWith('/accountability/')) {
    return isAdminOrSupervisorRole(role);
  }

  if (isFactoryPath(href)) {
    return isFactoryRole(role);
  }

  if (role === 'foreman') {
    return isFactoryPath(href);
  }

  if (role === 'delivery') {
    return href === '/deliveries' || (href.startsWith('/deliveries/') && href !== '/deliveries/new');
  }

  if (href === '/admin-activity') {
    return isAdminOrSupervisorRole(role);
  }

  if (href.startsWith('/users')) {
    return isAdminRole(role);
  }

  if (href === '/vendor-types' || href.startsWith('/vendor-types/') || href === '/acquired-by' || href.startsWith('/acquired-by/')) {
    return isAdminRole(role);
  }

  if (href === '/vendor-location-requests' || href.startsWith('/vendor-location-requests/')) {
    return isAdminRole(role);
  }

  if (href === '/delivery-payment-options' || href.startsWith('/delivery-payment-options/')) {
    return isAdminRole(role);
  }

  if (href === '/vendors/new') {
    return true;
  }

  if (href === '/salesreps/new') {
    return isAdminRole(role);
  }

  if (href.startsWith('/salesreps')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href.startsWith('/products')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href === '/visit/reverse' || href === '/admin-stock') {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href.startsWith('/reports')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href.startsWith('/deliveries')) {
    return role === 'delivery' || role === 'agent' || role === 'supervisor' || role === 'admin' || role === 'super_admin';
  }

  return true;
}
