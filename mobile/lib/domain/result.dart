import 'i18n.dart';

/// A business-rule refusal the UI can show. `field` points at the form input to blame.
/// `key` and `params` name the text in the shared catalog, so it shows in the Pengguna's Bahasa.
/// Mirrors src/domain/errors.ts.
class DomainError {
  const DomainError(this.code, this.key, {this.params, this.field});
  final String code;
  final String key;
  final Map<String, Object?>? params;
  final String? field;

  /// English, for logs and tests.
  String get message => translate('en', key, params);

  /// The refusal in the Bahasa of [t].
  String text(Strings t) => t(key, params);

  @override
  String toString() => 'DomainError($code: $message)';
}

/// Either a value or a [DomainError]. Mirrors src/domain/result.ts.
sealed class Result<T> {
  const Result();
  bool get ok => this is Ok<T>;
}

class Ok<T> extends Result<T> {
  const Ok(this.value);
  final T value;
}

class Err<T> extends Result<T> {
  const Err(this.error);
  final DomainError error;
}
