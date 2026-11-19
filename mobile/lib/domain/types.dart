/// Mirrors src/domain/types.ts.
enum TransactionType { income, expense, transfer }

enum CategoryType { income, expense }

TransactionType transactionTypeFrom(String s) => TransactionType.values.byName(s.toLowerCase());
CategoryType categoryTypeFrom(String s) => CategoryType.values.byName(s.toLowerCase());
String wire(Enum e) => e.name.toUpperCase();

/// The part of a Transaksi that moves money. Amounts are whole rupiah (ADR 0002).
class Movement {
  const Movement({required this.type, required this.amount, required this.walletId, this.toWalletId});
  final TransactionType type;
  final int amount;
  final String walletId;
  final String? toWalletId;
}

class WalletState {
  const WalletState({required this.id, required this.openingBalance, required this.archived});
  final String id;
  final int openingBalance;
  final bool archived;
}
