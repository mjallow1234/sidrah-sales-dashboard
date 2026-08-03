function verifyAndMigrateSpreadsheetSchema() {
  var schemaReport = verifySpreadsheetSchema();
  if (schemaReport.isValid) {
    return schemaReport;
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30);
  try {
    schemaReport = verifySpreadsheetSchema();
    if (schemaReport.isValid) {
      return schemaReport;
    }

    var migrationResult = runSchemaMigrations(schemaReport);
    if (!migrationResult.success) {
      throw createHttpError(500, 'Schema migration failed: ' + migrationResult.message);
    }

    schemaReport = verifySpreadsheetSchema();
    if (!schemaReport.isValid) {
      throw createHttpError(500, 'Schema validation failed after migration: ' + JSON.stringify(schemaReport));
    }
    return schemaReport;
  } finally {
    try {
      lock.releaseLock();
    } catch (lockError) {
      Logger.log('Migration lock release failed: ' + lockError.message);
    }
  }
}

function verifySpreadsheetSchema() {
  var expectedSchemas = getExpectedSheetSchemas();
  var report = {
    isValid: true,
    sheets: {}
  };

  expectedSchemas.forEach(function(sheetSchema) {
    var sheetReport = {
      name: sheetSchema.name,
      expectedHeaders: sheetSchema.headers,
      actualHeaders: [],
      missingColumns: [],
      unexpectedColumns: [],
      orderMismatch: []
    };

    var sheet = getSpreadsheet().getSheetByName(sheetSchema.name);
    if (!sheet) {
      sheetReport.missingSheet = true;
      report.isValid = false;
      report.sheets[sheetSchema.name] = sheetReport;
      return;
    }

    var actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
      return value === null ? '' : String(value).trim();
    });
    sheetReport.actualHeaders = actualHeaders;

    sheetSchema.headers.forEach(function(expectedHeader, index) {
      if (actualHeaders.indexOf(expectedHeader) === -1) {
        sheetReport.missingColumns.push(expectedHeader);
      }
      if (actualHeaders[index] !== expectedHeader) {
        sheetReport.orderMismatch.push({ expected: expectedHeader, actual: actualHeaders[index] || '' });
      }
    });

    actualHeaders.forEach(function(actualHeader) {
      if (actualHeader && sheetSchema.headers.indexOf(actualHeader) === -1) {
        sheetReport.unexpectedColumns.push(actualHeader);
      }
    });

    if (sheetReport.missingColumns.length || sheetReport.unexpectedColumns.length || sheetReport.orderMismatch.length || sheetReport.missingSheet) {
      sheetReport.isValid = false;
      report.isValid = false;
    } else {
      sheetReport.isValid = true;
    }
    report.sheets[sheetSchema.name] = sheetReport;
  });

  return report;
}

function getExpectedSheetSchemas() {
  return [
    {
      name: 'Vendors',
      headers: [
        'vendor_id',
        'vendor_name',
        'phone',
        'location',
        'sales_rep_id',
        'assigned_date',
        'assigned_by',
        'date_created',
        'last_updated',
        'status'
      ]
    },
    {
      name: 'Products',
      headers: [
        'product_id',
        'sku',
        'product_name',
        'category',
        'unit',
        'default_unit_price',
        'currency',
        'low_stock_threshold',
        'active',
        'date_created',
        'last_updated'
      ]
    },
    {
      name: 'Inventory',
      headers: [
        'inventory_id',
        'vendor_id',
        'product_id',
        'total_stock_supplied',
        'total_stock_sold',
        'current_stock',
        'date_created',
        'last_updated'
      ]
    },
    {
      name: 'VendorInventory',
      headers: [
        'vendor_inventory_id',
        'vendor_id',
        'product_id',
        'current_stock',
        'total_stock_received',
        'total_stock_sold',
        'created_at',
        'updated_at'
      ]
    },
    {
      name: 'VendorBalances',
      headers: [
        'vendor_id',
        'total_expected_cash',
        'cash_collected',
        'balance_owed',
        'date_created',
        'last_updated'
      ]
    },
    {
      name: 'VisitLogs',
      headers: [
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
      ]
    },
    {
      name: 'SalesReps',
      headers: [
        'sales_rep_id',
        'name',
        'phone',
        'role',
        'status',
        'is_active',
        'date_created',
        'last_updated'
      ]
    },
    {
      name: 'AppUsers',
      headers: [
        'user_id',
        'username',
        'email',
        'phone',
        'name',
        'role',
        'status',
        'sales_rep_id',
        'password_hash',
        'password_reset_required',
        'last_login',
        'is_system_user',
        'failed_login_count',
        'last_failed_login',
        'lockout_until',
        'created_by',
        'updated_by',
        'password_changed_at',
        'date_created',
        'last_updated'
      ]
    },
    {
      name: 'SystemSettings',
      headers: [
        'setting_key',
        'setting_value',
        'description',
        'date_created',
        'last_updated'
      ]
    },
    {
      name: 'AuditLogs',
      headers: [
        'audit_id',
        'timestamp',
        'path',
        'method',
        'actor',
        'outcome',
        'message'
      ]
    },
    {
      name: 'VendorAssignments',
      headers: [
        'assignment_id',
        'vendor_id',
        'previous_sales_rep_id',
        'new_sales_rep_id',
        'action',
        'assigned_by',
        'assigned_at',
        'reason'
      ]
    }
  ];
}

function runSchemaMigrations(schemaReport) {
  var currentVersion = Number(getSystemSetting('schema_version', 1));
  var migrations = getSchemaMigrations();
  var migrationLog = [];

  for (var i = 0; i < migrations.length; i++) {
    var migration = migrations[i];
    if (currentVersion < migration.version) {
      var result;
      try {
        result = migration.migrate();
      } catch (error) {
        return {
          success: false,
          message: 'Migration to version ' + migration.version + ' threw an exception: ' + error.message,
          migrationLog: migrationLog,
          error: String(error)
        };
      }

      if (!result || result.success !== true) {
        return {
          success: false,
          message: 'Migration to version ' + migration.version + ' failed: ' + (result && result.message ? result.message : 'Unknown error'),
          migrationLog: migrationLog,
          details: result
        };
      }

      if (typeof result.failed === 'number' && result.failed > 0 && result.allowFailedRows !== true) {
        return {
          success: false,
          message: 'Migration to version ' + migration.version + ' failed because ' + result.failed + ' row(s) failed.',
          migrationLog: migrationLog,
          details: result
        };
      }

      currentVersion = migration.version;
      migrationLog.push({
        from: migration.version - 1,
        to: migration.version,
        description: migration.description,
        rowsUpdated: result.rowsUpdated || 0,
        details: result,
        timestamp: new Date().toISOString()
      });
      setSystemSetting('schema_version', String(currentVersion));
      resetSettingsCache();
    }
  }

  if (!schemaReport || !schemaReport.isValid) {
    var validation = verifySpreadsheetSchema();
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Post-migration schema validation failed.',
        report: validation,
        migrationLog: migrationLog
      };
    }
  }

  return {
    success: true,
    message: 'Schema migrations applied successfully.',
    migrationLog: migrationLog
  };
}

function runVendorInventoryMigration() {
  return runSchemaMigrations(null);
}

function getSchemaMigrations() {
  return [
    {
      version: 2,
      description: 'Add SalesReps.is_active column with defaults',
      migrate: function() {
        var sheetName = 'SalesReps';
        var sheet = getSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
          return { success: false, message: 'Missing sheet: ' + sheetName };
        }

        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
          return String(value).trim();
        });
        var expectedHeader = 'is_active';
        if (headers.indexOf(expectedHeader) !== -1) {
          return { success: true, rowsUpdated: 0 };
        }

        var statusIndex = headers.indexOf('status');
        if (statusIndex === -1) {
          return { success: false, message: 'Unable to find status header in SalesReps' };
        }

        sheet.insertColumnAfter(statusIndex + 1);
        sheet.getRange(1, statusIndex + 2).setValue(expectedHeader);

        var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        var rowsUpdated = 0;

        values.forEach(function(row, rowIndex) {
          var status = String(row[statusIndex] || '').toLowerCase();
          var value = status === 'active' ? 'TRUE' : 'FALSE';
          row.splice(statusIndex + 1, 0, value);
          rowsUpdated += 1;
          sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);
        });

        Logger.log('Migrated schema 1 -> 2: Added SalesReps.is_active to %s rows', rowsUpdated);
        return { success: true, rowsUpdated: rowsUpdated };
      }
    },
    {
      version: 3,
      description: 'Add Products.sku column and backfill existing product SKUs',
      migrate: function() {
        var sheetName = 'Products';
        var sheet = getSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
          return { success: false, message: 'Missing sheet: ' + sheetName };
        }

        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
          return String(value).trim();
        });
        var productIdIndex = headers.indexOf('product_id');
        if (productIdIndex === -1) {
          return { success: false, message: 'Unable to find product_id header in Products' };
        }

        var skuIndex = headers.indexOf('sku');
        var thresholdIndex = headers.indexOf('low_stock_threshold');
        var currencyIndex = headers.indexOf('currency');
        if (currencyIndex === -1) {
          return { success: false, message: 'Unable to find currency header in Products' };
        }

        if (skuIndex === -1) {
          sheet.insertColumnAfter(productIdIndex + 1);
          sheet.getRange(1, productIdIndex + 2).setValue('sku');
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
            return String(value).trim();
          });
          skuIndex = headers.indexOf('sku');
          currencyIndex = headers.indexOf('currency');
          thresholdIndex = headers.indexOf('low_stock_threshold');
        }

        if (thresholdIndex === -1) {
          var thresholdInsertIndex = currencyIndex + 2; // after currency
          sheet.insertColumnAfter(currencyIndex + 1);
          sheet.getRange(1, thresholdInsertIndex).setValue('low_stock_threshold');
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
            return String(value).trim();
          });
          skuIndex = headers.indexOf('sku');
          thresholdIndex = headers.indexOf('low_stock_threshold');
        }

        if (skuIndex === -1 || thresholdIndex === -1) {
          return { success: false, message: 'Missing expected headers after adding sku or low_stock_threshold.' };
        }

        var productNameIndex = headers.indexOf('product_name');
        if (productNameIndex === -1) {
          return { success: false, message: 'Unable to find product_name header in Products' };
        }

        var lastRow = sheet.getLastRow();
        if (lastRow < 2) {
          return { success: true, rowsUpdated: 0 };
        }

        var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        var existingSkus = [];
        var rowsUpdated = 0;

        values.forEach(function(row) {
          var rowUpdated = false;
          var productId = String(row[productIdIndex] || '').trim();
          var productName = String(row[productNameIndex] || '').trim();
          var rawSkuValue = row[skuIndex];
          if (rawSkuValue === undefined || rawSkuValue === null || String(rawSkuValue).trim() === '') {
            var candidateSku = generateProductSku(productName, productId);
            var uniqueSku = ensureUniqueProductSku(candidateSku, existingSkus);
            row[skuIndex] = uniqueSku;
            existingSkus.push(uniqueSku);
            rowUpdated = true;
          } else {
            existingSkus.push(String(rawSkuValue).trim());
          }

          var rawThresholdValue = row[thresholdIndex];
          if (rawThresholdValue === undefined || rawThresholdValue === null || String(rawThresholdValue).trim() === '') {
            // Preserve existing threshold values; only default missing entries to 0.
            row[thresholdIndex] = 0;
            rowUpdated = true;
          }

          if (rowUpdated) {
            rowsUpdated += 1;
          }
        });

        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).setValues(values);
        Logger.log('Migrated schema 2 -> 3: Added missing Products.sku and low_stock_threshold values to %s rows', rowsUpdated);
        return { success: true, rowsUpdated: rowsUpdated };
      }
    },
    {
      version: 4,
      description: 'Add AppUsers.username column and backfill missing usernames',
      migrate: function() {
        var sheetName = 'AppUsers';
        var sheet = getSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
          return { success: false, message: 'Missing sheet: ' + sheetName };
        }

        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
          return String(value).trim();
        });
        var userIdIndex = headers.indexOf('user_id');
        if (userIdIndex === -1) {
          return { success: false, message: 'Unable to find user_id header in AppUsers' };
        }

        var usernameIndex = headers.indexOf('username');
        if (usernameIndex === -1) {
          sheet.insertColumnAfter(userIdIndex + 1);
          sheet.getRange(1, userIdIndex + 2).setValue('username');
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
            return String(value).trim();
          });
          usernameIndex = headers.indexOf('username');
        }

        if (usernameIndex === -1) {
          return { success: false, message: 'Unable to add username header to AppUsers' };
        }

        var nameIndex = headers.indexOf('name');
        if (nameIndex === -1) {
          return { success: false, message: 'Unable to find name header in AppUsers' };
        }

        var lastRow = sheet.getLastRow();
        if (lastRow < 2) {
          return { success: true, rowsUpdated: 0 };
        }

        var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        var existingUsernames = [];
        var rowsUpdated = 0;

        values.forEach(function(row) {
          var currentUsername = String(row[usernameIndex] || '').trim();
          if (currentUsername !== '') {
            existingUsernames.push(currentUsername.toLowerCase());
          }
        });

        values.forEach(function(row) {
          var rawUsername = String(row[usernameIndex] || '').trim();
          if (rawUsername === '') {
            var name = String(row[nameIndex] || '').trim();
            var candidate = generateAppUserUsername(name);
            var uniqueUsername = ensureUniqueAppUserUsername(candidate, existingUsernames);
            row[usernameIndex] = uniqueUsername;
            rowsUpdated += 1;
          }
        });

        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).setValues(values);
        Logger.log('Migrated schema 3 -> 4: Added missing AppUsers.username values to %s rows', rowsUpdated);
        return { success: true, rowsUpdated: rowsUpdated };

        function generateAppUserUsername(fullName) {
          var name = String(fullName || '').trim().toLowerCase();
          name = name.replace(/[^a-z0-9 ]+/g, '');
          var parts = name.split(/\s+/).filter(function(part) {
            return part !== '';
          });
          if (parts.length === 0) {
            return 'user';
          }
          var firstInitial = parts[0].charAt(0);
          var surname = parts.length === 1 ? parts[0] : parts[parts.length - 1];
          var username = (firstInitial + surname).replace(/\s+/g, '');
          if (!username) {
            return firstInitial || surname || 'user';
          }
          return username;
        }

        function ensureUniqueAppUserUsername(base, existingUsernames) {
          var normalizedBase = String(base || 'user').toLowerCase();
          if (!normalizedBase) {
            normalizedBase = 'user';
          }

          var candidate = normalizedBase;
          var suffix = 1;
          while (existingUsernames.indexOf(candidate.toLowerCase()) !== -1) {
            suffix += 1;
            candidate = normalizedBase + suffix;
          }
          existingUsernames.push(candidate.toLowerCase());
          return candidate;
        }
      }
    },
    {
      version: 5,
      description: 'Add VendorInventory sheet for vendor-held stock ledger',
      migrate: function() {
        var sheetName = 'VendorInventory';
        var sheet = getSpreadsheet().getSheetByName(sheetName);
        if (sheet) {
          return { success: true, rowsUpdated: 0 };
        }

        sheet = getSpreadsheet().insertSheet(sheetName);
        if (!sheet) {
          return { success: false, message: 'Unable to create sheet: ' + sheetName };
        }

        var headers = [
          'vendor_inventory_id',
          'vendor_id',
          'product_id',
          'current_stock',
          'total_stock_received',
          'total_stock_sold',
          'created_at',
          'updated_at'
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

        return { success: true, rowsUpdated: 0 };
      }
    },
    {
      version: 6,
      description: 'Populate missing VendorInventory rows from Inventory data',
      migrate: function() {
        var inventoryRows = getSheetRows('Inventory');
        var created = 0;
        var skipped = 0;
        var failed = 0;
        var failedPairs = [];

        ensureVendorInventorySheet();

        inventoryRows.forEach(function(inventoryRow, rowIndex) {
          if (!inventoryRow.vendor_id || !inventoryRow.product_id) {
            failed += 1;
            failedPairs.push({
              row: rowIndex + 2,
              vendor_id: inventoryRow.vendor_id || null,
              product_id: inventoryRow.product_id || null,
              reason: 'Missing vendor_id or product_id'
            });
            return;
          }

          if (getVendorInventoryRow(inventoryRow.vendor_id, inventoryRow.product_id)) {
            skipped += 1;
            return;
          }

          try {
            createVendorInventoryRowFromInventory(inventoryRow);
            created += 1;
          } catch (error) {
            Logger.log('VendorInventory repair migration failed for inventory row ' + (rowIndex + 2) + ': ' + error.message);
            failed += 1;
            failedPairs.push({
              row: rowIndex + 2,
              vendor_id: inventoryRow.vendor_id,
              product_id: inventoryRow.product_id,
              reason: error.message
            });
          }
        });

        var report = {
          scanned: inventoryRows.length,
          existing: skipped,
          created: created,
          skipped: skipped,
          failed: failed,
          failedPairs: failedPairs
        };

        Logger.log('VendorInventory Repair Migration completed: scanned=%s, existing=%s, created=%s, skipped=%s, failed=%s', report.scanned, report.existing, report.created, report.skipped, report.failed);

        return {
          success: failed === 0,
          message: 'VendorInventory Repair Migration',
          report: report,
          rowsUpdated: created,
          created: created,
          skipped: skipped,
          failed: failed,
          failedPairs: failedPairs
        };
      }
    },
    {
      version: 7,
      description: 'Repair missing VendorInventory rows from Inventory data',
      migrate: function() {
        var inventoryRows = getSheetRows('Inventory');
        var created = 0;
        var skipped = 0;
        var failed = 0;
        var failedPairs = [];

        ensureVendorInventorySheet();

        inventoryRows.forEach(function(inventoryRow, rowIndex) {
          if (!inventoryRow.vendor_id || !inventoryRow.product_id) {
            failed += 1;
            failedPairs.push({
              row: rowIndex + 2,
              vendor_id: inventoryRow.vendor_id || null,
              product_id: inventoryRow.product_id || null,
              reason: 'Missing vendor_id or product_id'
            });
            return;
          }

          if (getVendorInventoryRow(inventoryRow.vendor_id, inventoryRow.product_id)) {
            skipped += 1;
            return;
          }

          try {
            createVendorInventoryRowFromInventory(inventoryRow);
            created += 1;
          } catch (error) {
            Logger.log('VendorInventory repair migration failed for inventory row ' + (rowIndex + 2) + ': ' + error.message);
            failed += 1;
            failedPairs.push({
              row: rowIndex + 2,
              vendor_id: inventoryRow.vendor_id,
              product_id: inventoryRow.product_id,
              reason: error.message
            });
          }
        });

        var report = {
          scanned: inventoryRows.length,
          existing: skipped,
          created: created,
          skipped: skipped,
          failed: failed,
          failedPairs: failedPairs
        };

        Logger.log('VendorInventory Repair Migration completed: scanned=%s, existing=%s, created=%s, skipped=%s, failed=%s', report.scanned, report.existing, report.created, report.skipped, report.failed);

        return {
          success: failed === 0,
          message: 'VendorInventory Repair Migration',
          report: report,
          rowsUpdated: created,
          created: created,
          skipped: skipped,
          failed: failed,
          failedPairs: failedPairs
        };
      }
    },
    {
      version: 8,
      description: 'Repair missing VendorInventory rows from Inventory data',
      migrate: function() {
        var inventoryRows = getSheetRows('Inventory');
        var created = 0;
        var skipped = 0;
        var failed = 0;
        var failedPairs = [];

        ensureVendorInventorySheet();

        inventoryRows.forEach(function(inventoryRow, rowIndex) {
          if (!inventoryRow.vendor_id || !inventoryRow.product_id) {
            failed += 1;
            failedPairs.push({
              row: rowIndex + 2,
              vendor_id: inventoryRow.vendor_id || null,
              product_id: inventoryRow.product_id || null,
              reason: 'Missing vendor_id or product_id'
            });
            return;
          }

          if (getVendorInventoryRow(inventoryRow.vendor_id, inventoryRow.product_id)) {
            skipped += 1;
            return;
          }

          try {
            createVendorInventoryRowFromInventory(inventoryRow);
            created += 1;
          } catch (error) {
            Logger.log('VendorInventory repair migration failed for inventory row ' + (rowIndex + 2) + ': ' + error.message);
            failed += 1;
            failedPairs.push({
              row: rowIndex + 2,
              vendor_id: inventoryRow.vendor_id,
              product_id: inventoryRow.product_id,
              reason: error.message
            });
          }
        });

        var report = {
          scanned: inventoryRows.length,
          existing: skipped,
          created: created,
          skipped: skipped,
          failed: failed,
          failedPairs: failedPairs
        };

        Logger.log('VendorInventory Repair Migration completed: scanned=%s, existing=%s, created=%s, skipped=%s, failed=%s', report.scanned, report.existing, report.created, report.skipped, report.failed);

        return {
          success: failed === 0,
          message: 'VendorInventory Repair Migration',
          report: report,
          rowsUpdated: created,
          created: created,
          skipped: skipped,
          failed: failed,
          failedPairs: failedPairs
        };
      }
    },
    {
      version: 9,
      description: 'Create VendorAssignments sheet and add assigned_by column to Vendors',
      migrate: function() {
        var sheetName = 'Vendors';
        var sheet = getSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
          return { success: false, message: 'Missing sheet: ' + sheetName };
        }

        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
          return String(value).trim();
        });

        var salesRepIndex = headers.indexOf('sales_rep_id');
        if (salesRepIndex === -1) {
          return { success: false, message: 'Unable to find sales_rep_id header in Vendors' };
        }

        var assignedDateIndex = headers.indexOf('assigned_date');
        if (assignedDateIndex === -1) {
          sheet.insertColumnAfter(salesRepIndex + 1);
          sheet.getRange(1, salesRepIndex + 2).setValue('assigned_date');
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
            return String(value).trim();
          });
          assignedDateIndex = headers.indexOf('assigned_date');
        }

        var assignedByIndex = headers.indexOf('assigned_by');
        if (assignedByIndex === -1) {
          var insertAfter = assignedDateIndex !== -1 ? assignedDateIndex + 1 : salesRepIndex + 2;
          sheet.insertColumnAfter(insertAfter);
          sheet.getRange(1, insertAfter + 1).setValue('assigned_by');
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
            return String(value).trim();
          });
          assignedByIndex = headers.indexOf('assigned_by');
        }

        var lastRow = sheet.getLastRow();
        var lastColumn = sheet.getLastColumn();
        var dataRowCount = Math.max(lastRow - 1, 0);
        var values = dataRowCount > 0 ? sheet.getRange(2, 1, dataRowCount, lastColumn).getValues() : [];
        var rowsUpdated = 0;
        var dateCreatedIndex = headers.indexOf('date_created');
        var assignedDateColumn = assignedDateIndex;
        var assignedByColumn = assignedByIndex;

        values.forEach(function(row) {
          if (row[assignedDateColumn] === undefined || row[assignedDateColumn] === null || String(row[assignedDateColumn]).trim() === '') {
            var salesRepId = String(row[salesRepIndex] || '').trim();
            if (salesRepId) {
              row[assignedDateColumn] = row[dateCreatedIndex] || getIsoDate(new Date());
              rowsUpdated += 1;
            }
          }
          if (row[assignedByColumn] === undefined || row[assignedByColumn] === null) {
            row[assignedByColumn] = row[assignedByColumn] || '';
          }
        });

        if (values.length > 0) {
          sheet.getRange(2, 1, values.length, lastColumn).setValues(values);
        }

        ensureVendorAssignmentsSheet();

        return { success: true, rowsUpdated: rowsUpdated };
      }
    }
  ];
}

function ensureVendorInventorySheet() {
  var sheet = getSpreadsheet().getSheetByName('VendorInventory');
  if (sheet) {
    return;
  }

  sheet = getSpreadsheet().insertSheet('VendorInventory');
  if (!sheet) {
    throw new Error('Unable to create VendorInventory sheet');
  }

  var headers = [
    'vendor_inventory_id',
    'vendor_id',
    'product_id',
    'current_stock',
    'total_stock_received',
    'total_stock_sold',
    'created_at',
    'updated_at'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function ensureVendorAssignmentsSheet() {
  var sheet = getSpreadsheet().getSheetByName('VendorAssignments');
  if (sheet) {
    return;
  }

  sheet = getSpreadsheet().insertSheet('VendorAssignments');
  if (!sheet) {
    throw new Error('Unable to create VendorAssignments sheet');
  }

  var headers = [
    'assignment_id',
    'vendor_id',
    'previous_sales_rep_id',
    'new_sales_rep_id',
    'action',
    'assigned_by',
    'assigned_at',
    'reason'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function createVendorInventoryRowFromInventory(inventoryRow) {
  if (!inventoryRow.vendor_id || !inventoryRow.product_id) {
    throw new Error('Invalid inventory row: missing vendor_id or product_id');
  }

  var currentStock = Number(inventoryRow.current_stock);
  var totalReceived = Number(inventoryRow.total_stock_supplied);
  var totalSold = Number(inventoryRow.total_stock_sold);

  if (isNaN(totalReceived)) {
    totalReceived = currentStock;
  }
  if (isNaN(totalSold)) {
    totalSold = 0;
  }
  if (isNaN(currentStock)) {
    currentStock = totalReceived - totalSold;
  }

  appendRow('VendorInventory', [
    generateId('VI'),
    inventoryRow.vendor_id,
    inventoryRow.product_id,
    currentStock,
    totalReceived,
    totalSold,
    getIsoDate(new Date()),
    getIsoDatetime(new Date())
  ]);
}

function setSystemSetting(key, value) {
  var sheet = getSpreadsheet().getSheetByName('SystemSettings');
  if (!sheet) {
    throw createHttpError(500, 'Missing sheet: SystemSettings');
  }

  var rows = getSheetRows('SystemSettings');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
    return String(value).trim();
  });
  var keyIndex = headers.indexOf('setting_key');
  var valueIndex = headers.indexOf('setting_value');
  if (keyIndex === -1 || valueIndex === -1) {
    throw createHttpError(500, 'SystemSettings sheet missing required headers');
  }

  var foundRow = rows.find(function(row) {
    return row.setting_key === key;
  });
  if (foundRow) {
    var rowIndex = rows.findIndex(function(row) {
      return row.setting_key === key;
    }) + 2;
    sheet.getRange(rowIndex, valueIndex + 1).setValue(value);
  } else {
    sheet.appendRow([key, value, '', new Date().toISOString(), new Date().toISOString()]);
  }

  resetSettingsCache();
}
