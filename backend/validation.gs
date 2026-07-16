function validateRequiredFields(payload, requiredFields) {
  var missing = requiredFields.filter(function(field) {
    return payload[field] === undefined || payload[field] === null || payload[field] === '';
  });
  if (missing.length) {
    throw createHttpError(400, 'Missing required fields: ' + missing.join(', '));
  }
}

function validateStringField(value, fieldName) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw createHttpError(400, fieldName + ' must be a string.');
  }
}

function validateNumberField(value, fieldName) {
  if (value !== undefined && value !== null) {
    var parsed = Number(value);
    if (isNaN(parsed)) {
      throw createHttpError(400, fieldName + ' must be a number.');
    }
  }
}

function validateNonNegativeNumberField(value, fieldName) {
  validateNumberField(value, fieldName);
  if (value !== undefined && value !== null && Number(value) < 0) {
    throw createHttpError(400, fieldName + ' must be a non-negative number.');
  }
}

function validateDateField(value, fieldName) {
  if (value !== undefined && value !== null && value !== '') {
    var date = new Date(value);
    if (isNaN(date.getTime())) {
      throw createHttpError(400, fieldName + ' must be a valid ISO date or datetime string.');
    }
  }
}

function validatePagination(params) {
  var page = params.page ? Number(params.page) : 1;
  var pageSize = params.pageSize ? Number(params.pageSize) : DEFAULT_PAGE_SIZE;
  if (isNaN(page) || page < 1) {
    throw createHttpError(400, 'page must be a positive integer.');
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw createHttpError(400, 'pageSize must be a positive integer between 1 and ' + MAX_PAGE_SIZE + '.');
  }
  return {
    page: page,
    pageSize: pageSize
  };
}

function validateForeignKey(value, entityName, items, keyName) {
  if (value && !items.some(function(item) {
    return item[keyName] === value;
  })) {
    throw createHttpError(400, 'Invalid ' + entityName + ' reference: ' + value);
  }
}

function validateProductPayload(body) {
  validateRequiredFields(body, ['product_name', 'category', 'unit', 'default_unit_price', 'currency']);
  validateStringField(body.product_name, 'product_name');
  validateStringField(body.category, 'category');
  validateStringField(body.unit, 'unit');
  validateStringField(body.currency, 'currency');
  validateNonNegativeNumberField(body.default_unit_price, 'default_unit_price');
}

function validateProductUpdatePayload(body) {
  if (!body || Object.keys(body).length === 0) {
    throw createHttpError(400, 'At least one product field must be provided.');
  }
  if (body.product_name !== undefined) validateStringField(body.product_name, 'product_name');
  if (body.category !== undefined) validateStringField(body.category, 'category');
  if (body.unit !== undefined) validateStringField(body.unit, 'unit');
  if (body.currency !== undefined) validateStringField(body.currency, 'currency');
  if (body.default_unit_price !== undefined) validateNonNegativeNumberField(body.default_unit_price, 'default_unit_price');
  if (body.active !== undefined && body.active !== null && body.active !== '') {
    var activeValue = String(body.active).toLowerCase();
    if (activeValue !== 'true' && activeValue !== 'false') {
      throw createHttpError(400, 'active must be true or false.');
    }
  }
}

function validateSalesRepPayload(body) {
  validateRequiredFields(body, ['full_name', 'phone']);
  validateStringField(body.full_name, 'full_name');
  validateStringField(body.phone, 'phone');
}

function validateSalesRepUpdatePayload(body) {
  if (!body || Object.keys(body).length === 0) {
    throw createHttpError(400, 'At least one sales rep field must be provided.');
  }
  if (body.full_name !== undefined) validateStringField(body.full_name, 'full_name');
  if (body.phone !== undefined) validateStringField(body.phone, 'phone');
  if (body.status !== undefined) validateStringField(body.status, 'status');
}

function validateVendorUpdatePayload(body) {
  if (!body || Object.keys(body).length === 0) {
    throw createHttpError(400, 'At least one vendor field must be provided.');
  }
  if (body.vendor_name !== undefined) validateStringField(body.vendor_name, 'vendor_name');
  if (body.phone !== undefined) validateStringField(body.phone, 'phone');
  if (body.location !== undefined) validateStringField(body.location, 'location');
  if (body.sales_rep_id !== undefined) validateStringField(body.sales_rep_id, 'sales_rep_id');
  if (body.status !== undefined) validateStringField(body.status, 'status');
}

function createHttpError(statusCode, message, details) {
  var error = new Error(message);
  error.statusCode = statusCode;
  error.details = details || null;
  return error;
}
