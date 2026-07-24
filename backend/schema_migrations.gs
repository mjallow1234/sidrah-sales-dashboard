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
        'date_created',
        'last_updated',
        'status'
      ]
    },
    {
      name: 'Products',
      headers: [
        'product_id',
        'product_name',
        'category',
        'unit',
        'default_unit_price',
        'currency',
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
      var result = migration.migrate();
      if (!result.success) {
        return {
          success: false,
          message: 'Migration to version ' + migration.version + ' failed: ' + result.message,
          migrationLog: migrationLog
        };
      }
      currentVersion = migration.version;
      migrationLog.push({
        from: migration.version - 1,
        to: migration.version,
        description: migration.description,
        rowsUpdated: result.rowsUpdated || 0,
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
    }
  ];
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
