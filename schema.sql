CREATE DATABASE IF NOT EXISTS batloung_fruits
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE batloung_fruits;

-- ============ STAFF, AUTH & ROLES ============

CREATE TABLE profiles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL DEFAULT '',
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  role       ENUM('admin', 'sales') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, role),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Server-side login sessions.
CREATE TABLE sessions (
  token      CHAR(64) PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============ REFERENCE DATA ============

CREATE TABLE fruits (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE box_sizes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          ENUM('Small', 'Medium', 'Large') NOT NULL UNIQUE,
  units_per_box INT NOT NULL,
  description   TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_id       INT UNSIGNED NOT NULL,
  box_size_id    INT UNSIGNED NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_fruit_box (fruit_id, box_size_id),
  FOREIGN KEY (fruit_id) REFERENCES fruits(id),
  FOREIGN KEY (box_size_id) REFERENCES box_sizes(id),
  CONSTRAINT products_price_positive CHECK (unit_price > 0),
  CONSTRAINT products_stock_non_negative CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  province         ENUM('Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo',
                         'Mpumalanga','Northern Cape','North West','Western Cape') NOT NULL,
  contact_person   VARCHAR(255) NOT NULL DEFAULT '',
  telephone        VARCHAR(50) NOT NULL DEFAULT '',
  email            VARCHAR(255) NOT NULL DEFAULT '',
  physical_address VARCHAR(500) NOT NULL DEFAULT '',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE street_vendors (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_code        VARCHAR(50) NOT NULL UNIQUE,
  vendor_name        VARCHAR(255) NOT NULL,
  business_name      VARCHAR(255) NOT NULL DEFAULT '',
  telephone          VARCHAR(50) NOT NULL DEFAULT '',
  location           VARCHAR(255) NOT NULL DEFAULT '',
  registration_date  DATE NOT NULL,
  status             ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  latitude           DOUBLE NULL,
  longitude          DOUBLE NULL,
  location_accuracy  DOUBLE NULL,
  location_updated_at DATETIME NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT street_vendors_lat_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT street_vendors_lng_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

-- purchases = incoming stock from a supplier, sourced from an SA province
CREATE TABLE purchases (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id   INT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED NOT NULL,
  province      ENUM('Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo',
                      'Mpumalanga','Northern Cape','North West','Western Cape') NOT NULL,
  quantity      INT NOT NULL,
  cost_price    DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  notes         TEXT NOT NULL,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT purchases_qty_positive CHECK (quantity > 0),
  CONSTRAINT purchases_cost_positive CHECK (cost_price > 0)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number   VARCHAR(50) NOT NULL UNIQUE,
  vendor_id      INT UNSIGNED NOT NULL,
  status         ENUM('Pending','Confirmed','Processing','Ready','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_date     DATE NOT NULL,
  notes          TEXT NOT NULL,
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by     INT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES street_vendors(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal   DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT order_items_qty_positive CHECK (quantity > 0),
  CONSTRAINT order_items_price_positive CHECK (unit_price > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_fruits_name ON fruits(name);
CREATE INDEX idx_products_fruit ON products(fruit_id);
CREATE INDEX idx_products_box_size ON products(box_size_id);
CREATE INDEX idx_suppliers_province ON suppliers(province);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_vendors_status ON street_vendors(status);
CREATE INDEX idx_vendors_name ON street_vendors(vendor_name);
CREATE INDEX idx_purchases_province ON purchases(province);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============ SEED DATA ============

INSERT INTO fruits (name, description) VALUES
  ('Apples','Sourced from Western Cape, Free State and Mpumalanga'),
  ('Bananas','Sourced from Limpopo, KwaZulu-Natal and Mpumalanga'),
  ('Oranges','Sourced from Limpopo, Mpumalanga and Eastern Cape'),
  ('Mangoes','Sourced from Limpopo, Mpumalanga and KwaZulu-Natal'),
  ('Grapes','Sourced from Western Cape, Northern Cape and Limpopo');

INSERT INTO box_sizes (name, units_per_box, description) VALUES
  ('Small', 20, 'Small box, approx. 5 kg'),
  ('Medium', 45, 'Medium box, approx. 10 kg'),
  ('Large', 90, 'Large box, approx. 20 kg');

INSERT INTO products (fruit_id, box_size_id, unit_price, stock_quantity)
SELECT f.id, b.id,
  CASE f.name
    WHEN 'Apples'  THEN CASE b.name WHEN 'Small' THEN 85.00  WHEN 'Medium' THEN 160.00 ELSE 300.00 END
    WHEN 'Bananas' THEN CASE b.name WHEN 'Small' THEN 70.00  WHEN 'Medium' THEN 135.00 ELSE 255.00 END
    WHEN 'Oranges' THEN CASE b.name WHEN 'Small' THEN 65.00  WHEN 'Medium' THEN 125.00 ELSE 240.00 END
    WHEN 'Mangoes' THEN CASE b.name WHEN 'Small' THEN 95.00  WHEN 'Medium' THEN 180.00 ELSE 340.00 END
    ELSE                CASE b.name WHEN 'Small' THEN 110.00 WHEN 'Medium' THEN 210.00 ELSE 395.00 END
  END,
  CASE b.name WHEN 'Small' THEN 120 WHEN 'Medium' THEN 80 ELSE 40 END
FROM fruits f CROSS JOIN box_sizes b;

INSERT INTO suppliers (name, province, contact_person, telephone, email, physical_address) VALUES
  ('Ceres Valley Orchards','Western Cape','Johan de Villiers','+27 23 316 1122','sales@ceresvalley.co.za','12 Orchard Road, Ceres'),
  ('Tzaneen Tropical Farms','Limpopo','Naledi Mokoena','+27 15 307 4488','orders@tzaneentropical.co.za','Plot 7, Tzaneen'),
  ('Nelspruit Fresh Produce','Mpumalanga','Sipho Nkosi','+27 13 752 9001','info@nelspruitfresh.co.za','45 Kaapsehoop Ave, Mbombela'),
  ('Zululand Banana Co-op','KwaZulu-Natal','Thandi Zulu','+27 35 792 3311','coop@zululandbanana.co.za','Main Road, Empangeni'),
  ('Upington Vine Estates','Northern Cape','Elsa Pretorius','+27 54 332 7788','sales@upingtonvine.co.za','R360, Upington'),
  ('Sundays River Citrus','Eastern Cape','Luvuyo Mbeki','+27 42 233 5566','citrus@sundaysriver.co.za','Kirkwood District'),
  ('Free State Apple Growers','Free State','Pieter Botha','+27 58 303 2244','info@fsapples.co.za','Ficksburg Road, Ficksburg'),
  ('Rustenburg Agri Traders','North West','Kagiso Motaung','+27 14 592 1010','trade@rustenburgagri.co.za','18 Beyers Naude, Rustenburg'),
  ('Joburg Market Distributors','Gauteng','Lerato Dlamini','+27 11 992 8080','hello@jhbmarketdist.co.za','City Deep Market, Johannesburg');

-- (no demo vendors: register your own on the Street vendors page)

INSERT INTO purchases (supplier_id, product_id, province, quantity, cost_price, purchase_date, notes)
SELECT s.id, p.id, s.province, 25, ROUND(p.unit_price * 0.65, 2), DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Opening stock consignment'
FROM suppliers s
JOIN products p ON TRUE
JOIN fruits f ON f.id = p.fruit_id
JOIN box_sizes b ON b.id = p.box_size_id
WHERE (s.name = 'Ceres Valley Orchards' AND f.name = 'Apples'  AND b.name = 'Medium')
   OR (s.name = 'Tzaneen Tropical Farms' AND f.name = 'Mangoes' AND b.name = 'Large')
   OR (s.name = 'Zululand Banana Co-op'  AND f.name = 'Bananas' AND b.name = 'Medium')
   OR (s.name = 'Sundays River Citrus'   AND f.name = 'Oranges' AND b.name = 'Small')
   OR (s.name = 'Upington Vine Estates'  AND f.name = 'Grapes'  AND b.name = 'Small');

-- Mirror the opening stock increase onto the products themselves, since
-- MySQL seed INSERTs don't fire application-layer trigger logic.
UPDATE products p
JOIN purchases pu ON pu.product_id = p.id AND pu.notes = 'Opening stock consignment'
SET p.stock_quantity = p.stock_quantity + pu.quantity;
