-- Work report quantity is free-form text (digital replica of handwritten field sheet).

ALTER TABLE "work_report_rows" ALTER COLUMN "quantity" SET DATA TYPE TEXT USING ("quantity"::text);
