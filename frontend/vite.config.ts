import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import FormData from "form-data";

// Inline server plugin — keeps Pinata keys on server side only
function ipfsUploadPlugin(): Plugin {
  return {
    name: "ipfs-upload-proxy",
    configureServer(server) {
      server.middlewares.use("/api/upload", async (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }

        const PINATA_KEY = process.env.PINATA_API_KEY;
        const PINATA_SECRET = process.env.PINATA_SECRET_API_KEY;
        if (!PINATA_KEY || !PINATA_SECRET) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Pinata credentials not configured" }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks);

          // Parse multipart to get file content (simple boundary extraction)
          const contentType = req.headers["content-type"] || "";
          const boundary = contentType.split("boundary=")[1];
          if (!boundary) { res.statusCode = 400; res.end(); return; }

          const parts = body.toString("binary").split(`--${boundary}`);
          const filePart = parts.find(p => p.includes("filename="));
          if (!filePart) { res.statusCode = 400; res.end(); return; }

          const fileContent = filePart.split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n--$/, "");
          const fileBuffer = Buffer.from(fileContent, "binary");

          const form = new FormData();
          form.append("file", fileBuffer, { filename: "voters.csv", contentType: "text/csv" });

          const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
              pinata_api_key: PINATA_KEY,
              pinata_secret_api_key: PINATA_SECRET,
              ...form.getHeaders(),
            },
            body: form.getBuffer(),
          });

          const json = await response.json() as { IpfsHash: string };
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ cid: json.IpfsHash }));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Upload failed" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ipfsUploadPlugin()],
});
