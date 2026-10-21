ALTER TABLE equipment
  MODIFY COLUMN condition_status VARCHAR(32)
    NULL DEFAULT 'Available';

UPDATE equipment
SET condition_status = CASE
  WHEN condition_status IN ('Good', 'Available') THEN 'Available'
  WHEN condition_status IN ('Needs Repair', 'Under maintenance') THEN 'Under maintenance'
  WHEN condition_status IN ('Damaged', 'Unavailable') THEN 'Unavailable'
  ELSE 'Unavailable'
END;

ALTER TABLE equipment
  MODIFY COLUMN condition_status
    ENUM('Available', 'Unavailable', 'Under maintenance')
    NOT NULL DEFAULT 'Available';
