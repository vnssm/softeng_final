ALTER TABLE facilities
  ADD COLUMN condition_status
    ENUM('Available', 'Unavailable', 'Under maintenance')
    NOT NULL DEFAULT 'Available'
    AFTER is_available;

UPDATE facilities
SET condition_status = CASE
  WHEN is_available = 1 THEN 'Available'
  ELSE 'Unavailable'
END;
