-- Stud listings: sex must be male only (case-insensitive).

UPDATE stud_listings
SET sex = 'Male'
WHERE sex IS NOT NULL
  AND lower(trim(sex)) <> 'male';

ALTER TABLE stud_listings
  DROP CONSTRAINT IF EXISTS stud_listings_sex_male_only;

ALTER TABLE stud_listings
  ADD CONSTRAINT stud_listings_sex_male_only
  CHECK (sex IS NULL OR lower(trim(sex)) = 'male');
