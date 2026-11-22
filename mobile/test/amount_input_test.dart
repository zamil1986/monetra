import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:monetra/ui/amount_input.dart';

TextEditingValue at(String text, [int? caret]) =>
    TextEditingValue(text: text, selection: TextSelection.collapsed(offset: caret ?? text.length));

/// Types [keys] one at a time at the end of the field, as a phone keyboard does.
TextEditingValue typeAll(AmountInputFormatter f, String keys) {
  var value = at('');
  for (final k in keys.split('')) {
    value = f.formatEditUpdate(value, at(value.text + k));
  }
  return value;
}

void main() {
  const grouping = AmountInputFormatter(group: true);

  test('groups digits in threes as they are typed', () {
    expect(typeAll(grouping, '27272').text, '27.272');
    expect(typeAll(grouping, '1234567').text, '1.234.567');
    expect(typeAll(grouping, '1234567').selection.end, '1.234.567'.length);
  });

  test('drops leading zeros and anything that is not a digit', () {
    expect(typeAll(grouping, '0050a0').text, '500');
    expect(typeAll(grouping, '0').text, '0');
  });

  test('backspace right after a dot removes the digit before it', () {
    final out = grouping.formatEditUpdate(at('27.272', 3), at('27272', 2));
    expect(out.text, '2.272');
    expect(out.selection.end, 1);
  });

  test('typing in the middle keeps the caret after the new digit', () {
    final out = grouping.formatEditUpdate(at('1.000', 1), at('19.000', 2));
    expect(out.text, '19.000');
    expect(out.selection.end, 2);
  });

  test('without grouping, only digits and dots are kept', () {
    expect(typeAll(const AmountInputFormatter(), '2.7272x').text, '2.7272');
  });
}
