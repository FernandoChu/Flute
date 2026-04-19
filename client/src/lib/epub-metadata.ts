import JSZip from "jszip";

const DC_NS = "http://purl.org/dc/elements/1.1/";

export async function extractEpubTitle(file: File): Promise<string | null> {
  const zip = await JSZip.loadAsync(file);
  const container = zip.file("META-INF/container.xml");
  if (!container) return null;

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(
    await container.async("text"),
    "application/xml",
  );
  const opfPath = containerDoc
    .querySelector("rootfile")
    ?.getAttribute("full-path");
  if (!opfPath) return null;

  const opf = zip.file(opfPath);
  if (!opf) return null;

  const opfDoc = parser.parseFromString(
    await opf.async("text"),
    "application/xml",
  );
  const titleEl = opfDoc.getElementsByTagNameNS(DC_NS, "title")[0];
  const title = titleEl?.textContent?.trim();
  return title || null;
}
