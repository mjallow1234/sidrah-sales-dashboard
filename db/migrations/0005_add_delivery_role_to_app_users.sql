-- Add 'delivery' role to app_users.role enum (Delivery V1 feature).
ALTER TABLE app_users
  MODIFY COLUMN role ENUM('super_admin','admin','supervisor','agent','delivery') NOT NULL;
