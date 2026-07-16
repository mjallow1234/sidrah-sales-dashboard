function createGoogleSheetsFoundation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = [
    'Vendors',
    'Products',
    'Inventory',
    'VendorBalances',
    'VisitLogs',
    'SalesReps',
    'SystemSettings',
    'AppUsers',
    'AuditLogs',
    'TransactionJournal'
  ];

  sheetNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    } else {
      sheet.clear();
    }
  });

  var headers = {
    'Vendors': [
      'vendor_id',
      'vendor_name',
      'phone',
      'location',
      'sales_rep_id',
      'assigned_date',
      'date_created',
      'last_updated',
      'status'
    ],
    'Products': [
      'product_id',
      'product_name',
      'category',
      'unit',
      'default_unit_price',
      'currency',
      'active',
      'date_created',
      'last_updated'
    ],
    'Inventory': [
      'inventory_id',
      'vendor_id',
      'product_id',
      'total_stock_supplied',
      'total_stock_sold',
      'current_stock',
      'date_created',
      'last_updated'
    ],
    'VendorBalances': [
      'vendor_id',
      'total_expected_cash',
      'cash_collected',
      'balance_owed',
      'date_created',
      'last_updated'
    ],
    'VisitLogs': [
      'visit_id',
      'timestamp',
      'date',
      'vendor_id',
      'product_id',
      'sales_rep_id',
      'opening_stock',
      'stock_sold',
      'stock_added',
      'cash_collected',
      'expected_cash',
      'unit_price',
      'closing_stock',
      'payment_method',
      'payment_reference',
      'client_transaction_id',
      'latitude',
      'longitude',
      'notes',
      'date_created',
      'last_updated'
    ],
    'SalesReps': [
      'sales_rep_id',
      'name',
      'phone',
      'role',
      'status',
      'date_created',
      'last_updated'
    ],
    'SystemSettings': [
      'setting_key',
      'setting_value',
      'description',
      'date_created',
      'last_updated'
    ],
    'AppUsers': [
      'user_id',
      'email',
      'name',
      'role',
      'status',
      'date_created',
      'last_updated'
    ],
    'AuditLogs': [
      'audit_id',
      'timestamp',
      'path',
      'method',
      'actor',
      'outcome',
      'message'
    ],
    'TransactionJournal': [
      'transaction_id',
      'timestamp',
      'endpoint',
      'stage',
      'status',
      'payload',
      'completed'
    ]
  };

  sheetNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    sheet.clear();
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers[name].length).setFontWeight('bold');
  });

  Logger.log('Google Sheets foundation created with %s sheets.', sheetNames.length);
}

function seedGoogleSheetsFoundation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var vendorRows = [
    ['V001', 'Brikama Grocery', '740123456', 'Brikama', 'S001', '2026-07-01', '2026-07-01', '2026-07-01T08:00:00Z', 'active'],
    ['V002', 'Bakau Market', '740234567', 'Bakau', 'S002', '2026-07-02', '2026-07-02', '2026-07-02T09:00:00Z', 'active'],
    ['V003', 'Mandinka Store', '740345678', 'Serrekunda', 'S001', '2026-07-03', '2026-07-03', '2026-07-03T10:00:00Z', 'active']
  ];

  var productRows = [
    ['P001', 'Deygeh 4kg', 'Groundnut Products', 'bucket', 900, 'GMD', 'TRUE', '2026-07-01', '2026-07-01T08:00:00Z'],
    ['P002', 'Deygeh 4.5kg', 'Groundnut Products', 'bucket', 1050, 'GMD', 'TRUE', '2026-07-01', '2026-07-01T08:00:00Z'],
    ['P003', 'Groundnut Granules', 'Groundnut Ingredients', 'kg', 120, 'GMD', 'TRUE', '2026-07-01', '2026-07-01T08:00:00Z']
  ];

  var inventoryRows = [
    ['I001', 'V001', 'P001', 100, 30, 70, '2026-07-01', '2026-07-01T08:00:00Z'],
    ['I002', 'V001', 'P002', 50, 10, 40, '2026-07-01', '2026-07-01T08:00:00Z'],
    ['I003', 'V002', 'P001', 80, 20, 60, '2026-07-02', '2026-07-02T09:00:00Z']
  ];

  var vendorBalanceRows = [
    ['V001', 27000, 18000, 9000, '2026-07-01', '2026-07-01T08:00:00Z'],
    ['V002', 18000, 12000, 6000, '2026-07-02', '2026-07-02T09:00:00Z']
  ];

  var visitLogRows = [
    ['VL001', '2026-07-01T08:00:00Z', '2026-07-01', 'V001', 'P001', 'S001', 100, 30, 0, 27000, 27000, 900, 70, 'cash', 'REF12345', 'TXN-20260716-001', 13.450, -16.650, 'First visit', '2026-07-01T08:00:00Z', '2026-07-01T08:00:00Z'],
    ['VL002', '2026-07-02T09:00:00Z', '2026-07-02', 'V002', 'P001', 'S002', 80, 20, 0, 18000, 18000, 900, 60, 'cash', 'REF54321', 'TXN-20260716-002', 13.450, -16.650, 'First visit', '2026-07-02T09:00:00Z', '2026-07-02T09:00:00Z'],
    ['VL003', '2026-07-03T10:00:00Z', '2026-07-03', 'V001', 'P002', 'S001', 40, 15, 5, 15750, 13500, 900, 30, 'cash', 'REF67890', 'TXN-20260716-003', 13.455, -16.645, 'Second product visit', '2026-07-03T10:00:00Z', '2026-07-03T10:00:00Z']
  ];

  var salesRepRows = [
    ['S001', 'Fatou', '740456789', 'agent', 'active', '2026-07-01', '2026-07-01T08:00:00Z'],
    ['S002', 'Lamin', '740567890', 'agent', 'active', '2026-07-01', '2026-07-01T08:00:00Z']
  ];

  var appUserRows = [
    ['U001', 'fatou@example.com', 'Fatou', 'admin', 'active', '2026-07-01', '2026-07-01T08:00:00Z'],
    ['U002', 'lamin@example.com', 'Lamin', 'agent', 'active', '2026-07-01', '2026-07-01T08:00:00Z']
  ];

  var settingsRows = [
    ['low_stock_threshold', '5', 'Threshold for low stock alerts', '2026-07-01', '2026-07-01T08:00:00Z'],
    ['default_currency', 'GMD', 'Default currency for product pricing', '2026-07-01', '2026-07-01T08:00:00Z'],
    ['dashboard_days', '30', 'Number of days used in dashboard data', '2026-07-01', '2026-07-01T08:00:00Z']
  ];

  ss.getSheetByName('Vendors').getRange(2, 1, vendorRows.length, vendorRows[0].length).setValues(vendorRows);
  ss.getSheetByName('Products').getRange(2, 1, productRows.length, productRows[0].length).setValues(productRows);
  ss.getSheetByName('Inventory').getRange(2, 1, inventoryRows.length, inventoryRows[0].length).setValues(inventoryRows);
  ss.getSheetByName('VendorBalances').getRange(2, 1, vendorBalanceRows.length, vendorBalanceRows[0].length).setValues(vendorBalanceRows);
  ss.getSheetByName('VisitLogs').getRange(2, 1, visitLogRows.length, visitLogRows[0].length).setValues(visitLogRows);
  ss.getSheetByName('SalesReps').getRange(2, 1, salesRepRows.length, salesRepRows[0].length).setValues(salesRepRows);
  ss.getSheetByName('AppUsers').getRange(2, 1, appUserRows.length, appUserRows[0].length).setValues(appUserRows);
  ss.getSheetByName('SystemSettings').getRange(2, 1, settingsRows.length, settingsRows[0].length).setValues(settingsRows);

  Logger.log('Seed data written to Google Sheets foundation.');
}
