import 'package:flutter/services.dart';
import '../domain/money.dart';

/// Lets only what [keepAmountTyping] keeps into an amount field, whether typed or pasted.
class AmountInputFormatter extends TextInputFormatter {
  const AmountInputFormatter({this.allowMinus = false});
  final bool allowMinus;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = keepAmountTyping(newValue.text, allowMinus: allowMinus);
    if (text == newValue.text) return newValue;
    final caret = newValue.selection.isValid ? newValue.selection.end.clamp(0, newValue.text.length) : newValue.text.length;
    final offset = keepAmountTyping(newValue.text.substring(0, caret), allowMinus: allowMinus).length;
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: offset.clamp(0, text.length)));
  }
}
