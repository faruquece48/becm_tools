CREATE TABLE "RentalBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentalBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalOrder" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "rentedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentalOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    CONSTRAINT "RentalOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RentalOrder_paymentId_key" ON "RentalOrder"("paymentId");
CREATE INDEX "RentalBook_active_idx" ON "RentalBook"("active");
CREATE INDEX "RentalBook_title_idx" ON "RentalBook"("title");
CREATE INDEX "RentalOrder_studentEmail_idx" ON "RentalOrder"("studentEmail");
CREATE INDEX "RentalOrder_status_idx" ON "RentalOrder"("status");
CREATE INDEX "RentalOrder_dueAt_idx" ON "RentalOrder"("dueAt");
CREATE UNIQUE INDEX "RentalOrderItem_orderId_bookId_key" ON "RentalOrderItem"("orderId", "bookId");
CREATE INDEX "RentalOrderItem_bookId_idx" ON "RentalOrderItem"("bookId");
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StudentBillPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalOrderItem" ADD CONSTRAINT "RentalOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RentalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalOrderItem" ADD CONSTRAINT "RentalOrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RentalBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "RentalBook" ("id", "title", "author", "imageUrl", "quantity", "price", "active", "updatedAt") VALUES
('surveying-vol-1', 'Surveying, Volume I', 'B. C. Punmia', '/Image/home.png', 8, 20, true, CURRENT_TIMESTAMP),
('building-construction', 'Building Construction', 'Sushil Kumar', '/Image/home.png', 5, 20, true, CURRENT_TIMESTAMP),
('estimating-costing', 'Estimating and Costing in Civil Engineering', 'B. N. Dutta', '/Image/home.png', 3, 20, true, CURRENT_TIMESTAMP),
('construction-management', 'Construction Planning and Management', 'P. S. Gahlot', '/Image/home.png', 6, 20, true, CURRENT_TIMESTAMP),
('engineering-economy', 'Engineering Economy', 'Leland Blank & Anthony Tarquin', '/Image/home.png', 0, 20, true, CURRENT_TIMESTAMP),
('quantity-surveying', 'Quantity Surveying and Valuation', 'S. C. Rangwala', '/Image/home.png', 4, 20, true, CURRENT_TIMESTAMP);
