import 'types.dart';

/// Saldo per Dompet: Saldo awal plus everything in, minus everything out.
/// Mirrors src/domain/balance.ts.
Map<String, int> balancesByWallet(List<WalletState> wallets, Iterable<Movement> movements) {
  final balances = {for (final w in wallets) w.id: w.openingBalance};
  void add(String walletId, int delta) {
    final current = balances[walletId];
    if (current != null) balances[walletId] = current + delta;
  }

  for (final m in movements) {
    switch (m.type) {
      case TransactionType.income:
        add(m.walletId, m.amount);
      case TransactionType.expense:
        add(m.walletId, -m.amount);
      case TransactionType.transfer:
        add(m.walletId, -m.amount);
        if (m.toWalletId != null) add(m.toWalletId!, m.amount);
    }
  }
  return balances;
}

/// Sum of the Saldo of every active Dompet.
int totalBalance(List<WalletState> wallets, Iterable<Movement> movements) {
  final balances = balancesByWallet(wallets, movements);
  return wallets.where((w) => !w.archived).fold(0, (sum, w) => sum + (balances[w.id] ?? 0));
}
