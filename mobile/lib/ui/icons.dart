import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// The same Lucide icons the web uses (src/components/icons.tsx).
const categoryIconData = <String, IconData>{
  'briefcase': LucideIcons.briefcase, 'hand-coins': LucideIcons.handCoins, 'laptop': LucideIcons.laptop,
  'store': LucideIcons.store, 'trending-up': LucideIcons.trendingUp, 'gift': LucideIcons.gift, 'coins': LucideIcons.coins,
  'piggy-bank': LucideIcons.piggyBank, 'wallet': LucideIcons.wallet, 'utensils': LucideIcons.utensils,
  'coffee': LucideIcons.coffee, 'shopping-bag': LucideIcons.shoppingBag, 'shopping-cart': LucideIcons.shoppingCart,
  'bus': LucideIcons.bus, 'car': LucideIcons.car, 'fuel': LucideIcons.fuel, 'plane': LucideIcons.plane,
  'house': LucideIcons.house, 'zap': LucideIcons.zap, 'wifi': LucideIcons.wifi, 'smartphone': LucideIcons.smartphone,
  'receipt': LucideIcons.receipt, 'landmark': LucideIcons.landmark, 'graduation-cap': LucideIcons.graduationCap,
  'book-open': LucideIcons.bookOpen, 'heart-pulse': LucideIcons.heartPulse, 'pill': LucideIcons.pill,
  'scissors': LucideIcons.scissors, 'shirt': LucideIcons.shirt, 'baby': LucideIcons.baby, 'dog': LucideIcons.dog,
  'clapperboard': LucideIcons.clapperboard, 'gamepad-2': LucideIcons.gamepad2, 'music': LucideIcons.music,
  'dumbbell': LucideIcons.dumbbell, 'heart': LucideIcons.heart, 'wrench': LucideIcons.wrench, 'ellipsis': LucideIcons.ellipsis,
};

const walletIconData = <String, (IconData, String)>{
  'bank': (LucideIcons.landmark, 'Bank'),
  'cash': (LucideIcons.banknote, 'Cash'),
  'ewallet': (LucideIcons.smartphone, 'E-wallet'),
  'savings': (LucideIcons.piggyBank, 'Savings'),
};

IconData categoryIcon(String? name) => categoryIconData[name] ?? LucideIcons.arrowLeftRight;
IconData walletIcon(String name) => (walletIconData[name] ?? walletIconData['bank']!).$1;
