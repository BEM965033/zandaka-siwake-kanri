-- Enable Row Level Security on all application tables
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user personal app, no auth required)
CREATE POLICY "allow_all" ON "Account" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON "Category" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON "Transaction" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON "JournalEntry" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON "_prisma_migrations" FOR ALL USING (true) WITH CHECK (true);
