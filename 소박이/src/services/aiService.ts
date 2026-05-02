import { apiPost } from "../lib/apiClient";

export interface ReceiptParsePayload {
  imageUrl: string;
}

export interface ReceiptParseResult {
  items: Array<{ name: string; price: number; count: number }>;
  total: number;
}

export function parseReceipt(payload: ReceiptParsePayload): Promise<ReceiptParseResult> {
  return apiPost<ReceiptParseResult, ReceiptParsePayload>("/api/v1/ai/receipt/parse", payload);
}
