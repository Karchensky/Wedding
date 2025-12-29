-- Extend invitation code length from 10 to 20 characters
ALTER TABLE invitations ALTER COLUMN code TYPE VARCHAR(20);

