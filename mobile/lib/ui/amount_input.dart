import 'package:flutter/services.dart';
import '../domain/money.dart';

final _nonDigit = RegExp(r'\D');
final _leadingZeros = RegExp(r'^0+(?=\d)');

/// Lets only what [keepAmountTyping] keeps into an amount field, whether typed or pasted.
///
/// With [group], the digits are regrouped in threes on every edit ("27272" → "27.272"), so the
/// dots always sit where id-ID puts them however the person types, deletes or pastes.
class AmountInputFormatter extends TextInputFormatter {
  const AmountInputFormatter({this.allowMinus = false, this.group = false});
  final bool allowMinus;
  final bool group;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    if (group) return _regroup(oldValue, newValue);
    final text = keepAmountTyping(newValue.text, allowMinus: allowMinus);
    if (text == newValue.text) return newValue;
    final caret = _caret(newValue);
    final offset = keepAmountTyping(newValue.text.substring(0, caret), allowMinus: allowMinus).length;
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: offset.clamp(0, text.length)));
  }

  TextEditingValue _regroup(TextEditingValue oldValue, TextEditingValue newValue) {
    var edited = newValue;
    // Backspace over a dot would only bring the dot back, so it takes the digit before it instead.
    final i = newValue.selection.isCollapsed ? newValue.selection.end : -1;
    if (i > 0 &&
        oldValue.text.length == newValue.text.length + 1 &&
        oldValue.text[i] == '.' &&
        oldValue.text.substring(0, i) + oldValue.text.substring(i + 1) == newValue.text) {
      edited = TextEditingValue(
          text: newValue.text.substring(0, i - 1) + newValue.text.substring(i),
          selection: TextSelection.collapsed(offset: i - 1));
    }

    final caret = _caret(edited);
    final kept = keepAmountTyping(edited.text, allowMinus: allowMinus);
    final minus = kept.startsWith('-') ? '-' : '';
    final allDigits = kept.replaceAll(_nonDigit, '');
    final digits = allDigits.replaceFirst(_leadingZeros, '');
    final zeros = allDigits.length - digits.length;
    final before = (edited.text.substring(0, caret).replaceAll(_nonDigit, '').length - zeros).clamp(0, digits.length);

    final text = minus + _groupString(digits);
    var offset = minus.length;
    for (var seen = 0; seen < before && offset < text.length; offset++) {
      if (text[offset] != '.') seen++;
    }
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: offset));
  }

  static int _caret(TextEditingValue v) =>
      v.selection.isValid ? v.selection.end.clamp(0, v.text.length) : v.text.length;
}

/// [groupDigits] for a digit string of any length, so a pasted huge number cannot overflow.
String _groupString(String digits) {
  final out = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write('.');
    out.write(digits[i]);
  }
  return out.toString();
}
