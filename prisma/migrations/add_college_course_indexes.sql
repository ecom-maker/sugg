CREATE INDEX CONCURRENTLY IF NOT EXISTS "courses_college_id_idx" ON "courses" ("college_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "colleges_status_idx" ON "colleges" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "colleges_city_idx" ON "colleges" ("city");
