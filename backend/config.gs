var SPREADSHEET_ID = 'REPLACE_WITH_SPREADSHEET_ID';
var SCRIPT_PROPERTY_API_KEY = 'GAS_API_KEY';
var DEFAULT_PAGE_SIZE = 50;
var MAX_PAGE_SIZE = 200;
var SETTINGS_CACHE = {};

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== 'REPLACE_WITH_SPREADSHEET_ID') {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getExpectedApiKey() {
  return PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTY_API_KEY);
}

function resetSettingsCache() {
  SETTINGS_CACHE = {};
}

function getSystemSetting(key, defaultValue) {
  if (SETTINGS_CACHE[key] !== undefined) {
    return SETTINGS_CACHE[key];
  }
  var items = getSheetRows('SystemSettings');
  var row = items.find(function(item) {
    return item.setting_key === key;
  });
  var value = row ? row.setting_value : defaultValue;
  SETTINGS_CACHE[key] = value;
  return value;
}
