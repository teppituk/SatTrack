-- เพิ่มคอลัมน์รูปโปรไฟล์ของผู้ใช้
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;
