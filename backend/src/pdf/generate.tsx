import { renderToBuffer } from "@react-pdf/renderer"

import { ReceiptDocument, type ReceiptData } from "./ReceiptDocument.js"

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument data={data} />)
}
