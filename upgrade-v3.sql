-- Upgrade for an EXISTING batloung_fruits database (adds live GPS to vendors).
-- Run this ONCE. Fresh installs already get these columns from schema.sql.
USE batloung_fruits;

ALTER TABLE street_vendors
  ADD COLUMN latitude DOUBLE NULL,
  ADD COLUMN longitude DOUBLE NULL,
  ADD COLUMN location_accuracy DOUBLE NULL,
  ADD COLUMN location_updated_at DATETIME NULL;

ALTER TABLE street_vendors
  ADD CONSTRAINT street_vendors_lat_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT street_vendors_lng_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
