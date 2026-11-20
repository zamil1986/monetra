import 'result.dart';

/// Mirrors src/domain/money.ts. Rupiah only, whole numbers (ADR 0002).

final _plainDigits = RegExp(r'^\d+$');
final _grouped = RegExp(r'^\d{1,3}(\.\d{3})+$');
final _sign = RegExp(r'^[-−]\s*');
final _rp = RegExp(r'^rp\s*', caseSensitive: false);

/// JavaScript's Number.MAX_SAFE_INTEGER, so both sides refuse the same amounts.
const maxSafeInteger = 9007199254740991;

/// Reads what a person typed into an amount field as whole rupiah.
Result<int> parseRupiah(String input) {
  var text = input.trim();
  var negative = false;
  for (var i = 0; i < 2; i++) {
    final sign = _sign.firstMatch(text);
    if (sign != null && !negative) {
      negative = true;
      text = text.substring(sign.end);
    }
    text = text.replaceFirst(_rp, '');
  }
  if (!_plainDigits.hasMatch(text) && !_grouped.hasMatch(text)) {
    return const Err(DomainError('INVALID_AMOUNT', 'error.amount.example'));
  }
  final digits = text.replaceAll('.', '');
  final value = BigInt.parse(digits);
  if (value > BigInt.from(maxSafeInteger)) {
    return const Err(DomainError('INVALID_AMOUNT', 'error.amount.tooLarge'));
  }
  final n = value.toInt();
  return Ok(negative && n != 0 ? -n : n);
}

/// Groups digits in threes with dots, as id-ID does: 6240000 → "6.240.000".
String groupDigits(int value) {
  final s = value.abs().toString();
  final out = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) out.write('.');
    out.write(s[i]);
  }
  return out.toString();
}

final _leadingMinus = RegExp(r'^\D*[-−]');
final _notAmountChar = RegExp(r'[^\d.]');

/// What an amount field keeps as it is typed or pasted: digits and the "." thousand separator,
/// plus one leading minus when the field allows negatives. Everything else is dropped.
String keepAmountTyping(String input, {bool allowMinus = false}) {
  final minus = allowMinus && _leadingMinus.hasMatch(input) ? '-' : '';
  return minus + input.replaceAll(_notAmountChar, '');
}

/// "Rp 6.240.000", "−Rp 15.000"
String formatRupiah(int value) => value < 0 ? '−Rp ${groupDigits(value)}' : 'Rp ${groupDigits(value)}';
