import '../domain/local_time.dart';

/// Dates as the web shows them (en-GB), always in the profile time zone (PRD 3.2).
const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

DateTime _date(String ymd) => DateTime.utc(int.parse(ymd.substring(0, 4)), int.parse(ymd.substring(5, 7)), int.parse(ymd.substring(8, 10)));

String weekday(String ymd) => _weekdays[_date(ymd).weekday - 1];
String dayMonth(String ymd) => '${_date(ymd).day} ${_months[_date(ymd).month - 1]}';
String monthLong(String ymd) => _monthsLong[_date(ymd).month - 1];

/// "Wed 18 Nov 20:41"
String whenShort(DateTime instant, String timeZone) {
  final l = instantToLocal(instant, timeZone);
  return '${weekday(l.date)} ${dayMonth(l.date)} ${l.time}';
}

String rangeLabel(String from, String to) => from == to ? '${weekday(from)} ${dayMonth(from)}' : '${dayMonth(from)} – ${dayMonth(to)}';
