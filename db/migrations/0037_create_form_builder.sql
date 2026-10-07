CREATE TABLE IF NOT EXISTS form_definitions (
  form_id VARCHAR(32) NOT NULL,
  form_key VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  form_type VARCHAR(64) NOT NULL DEFAULT 'standalone',
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(32) NOT NULL,
  updated_by VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (form_id),
  UNIQUE KEY ux_form_definitions_key (form_key),
  KEY idx_form_definitions_status (status),
  CONSTRAINT fk_form_definitions_created_by FOREIGN KEY (created_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_form_definitions_updated_by FOREIGN KEY (updated_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_versions (
  form_version_id VARCHAR(40) NOT NULL,
  form_id VARCHAR(32) NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  published_at DATETIME NULL,
  PRIMARY KEY (form_version_id),
  UNIQUE KEY ux_form_versions_form_version (form_id, version_number),
  KEY idx_form_versions_form_status (form_id, status),
  CONSTRAINT fk_form_versions_form FOREIGN KEY (form_id) REFERENCES form_definitions (form_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_form_versions_created_by FOREIGN KEY (created_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_fields (
  field_id VARCHAR(40) NOT NULL,
  form_version_id VARCHAR(40) NOT NULL,
  field_key VARCHAR(128) NOT NULL,
  field_type VARCHAR(32) NOT NULL,
  label VARCHAR(255) NOT NULL,
  order_index INT UNSIGNED NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  placeholder VARCHAR(255) NULL,
  help_text TEXT NULL,
  options_json JSON NULL,
  is_protected BOOLEAN NOT NULL DEFAULT FALSE,
  system_key VARCHAR(128) NULL,
  PRIMARY KEY (field_id),
  UNIQUE KEY ux_form_fields_version_key (form_version_id, field_key),
  KEY idx_form_fields_version_order (form_version_id, order_index),
  CONSTRAINT fk_form_fields_version FOREIGN KEY (form_version_id) REFERENCES form_versions (form_version_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_submissions (
  submission_id VARCHAR(40) NOT NULL,
  form_id VARCHAR(32) NOT NULL,
  form_version_id VARCHAR(40) NOT NULL,
  submitted_by VARCHAR(32) NOT NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  submitted_at DATETIME NOT NULL,
  PRIMARY KEY (submission_id),
  KEY idx_form_submissions_form_date (form_id, submitted_at),
  KEY idx_form_submissions_version (form_version_id),
  CONSTRAINT fk_form_submissions_form FOREIGN KEY (form_id) REFERENCES form_definitions (form_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_form_submissions_version FOREIGN KEY (form_version_id) REFERENCES form_versions (form_version_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_form_submissions_user FOREIGN KEY (submitted_by) REFERENCES app_users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
