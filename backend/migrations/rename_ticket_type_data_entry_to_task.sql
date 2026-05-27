-- Migration: Rename ticket_type enum value 'Data Entry' to 'Task'
-- Run this on the PostgreSQL database

ALTER TYPE ticket_type RENAME VALUE 'Data Entry' TO 'Task';
