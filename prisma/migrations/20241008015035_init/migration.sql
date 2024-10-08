-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "para" TEXT NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardItem" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,

    CONSTRAINT "CardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddToCart" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cardItemId" INTEGER NOT NULL,
    "authId" INTEGER NOT NULL,

    CONSTRAINT "AddToCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auth_email_key" ON "Auth"("email");

-- AddForeignKey
ALTER TABLE "CardItem" ADD CONSTRAINT "CardItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddToCart" ADD CONSTRAINT "AddToCart_cardItemId_fkey" FOREIGN KEY ("cardItemId") REFERENCES "CardItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddToCart" ADD CONSTRAINT "AddToCart_authId_fkey" FOREIGN KEY ("authId") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
