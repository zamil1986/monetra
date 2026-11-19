/// The one set of hues a Dompet or Kategori can wear. Mirrors src/domain/palette.ts.
const colors = ['green', 'blue', 'teal', 'olive', 'orange', 'violet', 'magenta', 'slate', 'brown'];

bool isColor(String value) => colors.contains(value);
