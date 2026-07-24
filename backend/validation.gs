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

function validateAppUserPayload(body) {
  validateRequiredFields(body, ['email', 'phone', 'name', 'role', 'status', 'password_hash']);
  validateStringField(body.user_id, 'user_id');
  validateStringField(body.email, 'email');
  validateStringField(body.phone, 'phone');
  validateStringField(body.name, 'name');
  validateStringField(body.role, 'role');
  validateStringField(body.status, 'status');
  if (body.sales_rep_id !== undefined) {
    validateStringField(body.sales_rep_id, 'sales_rep_id');
  }
  validateStringField(body.password_hash, 'password_hash');
  validateStringField(body.password_reset_required, 'password_reset_required');
  validateStringField(body.last_login, 'last_login');
  validateStringField(body.is_system_user, 'is_system_user');
  validateStringField(body.last_failed_login, 'last_failed_login');
  validateStringField(body.lockout_until, 'lockout_until');
  validateStringField(body.updated_by, 'updated_by');
  validateStringField(body.password_changed_at, 'password_changed_at');
  validateStringField(body.date_created, 'date_created');
  validateStringField(body.last_updated, 'last_updated');

  validateRoleWhitelist(body.role);
  validateStatusWhitelist(body.status);
}

function validateAppUserUpdatePayload(body) {
  if (!body || Object.keys(body).length === 0) {
    throw createHttpError(400, 'At least one AppUser field must be provided.');
  }
  if (body.user_id !== undefined) validateStringField(body.user_id, 'user_id');
  if (body.email !== undefined) validateStringField(body.email, 'email');
  if (body.phone !== undefined) validateStringField(body.phone, 'phone');
  if (body.name !== undefined) validateStringField(body.name, 'name');
  if (body.role !== undefined) {
    validateStringField(body.role, 'role');
    validateRoleWhitelist(body.role);
  }
  if (body.status !== undefined) {
    validateStringField(body.status, 'status');
    validateStatusWhitelist(body.status);
  }
  if (body.sales_rep_id !== undefined) validateStringField(body.sales_rep_id, 'sales_rep_id');
  if (body.password_hash !== undefined) validateStringField(body.password_hash, 'password_hash');
  if (body.password_reset_required !== undefined) validateStringField(body.password_reset_required, 'password_reset_required');
  if (body.last_login !== undefined) validateStringField(body.last_login, 'last_login');
  if (body.is_system_user !== undefined) validateStringField(body.is_system_user, 'is_system_user');
  if (body.last_failed_login !== undefined) validateStringField(body.last_failed_login, 'last_failed_login');
  if (body.lockout_until !== undefined) validateStringField(body.lockout_until, 'lockout_until');
  if (body.updated_by !== undefined) validateStringField(body.updated_by, 'updated_by');
  if (body.password_changed_at !== undefined) validateStringField(body.password_changed_at, 'password_changed_at');
  if (body.last_updated !== undefined) validateStringField(body.last_updated, 'last_updated');
}

function validateRoleWhitelist(value) {
  if (value !== 'super_admin' && value !== 'admin' && value !== 'supervisor' && value !== 'agent') {
    throw createHttpError(400, 'Invalid role: ' + value);
  }
}

function validateStatusWhitelist(value) {
  if (value !== 'active' && value !== 'inactive' && value !== 'suspended') {
    throw createHttpError(400, 'Invalid status: ' + value);
  }
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
