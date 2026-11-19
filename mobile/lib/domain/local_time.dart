import 'package:timezone/timezone.dart' as tz;

/// Mirrors src/domain/local-time.ts. Call `initializeTimeZones()` once before use.

final _date = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');
final _time = RegExp(r'^(\d{2}):(\d{2})$');

String _pad(int n) => n.toString().padLeft(2, '0');

/// A wall-clock date ("2026-11-14") and time ("15:42") in `timeZone`, as one instant (UTC).
/// Null when malformed or the date doesn't exist (31 February).
DateTime? localToInstant(String date, String time, String timeZone) {
  final d = _date.firstMatch(date);
  final t = _time.firstMatch(time);
  if (d == null || t == null) return null;
  final y = int.parse(d[1]!), mo = int.parse(d[2]!), da = int.parse(d[3]!);
  final h = int.parse(t[1]!), mi = int.parse(t[2]!);
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return null;
  final instant = tz.TZDateTime(tz.getLocation(timeZone), y, mo, da, h, mi).toUtc();
  return instantToLocal(instant, timeZone).date == date ? instant : null;
}

/// The date and time a person in `timeZone` sees for an instant.
({String date, String time}) instantToLocal(DateTime instant, String timeZone) {
  final z = tz.TZDateTime.from(instant, tz.getLocation(timeZone));
  return (date: '${z.year}-${_pad(z.month)}-${_pad(z.day)}', time: '${_pad(z.hour)}:${_pad(z.minute)}');
}

/// Whole local days `from`..`to` inclusive, as [start, endExclusive) instants.
({DateTime start, DateTime endExclusive}) localDayRange(String from, String to, String timeZone) {
  final start = localToInstant(from, '00:00', timeZone)!;
  final last = tz.TZDateTime.from(localToInstant(to, '00:00', timeZone)!, tz.getLocation(timeZone));
  final next = tz.TZDateTime(last.location, last.year, last.month, last.day + 1);
  return (start: start, endExclusive: next.toUtc());
}
