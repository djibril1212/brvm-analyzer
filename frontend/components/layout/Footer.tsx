export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          <strong className="text-foreground">Avertissement :</strong> Les
          informations présentées sur ce site sont fournies à titre purement
          informatif. Elles ne constituent pas un conseil en investissement, une
          recommandation d&apos;achat ou de vente de valeurs mobilières. Les
          données proviennent du Bulletin Officiel de la Cote (BOC) publié
          quotidiennement par la BRVM. Les analyses générées par intelligence
          artificielle peuvent comporter des inexactitudes.
        </p>
        <p className="text-xs text-muted-foreground">
          Source officielle :{" "}
          <a
            href="https://www.brvm.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            www.brvm.org
          </a>{" "}
          · Données sous licence BRVM · © {new Date().getFullYear()} BRVM
          Analyzer
        </p>
      </div>
    </footer>
  );
}
