-- Removes the 6 demo vendors (BV-001 to BV-006) and the demo orders (ORD-SEED-*)
-- from an EXISTING batloung_fruits database. Vendors you registered yourself are not touched.
-- A demo vendor that also has a REAL order you created is kept (so that order is not lost).
USE batloung_fruits;

-- Put back the stock taken by the completed demo order, then delete the demo orders.
UPDATE products p
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.id = oi.order_id
SET p.stock_quantity = p.stock_quantity + oi.quantity
WHERE o.order_number LIKE 'ORD-SEED-%' AND o.stock_deducted = TRUE;

DELETE FROM orders WHERE order_number LIKE 'ORD-SEED-%';

DELETE FROM street_vendors
WHERE vendor_code IN ('BV-001','BV-002','BV-003','BV-004','BV-005','BV-006')
  AND vendor_name IN ('Mpho Lehloenya','Lineo Mohale','Teboho Ramaema','Palesa Khoza','Thabo Sekhonyana','Nthabiseng Moea')
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.vendor_id = street_vendors.id);

-- What is left:
SELECT vendor_code, vendor_name FROM street_vendors ORDER BY vendor_code;
