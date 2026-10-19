import QRCode from "qrcode";

export const qrSvg = (text: string) =>
  QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#131519", light: "#ffffff" } });

export const qrPng = (text: string) => QRCode.toBuffer(text, { margin: 1, width: 480, errorCorrectionLevel: "M" });
