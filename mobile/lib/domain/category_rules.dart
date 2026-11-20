import 'palette.dart';
import 'result.dart';
import 'types.dart';

/// Mirrors src/domain/category-rules.ts.
const categoryIcons = [
  'briefcase', 'hand-coins', 'laptop', 'store', 'trending-up', 'gift', 'coins', 'piggy-bank', 'wallet', //
  'utensils', 'coffee', 'shopping-bag', 'shopping-cart', 'bus', 'car', 'fuel', 'plane',
  'house', 'zap', 'wifi', 'smartphone', 'receipt', 'landmark',
  'graduation-cap', 'book-open', 'heart-pulse', 'pill', 'scissors', 'shirt', 'baby', 'dog',
  'clapperboard', 'gamepad-2', 'music', 'dumbbell', 'heart', 'wrench', 'ellipsis',
];

const maxCategoryName = 30;

class ExistingCategory {
  const ExistingCategory({required this.id, required this.name, required this.type, required this.archived});
  final String id;
  final String name;
  final CategoryType type;
  final bool archived;
}

typedef CategoryInput = ({String name, String icon, String color});

String _clean(String name) => name.trim().replaceAll(RegExp(r'\s+'), ' ');

/// Case-insensitive, accent-sensitive, like localeCompare(..., { sensitivity: "accent" }).
bool _sameName(String a, String b) => a.toLowerCase() == b.toLowerCase();

/// The Kategori of this type already called `name` (case and spacing aside), other than `selfId`.
ExistingCategory? findNameClash(String name, CategoryType type, List<ExistingCategory> existing, [String? selfId]) {
  final clean = _clean(name);
  for (final c in existing) {
    if (c.id != selfId && c.type == type && _sameName(c.name, clean)) return c;
  }
  return null;
}

/// PRD 3.6: a name of 1–30 characters, unique within its type regardless of case, archived ones included.
Result<CategoryInput> validateCategoryInput(CategoryInput input, CategoryType type, List<ExistingCategory> existing,
    [String? selfId]) {
  DomainError invalid(String field, String key, {Map<String, Object?>? params, String code = 'INVALID_CATEGORY'}) =>
      DomainError(code, key, params: params, field: field);
  final name = _clean(input.name);
  if (name.isEmpty) return Err(invalid('name', 'error.category.nameMissing'));
  if (name.length > maxCategoryName) return Err(invalid('name', 'error.name.tooLong', params: {'max': maxCategoryName}));
  final clash = findNameClash(name, type, existing, selfId);
  if (clash != null) {
    final kind = type == CategoryType.income ? 'Income' : 'Expense';
    return Err(invalid('name', clash.archived ? 'error.category.takenArchived$kind' : 'error.category.taken$kind',
        params: {'name': clash.name}, code: 'CATEGORY_NAME_TAKEN'));
  }
  if (!isColor(input.color)) return Err(invalid('color', 'error.color'));
  if (!categoryIcons.contains(input.icon)) return Err(invalid('icon', 'error.icon'));
  return Ok((name: name, icon: input.icon, color: input.color));
}

/// PRD 3.6: the last active Kategori of a type can't be archived or deleted.
Result<void> checkLeavesOneActive({required CategoryType type, required bool archived, required int activeOfSameType}) {
  if (archived || activeOfSameType > 1) return const Ok(null);
  return Err(DomainError('LAST_ACTIVE_CATEGORY',
      type == CategoryType.income ? 'error.category.lastActiveIncome' : 'error.category.lastActiveExpense'));
}

/// PRD 3.6: a Kategori any Transaksi uses is archived instead.
Result<void> checkCategoryDelete({required int transactionCount}) => transactionCount == 0
    ? const Ok(null)
    : const Err(DomainError('CATEGORY_IN_USE', 'error.category.inUse'));
