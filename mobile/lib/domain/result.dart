/// A business-rule refusal the UI can show as-is. `field` points at the form input to blame.
/// Mirrors src/domain/errors.ts.
class DomainError {
  const DomainError(this.code, this.message, {this.field});
  final String code;
  final String message;
  final String? field;

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
