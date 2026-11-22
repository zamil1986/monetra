import 'package:flutter/services.dart';
import '../domain/money.dart';

/// Lets only what [keepAmountTyping] keeps into an amount field, whether typed or pasted.
///
/// With [group], the digits are regrouped in threes on every edit ("27272" → "27.272") by
/// [regroupAmountTyping], the same rule the web form uses, so the dots always sit where id-ID puts them.
class AmountInputFormatter extends TextInputFormatter {
  const AmountInputFormatter({this.allowMinus = false, this.group = false});
  final bool allowMinus;
  final bool group;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final caret = _caret(newValue);
    if (group) {
      final r = regroupAmountTyping(oldValue.text, newValue.text, caret, allowMinus: allowMinus);
      return TextEditingValue(text: r.text, selection: TextSelection.collapsed(offset: r.caret));
    }
    final text = keepAmountTyping(newValue.text, allowMinus: allowMinus);
    if (text == newValue.text) return newValue;
    final offset = keepAmountTyping(newValue.text.substring(0, caret), allowMinus: allowMinus).length;
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: offset.clamp(0, text.length)));
  }

  static int _caret(TextEditingValue v) =>
      v.selection.isValid ? v.selection.end.clamp(0, v.text.length) : v.text.length;
}
