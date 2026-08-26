/** "00:00 WAT today" as a UTC instant — independent of the server's own timezone (A.10). */
export function startOfTodayWAT(): Date {
  const watNow = new Date(Date.now() + 60 * 60 * 1000)
  const watMidnightUtc = Date.UTC(watNow.getUTCFullYear(), watNow.getUTCMonth(), watNow.getUTCDate())
  return new Date(watMidnightUtc - 60 * 60 * 1000)
}
