import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfReport, type ReportMeta } from "./pdfReport";
import type { DesignResult } from "../domain/resultContract";

export type { ReportMeta } from "./pdfReport";

export async function generatePdfReport(
  result: DesignResult,
  meta: ReportMeta,
): Promise<Buffer> {
  const element = React.createElement(PdfReport, { result, meta });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any) as Promise<Buffer>;
}
