-- CreateTable
CREATE TABLE "work_order_visits" (
    "id" SERIAL NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "checkin_ts" TIMESTAMP(3) NOT NULL,
    "checkout_ts" TIMESTAMP(3),

    CONSTRAINT "work_order_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_order_visits_work_order_id_idx" ON "work_order_visits"("work_order_id");

-- AddForeignKey
ALTER TABLE "work_order_visits" ADD CONSTRAINT "work_order_visits_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
