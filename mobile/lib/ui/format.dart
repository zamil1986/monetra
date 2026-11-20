import '../domain/i18n.dart';
import '../domain/local_time.dart';

/// Dates as the web shows them, always in the profile time zone (PRD 3.2). Day and month names
/// come from the shared catalog, so they match the web in either Bahasa (src/lib/dates.ts).
DateTime _date(String ymd) => DateTime.utc(int.parse(ymd.substring(0, 4)), int.parse(ymd.substring(5, 7)), int.parse(ymd.substring(8, 10)));

/// "Thu" / "Kam"
String weekday(String ymd, Strings t) => t('date.wd.${_date(ymd).weekday % 7}');
/// "19 Nov" / "17 Agu"
String dayMonth(String ymd, Strings t) => '${_date(ymd).day} ${t('date.mon.${_date(ymd).month}')}';
/// "November" / "Agustus"
String monthLong(String ymd, Strings t) => t('date.month.${_date(ymd).month}');

/// "Wed 18 Nov 20:41"
String whenShort(DateTime instant, String timeZone, Strings t) {
  final l = instantToLocal(instant, timeZone);
  return '${weekday(l.date, t)} ${dayMonth(l.date, t)} ${l.time}';
}

String rangeLabel(String from, String to, Strings t) =>
    from == to ? '${weekday(from, t)} ${dayMonth(from, t)}' : '${dayMonth(from, t)} – ${dayMonth(to, t)}';
