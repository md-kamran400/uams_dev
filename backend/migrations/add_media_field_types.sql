-- Migration: extend field_type enum to support photo + video evidence fields
-- These store an array of file IDs in submissions.values[fieldId]; the file
-- contents live in the `files` table + on-disk upload directory.

ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'photo';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'video';
