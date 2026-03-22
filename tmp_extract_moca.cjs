const fs = require("fs");

(async () => {
  const path = "MOCA-8.1.8.2-English.pdf";
  const data = new Uint8Array(fs.readFileSync(path));
  const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await mod.getDocument({ data }).promise;

  console.log("pages", pdf.numPages);

  let out = "";
  for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
    const p = await pdf.getPage(i);
    const tc = await p.getTextContent();
    const t = tc.items.map((x) => x.str).join(" ");
    out += `\n---PAGE ${i}---\n${t}`;
  }

  fs.writeFileSync("moca_pdf_extract.txt", out, "utf8");
  console.log("wrote moca_pdf_extract.txt", out.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
