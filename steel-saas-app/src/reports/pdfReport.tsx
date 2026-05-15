import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DesignResult } from "../domain/resultContract";

export type ReportMeta = {
  projectName: string;
  client: string;
  location: string;
  codeProfile: string;
  unitSystem: string;
  engineerName?: string;
  engineerRegistration?: string;
  reportDate?: string;
  engineVersion: string;
  reportTimestamp: string;
};

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
  },
  // section
  section: { marginBottom: 12 },
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  // header block
  reportTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  moduleLabel: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 12,
  },
  // two-column grid
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "50%", marginBottom: 3 },
  gridLabel: { fontFamily: "Helvetica-Bold", marginRight: 4 },
  // table rows
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableLabel: { width: "60%", color: "#374151" },
  tableValue: { width: "40%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  // pass / fail badge
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  badgePass: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#15803d",
    marginRight: 6,
  },
  badgeFail: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#b91c1c",
    marginRight: 6,
  },
  passText: { color: "#15803d" },
  failText: { color: "#b91c1c" },
  // calculation lines
  calcLine: { fontFamily: "Courier", fontSize: 8, marginBottom: 2, color: "#374151" },
  // warnings
  warning: { color: "#92400e", marginBottom: 2 },
  warningBox: {
    backgroundColor: "#fffbeb",
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    marginBottom: 4,
  },
  // EOR signature
  sigField: { flexDirection: "row", marginBottom: 5 },
  sigLabel: { fontFamily: "Helvetica-Bold", width: "38%" },
  sigLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    marginLeft: 4,
  },
  sigValue: { flex: 1, marginLeft: 4 },
  // footer meta
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    color: "#6b7280",
  },
  disclaimer: {
    fontSize: 7.5,
    color: "#9ca3af",
    fontFamily: "Helvetica-Oblique",
    marginTop: 10,
    lineHeight: 1.4,
  },
});

// ── helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function TableRow({ label, value, pass }: { label: string; value: string; pass?: boolean }) {
  const valueStyle =
    pass === true ? [s.tableValue, s.passText] :
    pass === false ? [s.tableValue, s.failText] :
    s.tableValue;
  return (
    <View style={s.tableRow}>
      <Text style={s.tableLabel}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

function SignatureLine({ label, value }: { label: string; value?: string }) {
  return (
    <View style={s.sigField}>
      <Text style={s.sigLabel}>{label}:</Text>
      {value ? <Text style={s.sigValue}>{value}</Text> : <View style={s.sigLine} />}
    </View>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

type Props = { result: DesignResult; meta: ReportMeta };

export function PdfReport({ result, meta }: Props) {
  const moduleLabel = result.moduleType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const overallPass = result.displayResults.pass as boolean;

  // split section designation entries from demand inputs
  const inputEntries = Object.values(result.displayInputSnapshot).filter(
    (e) => e.unit !== "designation",
  );
  const sectionEntries = Object.values(result.displayInputSnapshot).filter(
    (e) => e.unit === "designation",
  );

  // display results excluding the raw boolean pass field (shown as badge)
  const resultEntries = Object.entries(result.displayResults).filter(
    ([key]) => key !== "pass",
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── 1. Header ───────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.reportTitle}>Structural Steel Design Calculation</Text>
          <Text style={s.moduleLabel}>{moduleLabel} Design</Text>
          <View style={s.grid}>
            <View style={s.gridCell}>
              <Text><Text style={s.gridLabel}>Project:</Text> {meta.projectName}</Text>
            </View>
            <View style={s.gridCell}>
              <Text><Text style={s.gridLabel}>Code:</Text> {meta.codeProfile}</Text>
            </View>
            <View style={s.gridCell}>
              <Text><Text style={s.gridLabel}>Client:</Text> {meta.client}</Text>
            </View>
            <View style={s.gridCell}>
              <Text><Text style={s.gridLabel}>Unit System:</Text> {meta.unitSystem}</Text>
            </View>
            <View style={s.gridCell}>
              <Text><Text style={s.gridLabel}>Location:</Text> {meta.location}</Text>
            </View>
          </View>
        </View>

        {/* ── 2. Engineer of Record ───────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Engineer of Record" />
          <SignatureLine label="Printed name" value={meta.engineerName} />
          <SignatureLine label="License number" value={meta.engineerRegistration} />
          <SignatureLine label="Signature" />
          <SignatureLine label="Date" value={meta.reportDate} />
        </View>

        {/* ── 3. Input Summary ────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Input Summary" />
          {inputEntries.map((entry, i) => (
            <TableRow
              key={i}
              label={entry.label}
              value={`${entry.value} ${entry.unit}`}
            />
          ))}
        </View>

        {/* ── 4. Selected Section Properties ──────────────────────────── */}
        {sectionEntries.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="Selected Section" />
            {sectionEntries.map((entry, i) => (
              <TableRow key={i} label={entry.label} value={String(entry.value)} />
            ))}
          </View>
        )}

        {/* ── 5. Governing Checks ─────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Governing Checks" />
          <View style={s.badgeRow}>
            <Text style={overallPass ? s.badgePass : s.badgeFail}>
              {overallPass ? "✓  PASS" : "✗  FAIL"}
            </Text>
          </View>
          {resultEntries.map(([key, value], i) => {
            const isRatio = key.toLowerCase().includes("ratio") || key.toLowerCase().includes("dcr");
            const numVal = typeof value === "number" ? value : null;
            const passProp =
              isRatio && numVal !== null ? numVal <= 1 :
              typeof value === "boolean" ? (value as boolean) :
              undefined;
            return (
              <TableRow
                key={i}
                label={key.replace(/([A-Z])/g, " $1").trim()}
                value={String(value)}
                pass={passProp}
              />
            );
          })}
          {result.calculationLines.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 3 }}>
                Calculation
              </Text>
              {result.calculationLines.map((line, i) => (
                <Text key={i} style={s.calcLine}>{line}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── 6. Warnings ─────────────────────────────────────────────── */}
        {result.warnings.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="Warnings" />
            <View style={s.warningBox}>
              {result.warnings.map((w, i) => (
                <Text key={i} style={s.warning}>• {w}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ── 7. Code Clause References ───────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Code Clause References" />
          {result.codeReferences.map((ref, i) => (
            <Text key={i} style={{ marginBottom: 2 }}>• {ref}</Text>
          ))}
        </View>

        {/* ── 8. Engine Version + Report Timestamp ────────────────────── */}
        <View style={[s.section, { marginTop: 8 }]}>
          <SectionHeader title="Report Metadata" />
          <View style={s.metaRow}>
            <Text>Engine: {meta.engineVersion}</Text>
            <Text>Section DB: {result.sectionDbVersion}</Text>
            <Text>Generated: {meta.reportTimestamp}</Text>
          </View>
        </View>

        {/* ── 9. Disclaimer ───────────────────────────────────────────── */}
        <Text style={s.disclaimer}>
          DISCLAIMER: This calculation has been prepared using automated software and is intended
          for use by qualified structural engineers only. The engineer of record is solely
          responsible for verifying all inputs, outputs, and applicability to the specific project
          conditions. Section properties are seeded values and must be verified against a recognised
          section database before use in a paid or production context. This document does not
          constitute a stamped engineering drawing or a final design deliverable.
        </Text>

      </Page>
    </Document>
  );
}
