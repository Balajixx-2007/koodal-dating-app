-- ==============================================================================
-- Migration: 20261022000001_extensions_and_enums.sql
-- Description: Core extensions and enums for Koodal Platform
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumerated Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_intent') THEN
        CREATE TYPE relationship_intent AS ENUM ('casual', 'long_term', 'marriage', 'friendship');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'pending_verification', 'suspended', 'banned');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
        CREATE TYPE report_reason AS ENUM (
            'inappropriate_content', 
            'fake_profile', 
            'underage', 
            'harassment', 
            'scam', 
            'intent_mismatch', 
            'other'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM (
            'pending', 
            'reviewed_warned', 
            'reviewed_suspended', 
            'reviewed_banned', 
            'dismissed'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_result') THEN
        CREATE TYPE verification_result AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;
