import 'money.dart';
import 'palette.dart';
import 'result.dart';

/// Mirrors src/domain/wallet-rules.ts.
const walletIcons = ['bank', 'cash', 'ewallet', 'savings'];

typedef WalletInput = ({String name, int openingBalance, String color, String icon});

Result<WalletInput> validateWalletInput(WalletInput input) {
  DomainError invalid(String field, String message) => DomainError('INVALID_WALLET', message, field: field);
  final name = input.name.trim();
  if (name.isEmpty) return Err(invalid('name', 'Give the wallet a name.'));
  if (name.length > 40) return Err(invalid('name', 'Keep the name to 40 characters or fewer.'));
  // May be negative: a Saldo is allowed below zero (PRD 3.3 rule 3).
  if (input.openingBalance.abs() > maxSafeInteger) {
    return Err(invalid('openingBalance', 'The opening balance is a whole rupiah amount.'));
  }
  if (!isColor(input.color)) return Err(invalid('color', 'Pick one of the colors.'));
  if (!walletIcons.contains(input.icon)) return Err(invalid('icon', 'Pick one of the icons.'));
  return Ok((name: name, openingBalance: input.openingBalance, color: input.color, icon: input.icon));
}

/// PRD 3.3 rule 4: a Dompet is archived only at exactly Rp 0.
Result<void> checkArchive({required String name, required int balance}) {
  if (balance == 0) return const Ok(null);
  final position = balance > 0 ? 'still holds ${formatRupiah(balance)}' : 'is at ${formatRupiah(balance)}';
  return Err(DomainError('WALLET_NOT_EMPTY',
      '$name $position. A wallet can be archived only when its balance is exactly Rp 0.'));
}

/// PRD 3.3 rule 6: a Dompet with Transaksi is archived, never deleted.
Result<void> checkDelete({required int transactionCount}) => transactionCount == 0
    ? const Ok(null)
    : const Err(DomainError('WALLET_IN_USE', "This wallet has transactions, so it can't be deleted. Archive it instead."));

/// An archived Dompet is unarchived before any edit (PRD 3.3 rule 4).
Result<void> checkEdit({required String name, required bool archived}) =>
    archived ? Err(DomainError('WALLET_ARCHIVED', '$name is archived. Unarchive it to make changes.')) : const Ok(null);
