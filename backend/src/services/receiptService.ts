import { Sale, SaleItem, Payment, Product, Customer, BrandSettings } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { objectStorage } from "../storage/cloudinaryStorage"
import type { ReceiptData } from "../pdf/ReceiptDocument.js" with { "resolution-mode": "import" }
import { HttpError } from "../errors"

export async function generateReceipt(organizationId: string, saleId: string): Promise<string> {
  const sale = await withOrgTransaction(organizationId, (t) =>
    Sale.findOne({
      where: { organizationId, id: saleId },
      include: [
        { model: SaleItem, as: "SaleItems", include: [Product] },
        { model: Payment, as: "Payments" },
        { model: Customer, as: "Customer" },
      ],
      transaction: t,
    })
  )
  if (!sale) throw new HttpError("Sale not found", 404)

  const brandSettings = await withOrgTransaction(organizationId, (t) =>
    BrandSettings.findOne({ where: { organizationId }, transaction: t })
  )

  const amountPaid = (sale.Payments ?? []).reduce((sum, p) => sum + p.amount, 0)

  const data: ReceiptData = {
    receiptNumber: sale.receiptNumber,
    createdAt: sale.createdAt,
    customerName: sale.Customer?.name ?? "Walk-in Customer",
    items: (sale.SaleItems ?? []).map((item) => ({
      productName: item.Product?.name ?? "Product",
      quantity: item.quantity,
      unitPrice: item.unitPriceAtSale,
      total: item.quantity * item.unitPriceAtSale,
    })),
    totalAmount: sale.totalAmount,
    amountPaid,
    balance: sale.totalAmount - amountPaid,
    brand: {
      displayName: brandSettings?.displayName ?? "Receipt",
      logoUrl: brandSettings?.logoUrl ?? null,
      primaryColor: brandSettings?.primaryColor ?? "#0C6B5E",
    },
  }

  // @react-pdf/renderer is ESM-only; src/pdf is a scoped ESM boundary
  // (its own package.json) so it can import it statically. This dynamic
  // import is the sanctioned way to call into that from CJS.
  const { generateReceiptPdf } = await import("../pdf/generate.js")
  const buffer = await generateReceiptPdf(data)

  const uploaded = await objectStorage.upload({
    buffer,
    contentType: "application/pdf",
    extension: "pdf",
    keyPrefix: `receipts/${organizationId}`,
    resourceType: "raw",
  })

  await withOrgTransaction(organizationId, (t) =>
    Sale.update(
      { latestReceiptUrl: uploaded.url, receiptGeneratedAt: new Date() },
      { where: { organizationId, id: saleId }, transaction: t }
    )
  )

  return uploaded.url
}
