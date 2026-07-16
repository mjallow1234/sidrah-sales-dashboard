function doGet(e) {
  return handleRequest('GET', e);
}

function doPost(e) {
  return handleRequest('POST', e);
}

function doPut(e) {
  return handleRequest('PUT', e);
}

function handleRequest(method, e) {
  resetSettingsCache();
  var request = normalizeRequest(method, e);
  try {
    authenticateRequest(request);
    var response = dispatchRoute(request);
    logAudit(request, 'success', 'Request completed successfully');
    return createJsonOutput({ status: 'success', data: response });
  } catch (error) {
    logAudit(request, 'error', error.message);
    return createErrorOutput(error);
  }
}

function normalizeRequest(method, e) {
  var body = {};
  if (method === 'POST' && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseError) {
      throw createHttpError(400, 'Invalid JSON body.');
    }
  }

  var overrideMethod = null;
  if (e.parameter) {
    overrideMethod = e.parameter._method || e.parameter.method || null;
  }
  if (body) {
    overrideMethod = body._method || body.method || overrideMethod;
  }
  if (overrideMethod) {
    method = String(overrideMethod).toUpperCase();
  }

  var path = (e.pathInfo || '').replace(/\/$/, '');
  if (!path && e.parameter && e.parameter.path) {
    path = e.parameter.path;
  }
  return {
    method: method,
    path: path || '',
    params: e.parameter || {},
    body: body
  };
}

function authenticateRequest(request) {
  var expectedKey = getExpectedApiKey();
  if (!expectedKey) {
    throw createHttpError(500, 'API key not configured.');
  }
  var providedKey = request.params.apiKey || request.params.api_key || request.body.apiKey || request.body.api_key;
  if (!providedKey || providedKey !== expectedKey) {
    throw createHttpError(401, 'Invalid or missing API key.');
  }
}

function dispatchRoute(request) {
  var segments = parsePathSegments(request.path);
  var method = request.method;

  if (method === 'GET') {
    return handleGetRoute(segments, request.params);
  }
  if (method === 'POST') {
    return handlePostRoute(segments, request.body);
  }
  if (method === 'PUT') {
    return handlePutRoute(segments, request.body);
  }
  throw createHttpError(405, 'Method not allowed.');
}

function parsePathSegments(path) {
  return path.split('/').filter(function(segment) {
    return segment !== '';
  });
}

function handleGetRoute(segments, params) {
  if (segments.length === 0) {
    throw createHttpError(404, 'Route not found.');
  }
  switch (segments[0]) {
    case 'vendors':
      return segments.length === 1 ? getVendors(params) : getVendorById(segments[1]);
    case 'products':
      return segments.length === 1 ? getProducts(params) : getProductById(segments[1]);
    case 'inventory':
      return getInventory(params);
    case 'vendorbalances':
      return getVendorBalances(params);
    case 'visitlogs':
      return getVisitLogs(params);
    case 'salesreps':
      return segments.length === 1 ? getSalesReps(params) : getSalesRepById(segments[1]);
    case 'stats':
      return getStats();
    default:
      throw createHttpError(404, 'Route not found.');
  }
}

function handlePostRoute(segments, body) {
  if (segments.length !== 1) {
    throw createHttpError(404, 'Route not found.');
  }
  switch (segments[0]) {
    case 'vendor':
      validateVendorPayload(body);
      return executeWithLock(function() {
        return createVendor(body);
      });
    case 'visit':
      validateVisitPayload(body);
      return executeWithLock(function() {
        return createVisit(body);
      });
    case 'product':
      validateProductPayload(body);
      return executeWithLock(function() {
        return createProduct(body);
      });
    case 'salesrep':
      validateSalesRepPayload(body);
      return executeWithLock(function() {
        return createSalesRep(body);
      });
    default:
      throw createHttpError(404, 'Route not found.');
  }
}

function handlePutRoute(segments, body) {
  if (segments.length !== 2) {
    throw createHttpError(404, 'Route not found.');
  }
  var id = segments[1];
  switch (segments[0]) {
    case 'product':
      validateProductUpdatePayload(body);
      return executeWithLock(function() {
        return updateProduct(id, body);
      });
    case 'vendor':
      validateVendorUpdatePayload(body);
      return executeWithLock(function() {
        return updateVendor(id, body);
      });
    case 'salesrep':
      validateSalesRepUpdatePayload(body);
      return executeWithLock(function() {
        return updateSalesRep(id, body);
      });
    default:
      throw createHttpError(404, 'Route not found.');
  }
}

function executeWithLock(action) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30);
  try {
    return action();
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseError) {
      Logger.log('Lock release failed: ' + releaseError.message);
    }
  }
}

function validateVendorPayload(body) {
  validateRequiredFields(body, ['vendor_name', 'phone', 'location', 'sales_rep_id']);
  validateStringField(body.vendor_name, 'vendor_name');
  validateStringField(body.phone, 'phone');
  validateStringField(body.location, 'location');
  validateStringField(body.sales_rep_id, 'sales_rep_id');
  validateStringField(body.assigned_date, 'assigned_date');
  validateDateField(body.assigned_date, 'assigned_date');
}

function validateVisitPayload(body) {
  validateRequiredFields(body, ['vendor_id', 'product_id', 'sales_rep_id', 'stock_sold', 'stock_added', 'cash_collected', 'unit_price', 'payment_method']);
  validateStringField(body.vendor_id, 'vendor_id');
  validateStringField(body.product_id, 'product_id');
  validateStringField(body.sales_rep_id, 'sales_rep_id');
  validateStringField(body.payment_method, 'payment_method');
  validateStringField(body.payment_reference, 'payment_reference');
  if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
    validateNumberField(body.latitude, 'latitude');
  }
  if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
    validateNumberField(body.longitude, 'longitude');
  }
  validateNumberField(body.stock_sold, 'stock_sold');
  validateNumberField(body.stock_added, 'stock_added');
  validateNumberField(body.cash_collected, 'cash_collected');
  validateNumberField(body.unit_price, 'unit_price');
}

function getVendors(params) {
  var rows = getSheetRows('Vendors');
  var filtered = rows.filter(function(row) {
    if ((params.salesRepId && row.sales_rep_id !== params.salesRepId) ||
        (params.sales_rep_id && row.sales_rep_id !== params.sales_rep_id)) return false;
    if (params.status && row.status !== params.status) return false;
    return true;
  });
  var pagination = validatePagination(params);
  return paginate(filtered, pagination.page, pagination.pageSize);
}

function getVendorById(vendorId) {
  var rows = getSheetRows('Vendors');
  var vendor = rows.find(function(row) {
    return row.vendor_id === vendorId;
  });
  if (!vendor) {
    throw createHttpError(404, 'Vendor not found.');
  }
  return vendor;
}

function getProducts(params) {
  var rows = getSheetRows('Products');
  var filtered = rows.filter(function(row) {
    if (params.active !== undefined && params.active !== null && params.active !== '') {
      var normalizedActive = String(params.active).toLowerCase();
      var rowActive = String(row.active).toLowerCase();
      if (normalizedActive === 'true' || normalizedActive === 'false') {
        if (rowActive !== (normalizedActive === 'true' ? 'true' : 'false')) return false;
      } else {
        if (rowActive !== normalizedActive) return false;
      }
    }
    if (params.category && row.category !== params.category) return false;
    return true;
  });
  var pagination = validatePagination(params);
  return paginate(filtered, pagination.page, pagination.pageSize);
}

function getInventory(params) {
  var rows = getSheetRows('Inventory');
  var filtered = rows.filter(function(row) {
    if (params.vendorId && row.vendor_id !== params.vendorId) return false;
    if (params.productId && row.product_id !== params.productId) return false;
    return true;
  });
  var pagination = validatePagination(params);
  return paginate(filtered, pagination.page, pagination.pageSize);
}

function getVendorBalances(params) {
  var rows = getSheetRows('VendorBalances');
  var filtered = rows.filter(function(row) {
    if (params.vendorId && row.vendor_id !== params.vendorId) return false;
    return true;
  });
  var pagination = validatePagination(params);
  return paginate(filtered, pagination.page, pagination.pageSize);
}

function getVisitLogs(params) {
  var rows = getSheetRows('VisitLogs');
  var filtered = rows.filter(function(row) {
    var rowDate = parseDateValue(row.date);
    var startDate = parseDateValue(params.startDate);
    var endDate = parseDateValue(params.endDate);
    if (params.vendorId && row.vendor_id !== params.vendorId) return false;
    if (params.salesRepId && row.sales_rep_id !== params.salesRepId) return false;
    if (params.productId && row.product_id !== params.productId) return false;
    if (params.paymentMethod && row.payment_method !== params.paymentMethod) return false;
    if (startDate && (!rowDate || rowDate < startDate)) return false;
    if (endDate && (!rowDate || rowDate > endDate)) return false;
    return true;
  });
  var pagination = validatePagination(params);
  return paginate(filtered, pagination.page, pagination.pageSize);
}

function getSalesReps(params) {
  var rows = getSheetRows('SalesReps');
  var filtered = rows.filter(function(row) {
    if (params.status && row.status !== params.status) return false;
    return true;
  });
  var pagination = validatePagination(params);
  return paginate(filtered, pagination.page, pagination.pageSize);
}

function createProduct(body) {
  var now = new Date();
  var productId = generateProductId();
  var row = [
    productId,
    body.product_name,
    body.category,
    body.unit,
    Number(body.default_unit_price),
    body.currency || 'GMD',
    'TRUE',
    getIsoDate(now),
    getIsoDatetime(now)
  ];
  appendRow('Products', row);
  return getProductById(productId);
}

function updateProduct(productId, body) {
  var product = findRowById('Products', 'product_id', productId);
  if (!product) {
    throw createHttpError(404, 'Product not found.');
  }
  var updates = {};
  if (body.product_name !== undefined) updates.product_name = body.product_name;
  if (body.category !== undefined) updates.category = body.category;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.default_unit_price !== undefined) updates.default_unit_price = Number(body.default_unit_price);
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.active !== undefined) updates.active = body.active ? 'TRUE' : 'FALSE';
  updates.last_updated = getIsoDatetime(new Date());
  return updateRowById('Products', 'product_id', productId, updates);
}

function updateVendor(vendorId, body) {
  var vendor = findRowById('Vendors', 'vendor_id', vendorId);
  if (!vendor) {
    throw createHttpError(404, 'Vendor not found.');
  }
  if (body.sales_rep_id !== undefined) {
    var reps = getSheetRows('SalesReps');
    validateForeignKey(body.sales_rep_id, 'SalesRep', reps, 'sales_rep_id');
  }
  var updates = {};
  if (body.vendor_name !== undefined) updates.vendor_name = body.vendor_name;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.location !== undefined) updates.location = body.location;
  if (body.sales_rep_id !== undefined) updates.sales_rep_id = body.sales_rep_id;
  if (body.status !== undefined) updates.status = body.status;
  updates.last_updated = getIsoDatetime(new Date());
  return updateRowById('Vendors', 'vendor_id', vendorId, updates);
}

function createSalesRep(body) {
  var now = new Date();
  var salesRepId = generateSalesRepId();
  var row = [
    salesRepId,
    body.full_name,
    body.phone,
    'agent',
    'active',
    getIsoDate(now),
    getIsoDatetime(now)
  ];
  appendRow('SalesReps', row);
  return getSalesRepById(salesRepId);
}

function updateSalesRep(salesRepId, body) {
  var salesRep = findRowById('SalesReps', 'sales_rep_id', salesRepId);
  if (!salesRep) {
    throw createHttpError(404, 'SalesRep not found.');
  }
  var updates = {};
  if (body.full_name !== undefined) updates.name = body.full_name;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.status !== undefined) updates.status = body.status;
  updates.last_updated = getIsoDatetime(new Date());
  return updateRowById('SalesReps', 'sales_rep_id', salesRepId, updates);
}

function getProductById(productId) {
  var rows = getSheetRows('Products');
  var product = rows.find(function(row) {
    return row.product_id === productId;
  });
  if (!product) {
    throw createHttpError(404, 'Product not found.');
  }
  return product;
}

function getSalesRepById(salesRepId) {
  var rows = getSheetRows('SalesReps');
  var salesRep = rows.find(function(row) {
    return row.sales_rep_id === salesRepId;
  });
  if (!salesRep) {
    throw createHttpError(404, 'SalesRep not found.');
  }
  return salesRep;
}

function getStats() {
  var today = getIsoDate(new Date());
  var vendors = getSheetRows('Vendors');
  var visitLogs = getSheetRows('VisitLogs');
  var inventories = getSheetRows('Inventory');
  var balances = getSheetRows('VendorBalances');
  var lowStockThreshold = Number(getSystemSetting('low_stock_threshold', 5));

  var vendorsVisitedToday = uniqueValues(visitLogs.filter(function(row) {
    return row.date === today;
  }), 'vendor_id');

  var cashCollectedToday = sumValues(visitLogs.filter(function(row) {
    return row.date === today;
  }), 'cash_collected');

  var bucketsSoldToday = sumValues(visitLogs.filter(function(row) {
    return row.date === today;
  }), 'stock_sold');

  var salesByRep = groupAndSum(visitLogs, 'sales_rep_id', ['cash_collected', 'stock_sold']);
  var collectionsByRep = groupAndSum(visitLogs, 'sales_rep_id', ['cash_collected']);
  var topVendors = groupAndSum(visitLogs, 'vendor_id', ['cash_collected']).sort(function(a, b) {
    return b.cash_collected - a.cash_collected;
  }).slice(0, 10);

  return {
    totalActiveVendors: vendors.filter(function(row) { return row.status === 'active'; }).length,
    newVendorsThisMonth: vendors.filter(function(row) {
      return isSameMonth(row.date_created, today);
    }).length,
    vendorsVisitedToday: vendorsVisitedToday.length,
    bucketsSoldToday: bucketsSoldToday,
    cashCollectedToday: cashCollectedToday,
    outstandingBalances: sumValues(balances, 'balance_owed'),
    lowStockVendors: uniqueValues(inventories.filter(function(row) {
      return Number(row.current_stock) <= lowStockThreshold;
    }), 'vendor_id').length,
    averageSalesPerVendor: vendorsVisitedToday.length ? cashCollectedToday / vendorsVisitedToday.length : 0,
    salesBySalesRep: salesByRep,
    collectionsBySalesRep: collectionsByRep,
    top10VendorsBySales: topVendors
  };
}

function createVendor(body) {
  var reps = getSheetRows('SalesReps');
  validateForeignKey(body.sales_rep_id, 'SalesRep', reps, 'sales_rep_id');

  var dateCreated = body.date_created || getIsoDate(new Date());
  var createdAt = getIsoDatetime(new Date());
  var vendorId = generateVendorId();
  var status = body.status || 'active';
  var assignedDate = body.assigned_date || getIsoDate(new Date());

  var row = [
    vendorId,
    body.vendor_name,
    body.phone,
    body.location,
    body.sales_rep_id,
    assignedDate,
    dateCreated,
    createdAt,
    status
  ];

  appendRow('Vendors', row);

  var products = getSheetRows('Products').filter(function(product) {
    return product.active === 'TRUE';
  });

  products.forEach(function(product) {
    appendRow('Inventory', [
      generateId('I'),
      vendorId,
      product.product_id,
      0,
      0,
      0,
      getIsoDate(new Date()),
      getIsoDatetime(new Date())
    ]);
  });

  appendRow('VendorBalances', [
    vendorId,
    0,
    0,
    0,
    getIsoDate(new Date()),
    getIsoDatetime(new Date())
  ]);

  return getVendorById(vendorId);
}

function createVisit(body) {
  var transactionId = generateId('T');
  appendTransactionJournalEntry(transactionId, '/visit', 'begin', 'pending', body, false);

  var existingVisit = getVisitByClientTransactionId(body.client_transaction_id);
  if (existingVisit) {
    appendTransactionJournalEntry(transactionId, '/visit', 'duplicate_return', 'success', body, true);
    return {
      visitLog: existingVisit,
      inventory: getInventoryRow(existingVisit.vendor_id, existingVisit.product_id),
      vendorBalance: getVendorBalanceRow(existingVisit.vendor_id)
    };
  }

  var vendors = getSheetRows('Vendors');
  if (!vendors.some(function(row) { return row.vendor_id === body.vendor_id; })) {
    appendTransactionJournalEntry(transactionId, '/visit', 'invalid_vendor', 'failure', body, false);
    throw createHttpError(400, 'Invalid vendor_id.');
  }
  var products = getSheetRows('Products');
  if (!products.some(function(row) { return row.product_id === body.product_id; })) {
    appendTransactionJournalEntry(transactionId, '/visit', 'invalid_product', 'failure', body, false);
    throw createHttpError(400, 'Invalid product_id.');
  }
  var reps = getSheetRows('SalesReps');
  if (!reps.some(function(row) { return row.sales_rep_id === body.sales_rep_id; })) {
    appendTransactionJournalEntry(transactionId, '/visit', 'invalid_sales_rep', 'failure', body, false);
    throw createHttpError(400, 'Invalid sales_rep_id.');
  }

  var inventoryRows = getSheetRows('Inventory');
  var inventoryIndex = inventoryRows.findIndex(function(row) {
    return row.vendor_id === body.vendor_id && row.product_id === body.product_id;
  });
  var inventoryExisted = inventoryIndex !== -1;
  var inventoryRow = inventoryExisted ? inventoryRows[inventoryIndex] : null;
  var inventoryRowNumber = inventoryExisted ? inventoryIndex + 2 : null;

  var stockSold = Number(body.stock_sold);
  var stockAdded = Number(body.stock_added);
  var cashCollected = Number(body.cash_collected);
  var unitPrice = Number(body.unit_price);
  var openingStock = inventoryRow ? Number(inventoryRow.current_stock) || 0 : 0;

  if (stockSold > openingStock) {
    appendTransactionJournalEntry(transactionId, '/visit', 'stock_overflow', 'failure', body, false);
    throw createHttpError(400, 'stock_sold cannot exceed opening_stock.');
  }

  if (!inventoryExisted) {
    appendRow('Inventory', [
      generateId('I'),
      body.vendor_id,
      body.product_id,
      0,
      0,
      0,
      getIsoDate(new Date()),
      getIsoDatetime(new Date())
    ]);
    var inventorySheet = getSpreadsheet().getSheetByName('Inventory');
    inventoryRowNumber = inventorySheet.getLastRow();
    inventoryRows = getSheetRows('Inventory');
    inventoryIndex = inventoryRows.findIndex(function(row) {
      return row.vendor_id === body.vendor_id && row.product_id === body.product_id;
    });
    inventoryRow = inventoryRows[inventoryIndex];
  }

  var expectedCash = stockSold * unitPrice;
  var closingStock = openingStock - stockSold + stockAdded;

  var balanceInfo = getBalanceUpdateInfo(body.vendor_id, expectedCash, cashCollected);
  var inventoryBackup = {
    values: [
      inventoryRow.inventory_id,
      inventoryRow.vendor_id,
      inventoryRow.product_id,
      inventoryRow.total_stock_supplied,
      inventoryRow.total_stock_sold,
      inventoryRow.current_stock,
      inventoryRow.date_created,
      inventoryRow.last_updated
    ],
    rowNumber: inventoryRowNumber,
    existed: inventoryExisted
  };

  var balanceBackup = balanceInfo.backup;

  var visitId = generateId('VL');
  var timestamp = new Date().toISOString();
  var today = getIsoDate(new Date());

  try {
    appendTransactionJournalEntry(transactionId, '/visit', 'inventory_update', 'pending', body, false);
    updateInventoryRow(inventoryRowNumber, inventoryRow, stockSold, stockAdded, closingStock);
    appendTransactionJournalEntry(transactionId, '/visit', 'inventory_update', 'success', body, false);

    appendTransactionJournalEntry(transactionId, '/visit', 'balance_update', 'pending', body, false);
    updateVendorBalanceInfo(balanceInfo);
    appendTransactionJournalEntry(transactionId, '/visit', 'balance_update', 'success', body, false);

    appendTransactionJournalEntry(transactionId, '/visit', 'visit_append', 'pending', body, false);
    appendRow('VisitLogs', [
      visitId,
      timestamp,
      today,
      body.vendor_id,
      body.product_id,
      body.sales_rep_id,
      openingStock,
      stockSold,
      stockAdded,
      cashCollected,
      expectedCash,
      unitPrice,
      closingStock,
      body.payment_method,
      body.payment_reference || '',
      body.client_transaction_id,
      body.latitude !== undefined && body.latitude !== null ? body.latitude : '',
      body.longitude !== undefined && body.longitude !== null ? body.longitude : '',
      body.notes || '',
      timestamp,
      timestamp
    ]);
    appendTransactionJournalEntry(transactionId, '/visit', 'complete', 'success', body, true);
  } catch (error) {
    appendTransactionJournalEntry(transactionId, '/visit', 'failure', 'failure', { error: error.message }, false);
    rollbackInventory(inventoryBackup);
    rollbackVendorBalance(balanceBackup);
    throw error;
  }

  return {
    visitLog: getVisitLogById(visitId),
    inventory: getSheetRows('Inventory')[inventoryIndex],
    vendorBalance: getSheetRows('VendorBalances')[balanceInfo.index]
  };
}

function getBalanceUpdateInfo(vendorId, expectedCash, cashCollected) {
  var balances = getSheetRows('VendorBalances');
  var balanceIndex = balances.findIndex(function(row) {
    return row.vendor_id === vendorId;
  });
  if (balanceIndex === -1) {
    return {
      index: balances.length,
      created: true,
      values: [
        vendorId,
        expectedCash,
        cashCollected,
        expectedCash - cashCollected,
        getIsoDate(new Date()),
        getIsoDatetime(new Date())
      ],
      backup: {
        rowNumber: balances.length + 2,
        values: [],
        created: true
      }
    };
  }
  var balanceRow = balances[balanceIndex];
  return {
    index: balanceIndex,
    created: false,
    values: [
      vendorId,
      Number(balanceRow.total_expected_cash) + expectedCash,
      Number(balanceRow.cash_collected) + cashCollected,
      Number(balanceRow.total_expected_cash) + expectedCash - (Number(balanceRow.cash_collected) + cashCollected),
      balanceRow.date_created,
      getIsoDatetime(new Date())
    ],
    backup: {
      rowNumber: balanceIndex + 2,
      values: [
        balanceRow.vendor_id,
        balanceRow.total_expected_cash,
        balanceRow.cash_collected,
        balanceRow.balance_owed,
        balanceRow.date_created,
        balanceRow.last_updated
      ],
      created: false
    }
  };
}

function updateVendorBalanceInfo(info) {
  if (info.created) {
    appendRow('VendorBalances', info.values);
    return;
  }
  var sheet = getSpreadsheet().getSheetByName('VendorBalances');
  sheet.getRange(info.backup.rowNumber, 1, 1, info.values.length).setValues([info.values]);
}

function rollbackInventory(backup) {
  var sheet = getSpreadsheet().getSheetByName('Inventory');
  if (!backup) {
    return;
  }
  if (!backup.existed) {
    sheet.deleteRow(backup.rowNumber);
  } else {
    sheet.getRange(backup.rowNumber, 1, 1, backup.values.length).setValues([backup.values]);
  }
}

function rollbackVendorBalance(backup) {
  var sheet = getSpreadsheet().getSheetByName('VendorBalances');
  if (!backup) {
    return;
  }
  if (backup.created) {
    sheet.deleteRow(backup.rowNumber);
  } else {
    sheet.getRange(backup.rowNumber, 1, 1, backup.values.length).setValues([backup.values]);
  }
}

function updateInventoryRow(rowNumber, inventoryRow, stockSold, stockAdded, closingStock) {
  var sheet = getSpreadsheet().getSheetByName('Inventory');
  var values = [
    inventoryRow.inventory_id,
    inventoryRow.vendor_id,
    inventoryRow.product_id,
    Number(inventoryRow.total_stock_supplied) + stockAdded,
    Number(inventoryRow.total_stock_sold) + stockSold,
    closingStock,
    inventoryRow.date_created,
    getIsoDatetime(new Date())
  ];
  sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
  return getSheetRows('Inventory')[rowNumber - 2];
}

function updateVendorBalance(vendorId, expectedCash, cashCollected) {
  var balances = getSheetRows('VendorBalances');
  var balanceIndex = balances.findIndex(function(row) {
    return row.vendor_id === vendorId;
  });
  if (balanceIndex === -1) {
    appendRow('VendorBalances', [
      vendorId,
      expectedCash,
      cashCollected,
      expectedCash - cashCollected,
      getIsoDate(new Date()),
      getIsoDatetime(new Date())
    ]);
    var freshBalances = getSheetRows('VendorBalances');
    return freshBalances[freshBalances.length - 1];
  }
  var balanceRow = balances[balanceIndex];
  var totalExpectedCash = Number(balanceRow.total_expected_cash) + expectedCash;
  var totalCashCollected = Number(balanceRow.cash_collected) + cashCollected;
  var balanceOwed = totalExpectedCash - totalCashCollected;
  var sheet = getSpreadsheet().getSheetByName('VendorBalances');
  var values = [
    vendorId,
    totalExpectedCash,
    totalCashCollected,
    balanceOwed,
    balanceRow.date_created,
    getIsoDatetime(new Date())
  ];
  sheet.getRange(balanceIndex + 2, 1, 1, values.length).setValues([values]);
  return getSheetRows('VendorBalances')[balanceIndex];
}

function getVisitLogById(visitId) {
  var rows = getSheetRows('VisitLogs');
  var visit = rows.find(function(row) {
    return row.visit_id === visitId;
  });
  if (!visit) {
    throw createHttpError(404, 'Visit log not found.');
  }
  return visit;
}

function getVisitByClientTransactionId(clientTransactionId) {
  if (!clientTransactionId) {
    return null;
  }
  var rows = getSheetRows('VisitLogs');
  return rows.find(function(row) {
    return row.client_transaction_id === clientTransactionId;
  }) || null;
}

function getInventoryRow(vendorId, productId) {
  var rows = getSheetRows('Inventory');
  return rows.find(function(row) {
    return row.vendor_id === vendorId && row.product_id === productId;
  }) || null;
}

function getVendorBalanceRow(vendorId) {
  var rows = getSheetRows('VendorBalances');
  return rows.find(function(row) {
    return row.vendor_id === vendorId;
  }) || null;
}

function appendTransactionJournalEntry(transactionId, endpoint, stage, status, payload, completed) {
  appendRow('TransactionJournal', [
    transactionId,
    new Date().toISOString(),
    endpoint,
    stage,
    status,
    JSON.stringify(payload),
    completed ? 'TRUE' : 'FALSE'
  ]);
}

function getSheetRows(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw createHttpError(500, 'Missing sheet: ' + sheetName);
  }
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  var headers = values[0].map(function(value) {
    return String(value).trim();
  });
  return values.slice(1).map(function(row) {
    var obj = {};
    row.forEach(function(value, index) {
      var key = headers[index];
      if (key) {
        obj[key] = value;
      }
    });
    return obj;
  });
}

function appendRow(sheetName, row) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw createHttpError(500, 'Missing sheet: ' + sheetName);
  }
  sheet.appendRow(row);
}

function findRowById(sheetName, idField, idValue) {
  var rows = getSheetRows(sheetName);
  return rows.find(function(row) {
    return row[idField] === idValue;
  }) || null;
}

function updateRowById(sheetName, idField, idValue, updates) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw createHttpError(500, 'Missing sheet: ' + sheetName);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
    return String(value).trim();
  });
  var rows = getSheetRows(sheetName);
  var rowIndex = rows.findIndex(function(row) {
    return row[idField] === idValue;
  });
  if (rowIndex === -1) {
    throw createHttpError(404, sheetName.replace(/s$/, '') + ' not found.');
  }
  var rowNumber = rowIndex + 2;
  var rowValues = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  Object.keys(updates).forEach(function(key) {
    var headerIndex = headers.indexOf(key);
    if (headerIndex !== -1) {
      rowValues[headerIndex] = updates[key];
    }
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([rowValues]);
  return getSheetRows(sheetName)[rowIndex];
}

function paginate(items, page, pageSize) {
  var totalCount = items.length;
  var start = (page - 1) * pageSize;
  var paged = items.slice(start, start + pageSize);
  return {
    totalCount: totalCount,
    page: page,
    pageSize: pageSize,
    items: paged
  };
}

function generateId(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function generateProductId() {
  return getNextSequentialId('Products', 'product_id', 'P', 3);
}

function generateVendorId() {
  return getNextSequentialId('Vendors', 'vendor_id', 'V', 3);
}

function generateSalesRepId() {
  return getNextSequentialId('SalesReps', 'sales_rep_id', 'SR', 3);
}

function getNextSequentialId(sheetName, idField, prefix, digits) {
  var rows = getSheetRows(sheetName);
  var max = 0;
  var regex = new RegExp('^' + prefix + '(\\d+)$');
  rows.forEach(function(row) {
    var value = row[idField];
    if (!value) return;
    var match = String(value).match(regex);
    if (match && match[1]) {
      var numeric = Number(match[1]);
      if (!isNaN(numeric) && numeric > max) {
        max = numeric;
      }
    }
  });
  var next = max + 1;
  return prefix + String(next).padStart(digits, '0');
}

function getIsoDate(date) {
  return date.toISOString().split('T')[0];
}

function getIsoDatetime(date) {
  return date.toISOString();
}

function parseDateValue(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    var parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function isSameMonth(dateValue, referenceDate) {
  var date = parseDateValue(dateValue);
  var ref = parseDateValue(referenceDate);
  if (!date || !ref) {
    return false;
  }
  return date.getUTCFullYear() === ref.getUTCFullYear() && date.getUTCMonth() === ref.getUTCMonth();
}

function uniqueValues(rows, field) {
  var values = {};
  rows.forEach(function(row) {
    if (row[field]) {
      values[row[field]] = true;
    }
  });
  return Object.keys(values);
}

function sumValues(rows, field) {
  return rows.reduce(function(sum, row) {
    return sum + (Number(row[field]) || 0);
  }, 0);
}

function groupAndSum(rows, groupBy, fields) {
  var map = {};
  rows.forEach(function(row) {
    var key = row[groupBy];
    if (!map[key]) {
      map[key] = { [groupBy]: key };
      fields.forEach(function(field) {
        map[key][field] = 0;
      });
    }
    fields.forEach(function(field) {
      map[key][field] += Number(row[field]) || 0;
    });
  });
  return Object.keys(map).map(function(key) {
    return map[key];
  });
}

function createJsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function createErrorOutput(error) {
  var statusCode = error.statusCode || 500;
  var payload = {
    status: 'error',
    message: error.message || 'Internal server error',
    details: error.details || null,
    statusCode: statusCode
  };
  return createJsonOutput(payload);
}

function logAudit(request, outcome, message) {
  try {
    var details = {
      method: request && request.method ? request.method : 'unknown',
      path: request && request.path ? request.path : 'unknown',
      timestamp: new Date().toISOString(),
      outcome: outcome,
      message: message || null,
      apiKey: request && request.params && (request.params.apiKey || request.params.api_key) ? 'provided' : 'missing'
    };
    Logger.log(JSON.stringify(details));
    appendAuditLog(details);
  } catch (e) {
    Logger.log('Audit logging failed: ' + e.message);
  }
}

function appendAuditLog(details) {
  var row = [
    generateId('A'),
    details.timestamp,
    details.path,
    details.method,
    'system',
    details.outcome,
    details.message || ''
  ];
  try {
    appendRow('AuditLogs', row);
  } catch (e) {
    Logger.log('Failed to write audit log row: ' + e.message);
  }
}
