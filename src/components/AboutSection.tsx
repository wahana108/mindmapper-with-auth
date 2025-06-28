import { Info } from "lucide-react";

export default function AboutSection() {
  return (
    <section className="w-full max-w-2xl mx-auto mb-8 p-4 bg-muted/30 rounded-lg border text-muted-foreground">
      <div className="flex items-center mb-2">
        <Info className="w-5 h-5 mr-2 text-primary" />
        <h2 className="text-lg font-semibold">About MindMapper Lite</h2>
      </div>
      <p className="mb-2">
        <strong>MindMapper Lite</strong> adalah aplikasi mindmap sederhana yang
        masih dalam tahap pengembangan. Anda dapat membuat log/catatan pribadi,
        menghubungkan antar catatan, dan berbagi solusi yang saling bertautan.
      </p>
      <p className="mb-2">
        Website ini dirancang untuk berbagi pengetahuan dan ide secara
        terstruktur. <strong>Jangan menyimpan password atau informasi sensitif</strong>
        pada log privat maupun publik, karena fitur keamanan masih dalam
        pengembangan.
      </p>
      <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        <strong>Comment Policy:</strong> Mohon berkomentar dengan sopan, hindari
        spam, dan hormati pengguna lain. Semua catatan dan komentar harus sesuai
        etika dan tidak mengandung konten sensitif.
      </div>
    </section>
  );
}