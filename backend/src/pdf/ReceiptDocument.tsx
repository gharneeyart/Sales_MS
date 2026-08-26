import path from "node:path"
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer"

// The base-14 PDF fonts (Helvetica etc.) only cover WinAnsi/Latin-1, which
// doesn't include the Naira sign (U+20A6) — it renders as a broken glyph
// without a Unicode font registered.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(import.meta.dirname, "fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(import.meta.dirname, "fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
})

export interface ReceiptData {
  receiptNumber: string
  createdAt: Date
  customerName: string
  items: { productName: string; quantity: number; unitPrice: number; total: number }[]
  totalAmount: number
  amountPaid: number
  balance: number
  brand: { displayName: string; logoUrl: string | null; primaryColor: string }
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
function formatKobo(kobo: number): string {
  return nairaFormatter.format(kobo / 100).replace("NGN", "₦")
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Noto Sans", color: "#16211E" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  headerLeft: { flexDirection: "row", gap: 10, alignItems: "center" },
  logo: { width: 40, height: 40, borderRadius: 6 },
  businessName: { fontSize: 16, fontWeight: 700 },
  receiptMeta: { alignItems: "flex-end" },
  label: { color: "#647069", fontSize: 9 },
  section: { marginBottom: 16 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E9E7",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  headerCell: { fontSize: 9, color: "#647069", fontWeight: 700 },
  totalsBlock: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: "#647069" },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E4E9E7",
  },
  stamp: { fontSize: 12, fontWeight: 700, padding: "6 12", borderRadius: 4, color: "#FFFFFF" },
  footer: { marginTop: 40, textAlign: "center", color: "#647069", fontSize: 9 },
})

function ReceiptDocument({ data }: { data: ReceiptData }) {
  const isPaid = data.balance <= 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.brand.logoUrl && <Image src={data.brand.logoUrl} style={styles.logo} />}
            <Text style={[styles.businessName, { color: data.brand.primaryColor }]}>
              {data.brand.displayName}
            </Text>
          </View>
          <View style={styles.receiptMeta}>
            <Text>Receipt {data.receiptNumber}</Text>
            <Text style={styles.label}>
              {data.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Billed to</Text>
          <Text>{data.customerName}</Text>
        </View>

        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colItem, styles.headerCell]}>Item</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
            <Text style={[styles.colPrice, styles.headerCell]}>Unit price</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colItem}>{item.productName}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatKobo(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatKobo(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total</Text>
            <Text>{formatKobo(data.totalAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Amount paid</Text>
            <Text>{formatKobo(data.amountPaid)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={{ fontWeight: 700 }}>Balance</Text>
            <Text style={{ fontWeight: 700, color: data.balance > 0 ? "#D64545" : "#16211E" }}>
              {formatKobo(data.balance)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16, alignItems: "flex-end" }}>
          <Text style={[styles.stamp, { backgroundColor: isPaid ? "#1FA971" : "#D64545" }]}>
            {isPaid ? "PAID" : `BALANCE DUE: ${formatKobo(data.balance)}`}
          </Text>
        </View>

        <Text style={styles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  )
}

export { ReceiptDocument }
