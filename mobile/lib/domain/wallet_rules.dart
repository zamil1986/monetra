import 'money.dart';
import 'palette.dart';
import 'result.dart';

/// Mirrors src/domain/wallet-rules.ts.
const walletIcons = ['bank', 'cash', 'ewallet', 'savings'];

typedef WalletInput = ({String name, int openingBalance, String color, String icon});

Result<WalletInput> validateWalletInput(WalletInput input) {
  DomainError invalid(String field, String key, [Map<String, Object?>? params]) =>
      DomainError('INVALID_WALLET', key, params: params, field: field);
  final name = input.name.trim();
  if (name.isEmpty) return Err(invalid('name', 'error.wallet.nameMissing'));
  if (name.length > 40) return Err(invalid('name', 'error.name.tooLong', {'max': 40}));
  // May be negative: a Saldo is allowed below zero (PRD 3.3 rule 3).
  if (input.openingBalance.abs() > maxSafeInteger) {
    return Err(invalid('openingBalance', 'error.wallet.openingWhole'));
  }
  if (!isColor(input.color)) return Err(invalid('color', 'error.color'));
  if (!walletIcons.contains(input.icon)) return Err(invalid('icon', 'error.icon'));
  return Ok((name: name, openingBalance: input.openingBalance, color: input.color, icon: input.icon));
}

/// PRD 3.3 rule 4: a Dompet is archived only at exactly Rp 0.
Result<void> checkArchive({required String name, required int balance}) {
  if (balance == 0) return const Ok(null);
  return Err(DomainError('WALLET_NOT_EMPTY', balance > 0 ? 'error.wallet.notEmpty.holds' : 'error.wallet.notEmpty.below',
      params: {'name': name, 'amount': formatRupiah(balance)}));
}

/// PRD 3.3 rule 6: a Dompet with Transaksi is archived, never deleted.
Result<void> checkDelete({required int transactionCount}) => transactionCount == 0
    ? const Ok(null)
    : const Err(DomainError('WALLET_IN_USE', 'error.wallet.inUse'));

/// An archived Dompet is unarchived before any edit (PRD 3.3 rule 4).
Result<void> checkEdit({required String name, required bool archived}) =>
    archived ? Err(DomainError('WALLET_ARCHIVED', 'error.wallet.archivedEdit', params: {'name': name})) : const Ok(null);
