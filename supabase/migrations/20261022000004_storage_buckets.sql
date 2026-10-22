-- ==============================================================================
-- Migration: 20261022000004_storage_buckets.sql
-- Description: Storage buckets for profile photos and verification selfies
-- Non-Negotiable: Private buckets, 5MB size limit, JPEG/PNG/WebP only.
-- ==============================================================================

-- 1. Create Storage Buckets (both marked private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'photos', 
        'photos', 
        false, 
        5242880, -- 5 MB in bytes
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'selfies', 
        'selfies', 
        false, 
        5242880, -- 5 MB in bytes
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for 'photos' Bucket
-- Owner can upload photos into their own folder: photos/{user_id}/*
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner can update/delete their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated members can read photos (served via signed URLs or read policy for active profiles)
CREATE POLICY "Authenticated members can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'photos'
);

-- 3. Storage RLS Policies for 'selfies' Bucket (Strictly Private)
-- Owner can upload a selfie to: selfies/{user_id}/*
CREATE POLICY "Users can upload own verification selfie"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'selfies' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only the owner and Admins can view selfies
CREATE POLICY "Selfies visible only to owner and admins"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'selfies' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);

-- Only admins can delete selfies after review is concluded (or owner upon account deletion)
CREATE POLICY "Admins or owner can delete selfie"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'selfies' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);
